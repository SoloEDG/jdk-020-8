import type { Shift, ServiceKind } from "../../../shared/types";
import { copyShift, record } from "../../../shared/document";
import { serviceBlockReason } from "../lib/eligibility";
import { serviceCatalog } from "./catalog";
export function dispatchService(
  state: Shift,
  flightId: string,
  kind: ServiceKind,
  vehicleId: string,
): Shift {
  const s = copyShift(state),
    reason = serviceBlockReason(s, flightId, kind),
    v = s.vehicles.find((x) => x.id === vehicleId),
    f = s.flights.find((x) => x.id === flightId),
    stand = s.stands.find((x) => x.id === f?.standId),
    task = s.services.find((x) => x.flightId === flightId && x.kind === kind);
  if (
    reason ||
    !v ||
    v.status !== "idle" ||
    v.kind !== kind ||
    !stand ||
    !task
  ) {
    s.conflicts++;
    s.score -= 10;
    record(s, reason ?? "车辆不可用或车辆类型不匹配", "warning");
    return s;
  }
  task.status = "travel";
  task.vehicleId = v.id;
  v.status = "travel";
  v.serviceId = task.id;
  v.origin = { ...v.position };
  v.target = { x: stand.x + 42, y: stand.y + 22 };
  v.progress = 0;
  v.tripDuration =
    5 + Math.hypot(v.target.x - v.origin.x, v.target.y - v.origin.y) / 50;
  record(s, `${v.id} → ${flightId} · ${serviceCatalog[kind].label}`);
  return s;
}
