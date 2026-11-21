import type { MaterialKind, Service, Shift } from "../../../shared/types";
import { materialKinds, unloadSeconds } from "./catalog";
import { cacheAt } from "./ledger";
import { depotPoint } from "./depot";
import { tripSeconds } from "../../fleet/lib/routing";

export function remainingNeed(state: Shift, task: Service): number {
  if (task.status === "done") return 0;
  return Math.max(0, Math.round(task.demand - task.consumed));
}

export interface StockoutForecast {
  kind: MaterialKind;
  /** 当前可立即动用：仓库自由库存 + 各机位现场缓存（滞留区核验前不计入） */
  available: number;
  /** 未完成作业的剩余总需求 */
  need: number;
  stockout: boolean;
  /** 首次断供对应的航班截止时刻 */
  atTime?: number;
  /** 受影响的离港航班（按截止时间排序） */
  affected: string[];
}

interface DemandEntry {
  flightId: string;
  deadline: number;
  qty: number;
}
interface SupplyEntry {
  eta: number;
  qty: number;
}

function futureSupplies(state: Shift, kind: MaterialKind): SupplyEntry[] {
  const out: SupplyEntry[] = [];
  for (const sv of state.supplyVehicles) {
    if (sv.kind !== kind || sv.recall) continue;
    const stand = state.stands.find((x) => x.id === sv.targetStandId);
    let qty = 0;
    let eta = state.time;
    if (sv.status === "loading") {
      qty = sv.loadQty ?? 0;
      eta += (1 - sv.progress / 100) * sv.tripDuration;
      if (stand) eta += tripSeconds(depotPoint, stand);
      eta += unloadSeconds(kind, qty);
    } else if (sv.status === "travel") {
      qty = sv.cargo;
      eta += (1 - sv.progress / 100) * sv.tripDuration;
      eta += unloadSeconds(kind, qty);
    } else if (sv.status === "unloading") {
      qty = sv.cargo;
      eta += (1 - sv.progress / 100) * sv.tripDuration;
    } else continue;
    if (qty > 0) out.push({ eta, qty });
  }
  return out.sort((a, b) => a.eta - b.eta);
}

export function stockoutForecast(state: Shift): StockoutForecast[] {
  return materialKinds.map((kind) => {
    const demands: DemandEntry[] = [];
    for (const task of state.services) {
      if (task.kind !== kind) continue;
      const flight = state.flights.find((f) => f.id === task.flightId);
      if (!flight || flight.status === "departed") continue;
      const qty = remainingNeed(state, task);
      if (qty > 0)
        demands.push({ flightId: flight.id, deadline: flight.deadline, qty });
    }
    demands.sort((a, b) => a.deadline - b.deadline);

    const freeWarehouse =
      state.warehouse.stock[kind] - state.warehouse.reserved[kind];
    const cacheNow = state.stands.reduce(
      (n, stand) => n + cacheAt(state, stand.id, kind),
      0,
    );
    const supplies = futureSupplies(state, kind);
    let pool = freeWarehouse + cacheNow;
    let cumulative = 0;
    let supplyIdx = 0;
    let stockout = false;
    let atTime: number | undefined;
    const affected: string[] = [];
    for (const d of demands) {
      while (supplyIdx < supplies.length && supplies[supplyIdx].eta <= d.deadline) {
        pool += supplies[supplyIdx].qty;
        supplyIdx++;
      }
      cumulative += d.qty;
      if (pool < cumulative) {
        stockout = true;
        if (atTime === undefined) atTime = d.deadline;
        affected.push(d.flightId);
      }
    }
    return {
      kind,
      available: freeWarehouse + cacheNow,
      need: demands.reduce((n, d) => n + d.qty, 0),
      stockout,
      atTime,
      affected,
    };
  });
}

export function forecastFor(
  state: Shift,
  kind: MaterialKind,
): StockoutForecast {
  return stockoutForecast(state).find((f) => f.kind === kind)!;
}
