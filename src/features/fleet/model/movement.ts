import type { Shift } from "../../../shared/types";
import { copyShift } from "../../../shared/document";
import { routePosition } from "../lib/routing";
export function advanceFleet(state: Shift, seconds: number): Shift {
  const s = copyShift(state);
  for (const v of s.vehicles) {
    if (v.status !== "travel" && v.status !== "returning") continue;
    v.progress = Math.min(100, v.progress + (seconds / v.tripDuration) * 100);
    v.position = routePosition(v);
    if (v.progress >= 100) {
      if (v.status === "returning") {
        v.status = "idle";
        v.serviceId = undefined;
      } else {
        v.status = "working";
        const task = s.services.find((t) => t.id === v.serviceId);
        if (task) task.status = "working";
      }
    }
  }
  return s;
}
