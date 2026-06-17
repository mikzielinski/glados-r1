import type { AgentSkinId } from "./agent-skins.js";
import type { KnowledgeIndex, RagStatus } from "./knowledge-index.js";

const REINDEX_PATTERNS = [
  "indeksuj wiedzę",
  "indeksuj wiedze",
  "wymuś indeksowanie",
  "wymus indeksowanie",
  "przeindeksuj",
  "reindex",
  "odśwież indeks",
  "odswiez indeks",
];

const STATUS_PATTERNS = [
  "status rag",
  "status indeksu",
  "czy wiedza jest w rag",
  "czy wiedza jest dostępna",
  "czy indeks jest gotowy",
  "stan indeksu",
  "rag gotowy",
];

export function isRagReindexQuery(transcript: string): boolean {
  const t = transcript.toLowerCase();
  return REINDEX_PATTERNS.some((p) => t.includes(p));
}

export function isRagStatusQuery(transcript: string): boolean {
  const t = transcript.toLowerCase();
  return STATUS_PATTERNS.some((p) => t.includes(p));
}

export async function ragStatusReply(
  rag: KnowledgeIndex,
  skin: AgentSkinId,
): Promise<string> {
  const s = rag.getStatus();
  return formatRagStatus(s, skin);
}

export function formatRagStatus(status: RagStatus, skin: AgentSkinId = "hal9000"): string {
  const when = status.lastIndexedAt
    ? new Date(status.lastIndexedAt).toLocaleString("pl-PL")
    : "nigdy";

  if (status.status === "indexing") {
    return skin === "tars"
      ? "Indeks RAG się buduje. Poczekaj chwilę."
      : "Trwa indeksowanie wiedzy w RAG — zaraz będzie gotowe.";
  }

  if (status.status === "error") {
    return skin === "glados"
      ? `Indeks RAG się wyłożył: ${status.lastError ?? "nieznany błąd"}. Spróbuj wymusić indeksowanie w panelu.`
      : `Błąd indeksu RAG: ${status.lastError ?? "nieznany"}. W panelu /setup wymuś ponowne indeksowanie.`;
  }

  if (status.status === "empty") {
    return skin === "tars"
      ? "Indeks RAG jest pusty. Dodaj pamięć, standardy PDF albo szablony, potem wymuś indeksowanie."
      : "Brak wiedzy w indeksie RAG. Dodaj notatki, PDF-y lub szablony w panelu administracyjnym.";
  }

  if (status.status === "stale") {
    return skin === "hal9000"
      ? `Indeks RAG nieaktualny — ${status.staleSources} źródeł wymaga przeindeksowania. Ostatnio: ${when}.`
      : `RAG nieaktualny (${status.staleSources} źródeł). Wymuś indeksowanie w /setup. Ostatnio: ${when}.`;
  }

  const embed = status.embeddings ? " z embeddingami Ollama" : " (wyszukiwanie słowne)";
  return skin === "glados"
    ? `Tak — wiedza jest w RAG: ${status.chunkCount} fragmentów z ${status.sourceCount} źródeł${embed}. Ostatnio: ${when}.`
    : skin === "tars"
      ? `RAG gotowy. ${status.chunkCount} chunków, ${status.sourceCount} źródeł${embed}. Indeks: ${when}.`
      : `Indeks RAG gotowy — ${status.chunkCount} fragmentów, ${status.sourceCount} źródeł${embed}. Ostatnia aktualizacja: ${when}.`;
}

export async function ragReindexReply(
  rag: KnowledgeIndex,
  skin: AgentSkinId,
): Promise<string> {
  try {
    const status = await rag.reindex(true);
    if (status.ready) {
      return skin === "glados"
        ? `Gotowe. Wiedza jest w RAG — ${status.chunkCount} fragmentów z ${status.sourceCount} źródeł.`
        : `Indeksowanie zakończone. RAG gotowy: ${status.chunkCount} fragmentów, ${status.sourceCount} źródeł.`;
    }
    return formatRagStatus(status, skin);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return `Indeksowanie nie powiodło się: ${msg}`;
  }
}
