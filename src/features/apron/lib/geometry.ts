import type { Flight, Point, Stand, Shift } from "../../../shared/types";
export function compatibleStand(stand: Stand, flight: Flight): boolean {
  return flight.size === "narrow" || stand.size === "wide";
}
export function occupiedFlight(state: Shift, id: string): Flight | undefined {
  return state.flights.find((f) => f.standId === id && f.status !== "departed");
}
export function interpolate(a: Point, b: Point, t: number): Point {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}
export function selectStand(state: Shift, id: string): Shift {
  return { ...state, selectedStandId: id };
}
