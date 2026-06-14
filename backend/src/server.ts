import { createServer, type IncomingMessage, type Server } from "node:http";
import { randomUUID } from "node:crypto";
import { WebSocketServer, type WebSocket } from "ws";
import type { Config } from "./config.js";
import { logger } from "./logger.js";
import { SessionManager } from "./session-manager.js";
import { SkillRegistry } from "./skills.js";
import { StandardsRegistry } from "./standards.js";
import { WhisperStt } from "./stt.js";
import { GladosTts } from "./tts.js";
import { IntegrationsStore } from "./integrations-store.js";
import { SetupRoutes, cleanupOAuthStates } from "./setup-routes.js";

const log = logger("server");

/** Client sends app-level ping; avoid server ws.ping during TTS bursts on flaky WiFi. */
function attachHeartbeat(ws: WebSocket): () => void {
  ws.on("ping", () => { /* auto-pong */ });
  return () => { /* client activity */ };
}

export function startServer(cfg: Config): Server {
  const stt = new WhisperStt(cfg);
  const tts = new GladosTts(cfg);
  const skills = new SkillRegistry(cfg);
  const standards = new StandardsRegistry(cfg);
  void standards.refreshIfStale(0);
  void skills.getCustomTools();
  const integrations = new IntegrationsStore(cfg.integrationsFile);
  void integrations.load();
  const setup = new SetupRoutes(cfg, integrations);
  setInterval(cleanupOAuthStates, 60_000).unref();
  const sessions = new SessionManager(cfg, stt, tts, skills, standards);

  const http = createServer(async (req, res) => {
    const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);

    if (await setup.handle(req, res, url)) return;

    if (url.pathname === "/health" || url.pathname === "/") {
      await integrations.load();
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({
        ok: true,
        service: "glados-r1-backend",
        repo: cfg.repoPath,
        brainMode: cfg.brainMode,
        standards: standards.count,
        skills: skills.getNames(),
        integrations: integrations.status(),
        setupUrl: `${cfg.setupBaseUrl.replace(/\/$/, "")}/setup`,
      }));
      return;
    }
    res.writeHead(404);
    res.end();
  });

  const wss = new WebSocketServer({
    server: http,
    path: "/ws",
    maxPayload: 8 * 1024 * 1024,
    clientTracking: true,
  });

  wss.on("connection", (ws: WebSocket, req: IncomingMessage) => {
    const url = new URL(req.url ?? "/ws", "http://localhost");
    const sessionId = url.searchParams.get("sessionId") ?? randomUUID();
    const resumeAgentId = url.searchParams.get("agentId") ?? undefined;

    log.info(`connection ${sessionId} from ${req.socket.remoteAddress}`);
    const touchActive = attachHeartbeat(ws);
    const session = sessions.attach(sessionId, ws, resumeAgentId);

    ws.on("message", (data: Buffer | ArrayBuffer | Buffer[], isBinary: boolean) => {
      touchActive();
      if (isBinary) {
        const buf = Array.isArray(data) ? Buffer.concat(data) : Buffer.from(data as ArrayBuffer);
        session.handleBinary(buf);
      } else {
        session.handleText(data.toString());
      }
    });

    ws.on("close", (code, reason) => {
      log.info(`connection ${sessionId} closed code=${code} reason=${reason.toString() || "none"}`);
      sessions.detach(sessionId);
    });

    ws.on("error", (err) => log.error(`connection ${sessionId} error`, err));
  });

  http.listen(cfg.port, cfg.host, () => {
    log.info(`listening on ws://${cfg.host}:${cfg.port}/ws  (health: http://${cfg.host}:${cfg.port}/health)`);
    log.info(`setup wizard: ${cfg.setupBaseUrl.replace(/\/$/, "")}/setup`);
    log.info(`agent repo: ${cfg.repoPath}`);
  });

  http.keepAliveTimeout = 0;
  http.headersTimeout = 0;

  return http;
}
