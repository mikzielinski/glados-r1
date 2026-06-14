import { createServer } from "node:http";
import { mkdtemp, writeFile, utimes } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { SkillRegistry } from "../src/skills.js";
import type { Config } from "../src/config.js";

// Mock n8n: echoes the request so we can assert the skill plumbing works.
const received: Array<{ method: string; url: string; body: string }> = [];
const server = createServer((req, res) => {
  let body = "";
  req.on("data", (c) => (body += c));
  req.on("end", () => {
    received.push({ method: req.method ?? "", url: req.url ?? "", body });
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ ok: true, echoedBody: body, path: req.url }));
  });
});

function baseConfig(skillsFile: string, n8nBaseUrl: string): Config {
  return {
    cursorApiKey: "", cursorModel: "composer-2.5", repoPath: process.cwd(),
    brainMode: "echo", host: "127.0.0.1", port: 0,
    whisperBin: "", whisperModel: "", whisperLang: "auto",
    whisperPrompt: "", whisperThreads: 4, whisperNoSpeechThold: 0.45,
    piperBin: "", piperModel: "", piperSampleRate: 22050, ttsFallback: "",
    inputSampleRate: 16000, logLevel: "warn",
    skillsFile, n8nBaseUrl, n8nAuthHeader: "X-Secret: test123",
  };
}

async function main() {
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  const addr = server.address();
  const port = typeof addr === "object" && addr ? addr.port : 0;
  const base = `http://127.0.0.1:${port}`;

  const dir = await mkdtemp(join(tmpdir(), "glados-skills-"));
  const skillsFile = join(dir, "skills.json");
  await writeFile(
    skillsFile,
    JSON.stringify({
      skills: [
        { name: "lights", description: "toggle lights", webhook: "webhook/lights", method: "POST" },
        { name: "calendar", description: "today", webhook: "webhook/cal", method: "GET" },
        { name: "bad name!", description: "invalid", webhook: "x" },
      ],
    }),
  );

  const cfg = baseConfig(skillsFile, base);
  const reg = new SkillRegistry(cfg);

  let failures = 0;
  const check = (cond: boolean, label: string) => {
    console.log(`${cond ? "PASS" : "FAIL"}  ${label}`);
    if (!cond) failures++;
  };

  let tools = await reg.getCustomTools();
  check(Object.keys(tools).sort().join(",") === "calendar,lights", "valid skills loaded, invalid skipped");

  const lightsRes = await tools.lights!.execute({ state: "on" }, {});
  check(received.some((r) => r.method === "POST" && r.url === "/webhook/lights" && r.body.includes("\"state\":\"on\"")), "POST skill sends JSON body to n8n");
  check(typeof lightsRes === "string" && lightsRes.includes("echoedBody"), "skill returns n8n response to agent");

  await tools.calendar!.execute({ day: "today" }, {});
  check(received.some((r) => r.method === "GET" && r.url.startsWith("/webhook/cal?day=today")), "GET skill puts args in query string");

  // Hot reload: add a skill, bump mtime, re-read.
  await writeFile(
    skillsFile,
    JSON.stringify({ skills: [{ name: "lights", description: "x", webhook: "webhook/lights" }, { name: "newskill", description: "y", webhook: "webhook/new" }] }),
  );
  const future = new Date(Date.now() + 2000);
  await utimes(skillsFile, future, future);
  tools = await reg.getCustomTools();
  check(Object.keys(tools).sort().join(",") === "lights,newskill", "hot-reload picks up new skill without restart");

  console.log(`\n${failures === 0 ? "ALL PASS" : `${failures} FAILURE(S)`}`);
  server.close();
  process.exit(failures === 0 ? 0 : 1);
}

main();
