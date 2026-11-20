import type { Shift, Event } from "./types";
export function copyShift(state: Shift): Shift {
  return structuredClone(state);
}
export function record(
  state: Shift,
  text: string,
  tone: Event["tone"] = "info",
): void {
  state.events.unshift({
    id: state.nextEventId++,
    time: state.time,
    text,
    tone,
  });
  state.events = state.events.slice(0, 30);
}
export function clockLabel(seconds: number): string {
  const minutes = 8 * 60 + Math.floor(seconds / 60);
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}
