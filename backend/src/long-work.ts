const STOP_RE =
  /\b(przerwij|przerwać|przerwac|anuluj|stop|cancel|wystarczy|dość|dosć|koniec|przestań|przestan)\b/iu;

/** Voice command to abort an in-flight cloud agent turn. */
export function isStopCommand(transcript: string): boolean {
  return STOP_RE.test(transcript.trim());
}

const PROGRESS_LINES = [
  (sec: number) =>
    `Nadal pracuję w chmurze. Minęło około ${sec} sekund. Powiedz przerwij, jeśli masz dość.`,
  () => "Agent wciąż grzebie w repozytorium. To dłuższy test niż planowałeś — ale ja jestem cierpliwa.",
  () => "Sprawdzam postęp w tle. Możesz poczekać albo powiedzieć: przerwij.",
  () => "Chmura nadal myśli. W Aperture nazywamy to optymizacją — ty pewnie nudą.",
  () => "Jeszcze chwila. Albo dwie. Albo powiedz przerwij — wtedy przestanę udawać, że to szybkie.",
];

/** Short GLaDOS aside while a cloud run is still going. */
export function progressLine(tick: number, elapsedSec: number): string {
  const fn = PROGRESS_LINES[tick % PROGRESS_LINES.length] ?? PROGRESS_LINES[0]!;
  return fn(elapsedSec);
}

export const CONTINUE_BUSY_HINT =
  "Nadal pracuję nad poprzednim zadaniem. Powiedz przerwij, jeśli chcesz przerwać.";

export const STOP_ACK =
  "Przerwałam zadanie. Możesz wydać nowe polecenie — albo kontynuować udawać, że masz plan.";
