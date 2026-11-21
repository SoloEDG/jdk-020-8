import type { LoadMode, Shift } from "../../../shared/types";
import { copyShift, record } from "../../../shared/document";
import { loadSeconds, materialCatalog } from "./catalog";
import { depotPoint, standOccupancy } from "./depot";
import { roundQty } from "./ledger";
import { tripSeconds } from "../../fleet/lib/routing";

const BULK_MIN_RATIO = 0.4;
const EXPRESS_PENALTY = 5;

function fail(s: Shift, reason: string): Shift {
  s.conflicts++;
  s.score -= 10;
  record(s, reason, "warning");
  return s;
}

/**
 * 仓库预约 ≠ 装车：此处仅完成仓库账目扣减与预约登记，
 * 物资随后经历装车 → 在途 → 卸货，保障车只能消费实际到场的数量。
 */
export function dispatchSupply(
  state: Shift,
  supplyVehicleId: string,
  standId: string,
  rawQty: number,
  mode: LoadMode,
): Shift {
  const s = copyShift(state);
  const sv = s.supplyVehicles.find((x) => x.id === supplyVehicleId);
  const stand = s.stands.find((x) => x.id === standId);
  if (!sv) return fail(s, "补给车不存在");
  if (sv.status !== "idle") return fail(s, `${sv.id} 正在执行补给任务`);
  if (!stand) return fail(s, "目标机位不存在");
  const spec = materialCatalog[sv.kind];
  const quantity = Math.floor(rawQty);
  if (!Number.isFinite(quantity) || quantity <= 0)
    return fail(s, "补给数量必须为正整数");
  if (quantity > sv.capacity)
    return fail(s, `${sv.id} 容量上限 ${sv.capacity} ${spec.unit}`);
  if (mode === "bulk" && quantity < sv.capacity * BULK_MIN_RATIO)
    return fail(
      s,
      `集中补货单次不少于容量的 ${Math.round(BULK_MIN_RATIO * 100)}%，少量请走急送`,
    );
  const loadingBays = s.supplyVehicles.filter(
    (v) => v.status === "loading" && !v.recall,
  ).length;
  if (loadingBays >= s.warehouse.bays)
    return fail(s, "仓库装卸月台已占满，请稍后再预约");
  const free = s.warehouse.stock[sv.kind] - s.warehouse.reserved[sv.kind];
  if (free < quantity)
    return fail(
      s,
      `${spec.label}自由库存不足（可用 ${free} ${spec.unit}，预约中 ${s.warehouse.reserved[sv.kind]}）`,
    );
  if (s.warehouse.reserved[sv.kind] + quantity > spec.reservationCap)
    return fail(s, `${spec.label}预约量超过仓库预约上限`);
  if (standOccupancy(s, standId) >= 2)
    return fail(s, `机位 ${standId} 服务位已满（保障车与补给车共用 2 位）`);

  s.warehouse.stock[sv.kind] = roundQty(
    s.warehouse.stock[sv.kind] - quantity,
  );
  s.warehouse.reserved[sv.kind] = roundQty(
    s.warehouse.reserved[sv.kind] + quantity,
  );
  sv.status = "loading";
  sv.cargo = 0;
  sv.loadQty = quantity;
  sv.mode = mode;
  sv.targetStandId = standId;
  sv.recall = false;
  sv.origin = { ...depotPoint };
  sv.target = { ...depotPoint };
  sv.progress = 0;
  sv.tripDuration = loadSeconds(sv.kind, quantity);
  if (mode === "express") {
    s.score -= EXPRESS_PENALTY;
    record(
      s,
      `急送预约 ${sv.id} → ${standId} · ${quantity} ${spec.unit}（急送成本 -${EXPRESS_PENALTY}）`,
      "warning",
    );
  } else {
    record(
      s,
      `集中补货预约 ${sv.id} → ${standId} · ${quantity} ${spec.unit}，仓库开始装车`,
    );
  }
  return s;
}

/** 途中改派/取消：未使用物资随车回到可核查的滞留区，不能直接加回仓库 */
export function recallSupply(state: Shift, supplyVehicleId: string): Shift {
  const s = copyShift(state);
  const sv = s.supplyVehicles.find((x) => x.id === supplyVehicleId);
  if (!sv) return fail(s, "补给车不存在");
  if (sv.recall || sv.status === "idle" || sv.status === "returning")
    return fail(s, "该补给车当前无需召回");
  if (sv.status === "loading") {
    const qty = sv.loadQty ?? 0;
    s.warehouse.reserved[sv.kind] = roundQty(
      s.warehouse.reserved[sv.kind] - qty,
    );
    s.warehouse.stock[sv.kind] = roundQty(s.warehouse.stock[sv.kind] + qty);
    sv.status = "returning";
    sv.recall = true;
    sv.cargo = 0;
    sv.loadQty = undefined;
    sv.origin = { ...sv.position };
    sv.target = { ...depotPoint };
    sv.progress = 0;
    sv.tripDuration = tripSeconds(sv.position, depotPoint);
    record(s, `${sv.id} 装车中止，${qty} ${materialCatalog[sv.kind].unit}退回仓库账目`);
    return s;
  }
  sv.recall = true;
  sv.status = "returning";
  sv.origin = { ...sv.position };
  sv.target = { ...depotPoint };
  sv.progress = 0;
  sv.tripDuration = tripSeconds(sv.position, depotPoint);
  record(s, `${sv.id} 途中召回，车载 ${sv.cargo} ${materialCatalog[sv.kind].unit}将进入滞留区核验`);
  return s;
}

/** 滞留区核验通过后，物资才能重新进入仓库自由库存 */
export function verifyHolding(state: Shift, batchId: string): Shift {
  const s = copyShift(state);
  const idx = s.holding.findIndex((h) => h.id === batchId);
  if (idx < 0) return fail(s, "滞留批次不存在或已核验");
  const batch = s.holding[idx];
  s.holding.splice(idx, 1);
  s.warehouse.stock[batch.kind] = roundQty(
    s.warehouse.stock[batch.kind] + batch.quantity,
  );
  record(
    s,
    `滞留批次 ${batch.id} 核验通过，${batch.quantity} ${materialCatalog[batch.kind].unit}重新入库`,
    "success",
  );
  return s;
}

export function verifyAllHolding(state: Shift): Shift {
  let s = state;
  for (const batch of [...state.holding]) s = verifyHolding(s, batch.id);
  return s;
}
