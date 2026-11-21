import type { Shift, ServiceKind } from "../../../shared/types";
import { copyShift, record } from "../../../shared/document";
import { serviceBlockReason } from "../lib/eligibility";
import { serviceCatalog } from "./catalog";
import { materialCatalog } from "../../materials/model/catalog";
import { cacheAt, roundQty } from "../../materials/model/ledger";
import { remainingNeed } from "../../materials/model/projection";
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
  const need = remainingNeed(s, task);
  const onSite = cacheAt(s, stand.id, kind);
  if (onSite <= 0) {
    s.conflicts++;
    s.score -= 10;
    record(s, "物资尚未到场，保障车无法领取物资", "warning");
    return s;
  }
  // 仓库预约不等于装车：这里只能动用已卸到机位现场缓存的数量；
  // 物资不足时先领走在场部分，耗尽后作业转入等待续供
  const load = roundQty(Math.min(need, onSite));
  s.standCache[stand.id][kind] = roundQty(
    s.standCache[stand.id][kind] - load,
  );
  v.cargo = roundQty(v.cargo + load);
  task.status = "travel";
  task.vehicleId = v.id;
  v.status = "travel";
  v.serviceId = task.id;
  v.origin = { ...v.position };
  v.target = { x: stand.x + 42, y: stand.y + 22 };
  v.progress = 0;
  v.tripDuration =
    5 + Math.hypot(v.target.x - v.origin.x, v.target.y - v.origin.y) / 50;
  record(
    s,
    `${v.id} → ${flightId} · ${serviceCatalog[kind].label}（领取 ${need} ${materialCatalog[kind].unit}）`,
  );
  return s;
}
