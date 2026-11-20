import type { Point, Vehicle } from "../../../shared/types";
export function tripSeconds(a: Point, b: Point): number {
  return 5 + Math.hypot(a.x - b.x, a.y - b.y) / 50;
}
export function routePosition(v: Vehicle): Point {
  const t = Math.min(1, v.progress / 100);
  return {
    x: v.origin.x + (v.target.x - v.origin.x) * t,
    y: v.origin.y + (v.target.y - v.origin.y) * t,
  };
}
export const vehicleLabels = {
  fuel: "加油车",
  baggage: "行李车",
  clean: "清洁车",
};
export const vehicleColors = {
  fuel: "#e5a84e",
  baggage: "#529e9b",
  clean: "#7e8eb1",
};
