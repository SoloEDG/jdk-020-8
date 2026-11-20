import type { Vehicle, ServiceKind } from "../../../shared/types";
export const depot = { x: 850, y: 510 };
export function initialVehicles(): Vehicle[] {
  const result: Vehicle[] = [];
  for (const [kind, prefix] of [
    ["fuel", "FL"],
    ["baggage", "BG"],
    ["clean", "CL"],
  ] as [ServiceKind, string][])
    for (let i = 1; i <= 2; i++) {
      const p = { x: 810 + (i - 1) * 36, y: 430 + result.length * 15 };
      result.push({
        id: `${prefix}-0${i}`,
        kind,
        status: "idle",
        position: p,
        origin: p,
        target: p,
        progress: 0,
        tripDuration: 10,
      });
    }
  return result;
}
export function selectVehicle(
  state: import("../../../shared/types").Shift,
  id: string,
) {
  return { ...state, selectedVehicleId: id };
}
