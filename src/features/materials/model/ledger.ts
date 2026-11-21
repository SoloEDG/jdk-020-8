import type { MaterialKind, Shift } from "../../../shared/types";
import { materialKinds } from "./catalog";

/** 账目数量按 0.001 精度归整，消除逐秒浮点漂移，保证总账守恒 */
export function roundQty(value: number): number {
  return Math.round(value * 1000) / 1000;
}

export function emptyMaterialRow(): Record<MaterialKind, number> {
  return { fuel: 0, clean: 0, baggage: 0 };
}

/** 机位现场缓存（已卸到机位、可核查的物资） */
export function cacheAt(
  state: Shift,
  standId: string,
  kind: MaterialKind,
): number {
  return state.standCache[standId]?.[kind] ?? 0;
}

/** 车载总量：保障车 + 补给车 */
export function onboardTotal(state: Shift, kind: MaterialKind): number {
  const a = state.vehicles
    .filter((v) => v.kind === kind)
    .reduce((n, v) => n + v.cargo, 0);
  const b = state.supplyVehicles
    .filter((v) => v.kind === kind)
    .reduce((n, v) => n + v.cargo, 0);
  return a + b;
}

/** 在途（含装卸中）的预约量：已离开仓库账目、仍在车上的部分 */
export function inTransitTotal(state: Shift, kind: MaterialKind): number {
  return onboardTotal(state, kind);
}

/** 全机坪现场缓存总量 */
export function standCacheTotal(state: Shift, kind: MaterialKind): number {
  return materialKinds.reduce(
    (n, k) =>
      n +
      (k === kind
        ? Object.values(state.standCache).reduce((m, row) => m + row[kind], 0)
        : 0),
    0,
  );
}

/** 滞留区（改派/取消带回、尚未核验入库）总量 */
export function holdingTotal(state: Shift, kind: MaterialKind): number {
  return state.holding
    .filter((h) => h.kind === kind)
    .reduce((n, h) => n + h.quantity, 0);
}

export interface MaterialBalance {
  kind: MaterialKind;
  initial: number;
  warehouse: number;
  reserved: number;
  inTransit: number;
  standCache: number;
  holding: number;
  consumed: number;
  total: number;
  conserved: boolean;
}

/** 总账：仓库(含预约) + 在途/车载 + 现场缓存 + 滞留 + 已消耗 = 初始库存 */
export function materialBalance(state: Shift): MaterialBalance[] {
  return materialKinds.map((kind) => {
    const warehouse = state.warehouse.stock[kind];
    const reserved = state.warehouse.reserved[kind];
    const inTransit = inTransitTotal(state, kind);
    const cache = standCacheTotal(state, kind);
    const holding = holdingTotal(state, kind);
    const consumed = state.consumed[kind];
    const total = warehouse + reserved + inTransit + cache + holding + consumed;
    const initial = state.initialStock[kind];
    return {
      kind,
      initial,
      warehouse,
      reserved,
      inTransit,
      standCache: cache,
      holding,
      consumed,
      total,
      conserved: Math.abs(total - initial) < 1e-6,
    };
  });
}

export function allConserved(state: Shift): boolean {
  return materialBalance(state).every((b) => b.conserved);
}
