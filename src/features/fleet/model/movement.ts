import type { Shift } from "../../../shared/types";
import { copyShift, record } from "../../../shared/document";
import { routePosition } from "../lib/routing";
import { materialCatalog } from "../../materials/model/catalog";
import { roundQty } from "../../materials/model/ledger";
export function advanceFleet(state: Shift, seconds: number): Shift {
  const s = copyShift(state);
  for (const v of s.vehicles) {
    if (v.status !== "travel" && v.status !== "returning") continue;
    v.progress = Math.min(100, v.progress + (seconds / v.tripDuration) * 100);
    v.position = routePosition(v);
    if (v.progress >= 100) {
      if (v.status === "returning") {
        // 取消/改派带回的未使用物资必须进入可核查滞留区，不能直接加回仓库
        if (v.cargo > 0) {
          const qty = roundQty(v.cargo);
          s.holding.push({
            id: `HB${String(s.nextBatchId++).padStart(3, "0")}`,
            kind: v.kind,
            quantity: qty,
            source: "recall",
            receivedAt: s.time,
          });
          record(
            s,
            `${v.id} 返回车场，剩余 ${qty} ${materialCatalog[v.kind].unit}转入滞留区待核验`,
            "warning",
          );
          v.cargo = 0;
        }
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
