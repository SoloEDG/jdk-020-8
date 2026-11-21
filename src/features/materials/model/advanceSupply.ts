import type { Shift, SupplyVehicle } from "../../../shared/types";
import { copyShift, record } from "../../../shared/document";
import { interpolate } from "../../apron/lib/geometry";
import { materialCatalog, unloadSeconds } from "./catalog";
import { depotPoint, supplyOffset } from "./depot";
import { roundQty } from "./ledger";
import { tripSeconds } from "../../fleet/lib/routing";

function move(v: SupplyVehicle, seconds: number): void {
  v.progress = Math.min(100, v.progress + (seconds / v.tripDuration) * 100);
  const t = Math.min(1, v.progress / 100);
  v.position = interpolate(v.origin, v.target, t);
}

function startReturn(s: Shift, sv: SupplyVehicle): void {
  sv.status = "returning";
  sv.origin = { ...sv.position };
  sv.target = { ...depotPoint };
  sv.progress = 0;
  sv.tripDuration = tripSeconds(sv.position, depotPoint);
}

export function advanceSupply(state: Shift, seconds: number): Shift {
  const s = copyShift(state);
  for (const sv of s.supplyVehicles) {
    if (sv.status === "idle") continue;
    move(sv, seconds);
    if (sv.progress < 100) continue;

    if (sv.status === "loading") {
      const qty = sv.loadQty ?? 0;
      const stand = s.stands.find((x) => x.id === sv.targetStandId);
      sv.cargo = qty;
      sv.loadQty = undefined;
      if (!stand) {
        startReturn(s, sv);
        continue;
      }
      const target = {
        x: stand.x + supplyOffset.x,
        y: stand.y + supplyOffset.y,
      };
      sv.status = "travel";
      sv.origin = { ...depotPoint };
      sv.target = target;
      sv.progress = 0;
      sv.tripDuration = tripSeconds(depotPoint, target);
      record(
        s,
        `${sv.id} 装车完成（${qty} ${materialCatalog[sv.kind].unit}），前往 ${stand.id}`,
      );
      continue;
    }

    if (sv.status === "travel") {
      sv.status = "unloading";
      sv.origin = { ...sv.position };
      sv.target = { ...sv.position };
      sv.progress = 0;
      sv.tripDuration = unloadSeconds(sv.kind, sv.cargo);
      record(s, `${sv.id} 抵达 ${sv.targetStandId}，开始卸货`);
      continue;
    }

    if (sv.status === "unloading") {
      const standId = sv.targetStandId!;
      const qty = sv.cargo;
      if (!s.standCache[standId]) s.standCache[standId] = {
        fuel: 0,
        clean: 0,
        baggage: 0,
      };
      s.standCache[standId][sv.kind] = roundQty(
        s.standCache[standId][sv.kind] + qty,
      );
      s.warehouse.reserved[sv.kind] = roundQty(
        s.warehouse.reserved[sv.kind] - qty,
      );
      sv.cargo = 0;
      record(
        s,
        `${qty} ${materialCatalog[sv.kind].unit} ${materialCatalog[sv.kind].label}卸入机位 ${standId} 现场缓存`,
        "success",
      );
      startReturn(s, sv);
      continue;
    }

    if (sv.status === "returning") {
      if (sv.recall && sv.cargo > 0) {
        const qty = roundQty(sv.cargo);
        s.warehouse.reserved[sv.kind] = roundQty(
          s.warehouse.reserved[sv.kind] - qty,
        );
        s.holding.push({
          id: `HB${String(s.nextBatchId++).padStart(3, "0")}`,
          kind: sv.kind,
          quantity: qty,
          source: "recall",
          receivedAt: s.time,
        });
        record(
          s,
          `${sv.id} 带回的 ${qty} ${materialCatalog[sv.kind].unit} 进入滞留区，待核验后才能重新入库`,
          "warning",
        );
        sv.cargo = 0;
      }
      sv.status = "idle";
      sv.recall = false;
      sv.mode = undefined;
      sv.targetStandId = undefined;
    }
  }
  return s;
}
