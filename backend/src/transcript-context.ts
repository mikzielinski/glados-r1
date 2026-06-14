/** Split user STT text from appended device context block. */
export function splitTranscriptAndContext(transcript: string): { userText: string; deviceFacts: string } {
  const marker = /\n\n\[Device context:\s*([^\]]+)\]\s*$/i;
  const m = transcript.match(marker);
  if (!m || m.index == null) {
    return { userText: transcript.trim(), deviceFacts: "" };
  }
  return {
    userText: transcript.slice(0, m.index).trim(),
    deviceFacts: (m[1] ?? "").trim(),
  };
}

export function deviceFactsBlock(facts: string): string {
  if (!facts) {
    return "FAKTY URZĄDZENIA: brak danych z sensorów w tej turze.";
  }
  return `FAKTY URZĄDZENIA (jedyne dozwolone liczby i stany sieci/GPS):
${facts}

Zasady: NIE wymyślaj baterii, GPS, WiFi, pogody, dat ani godzin. Używaj WYŁĄCZNIE powyższych faktów.
Lokalizację mów nazwą miejsca z faktów — nie podawaj surowych współrzędnych liczbowych.`;
}
