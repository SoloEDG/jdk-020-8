import type { Service, Shift, Vehicle } from "../../../shared/types";
import { copyShift, record } from "../../../shared/document";
import { serviceCatalog } from "./catalog";
import { materialCatalog } from "../../materials/model/catalog";
import { cacheAt, roundQty } from "../../materials/model/ledger";
import { remainingNeed } from "../../materials/model/projection";

function flightStandId(s: Shift, flightId: string): string | undefined {
  return s.flights.find((f) => f.id === flightId)?.standId;
}

function startReturn(v: Vehicle): void {
  v.status = "returning";
  v.origin = { ...v.position };
  v.target = { x: 830, y: 480 };
  v.progress = 0;
  v.tripDuration = 10;
}

/** 等待续供的作业：现场缓存补足后自动恢复，等待期间持续占用服务位 */
function resumeIfResupplied(s: Shift, task: Service): void {
  const v = s.vehicles.find((x) => x.id === task.vehicleId);
  const standId = flightStandId(s, task.flightId);
  if (!v || !standId) return;
  if (cacheAt(s, standId, task.kind) >= remainingNeed(s, task)) {
    const qty = roundQty(remainingNeed(s, task));
    s.standCache[standId][task.kind] = roundQty(
      s.standCache[standId][task.kind] - qty,
    );
    v.cargo = roundQty(v.cargo + qty);
    task.status = "working";
    v.status = "working";
    record(
      s,
      `${task.flightId} ${serviceCatalog[task.kind].label}续供到位，恢复作业`,
      "success",
    );
  }
}

export function advanceServices(state: Shift, seconds: number): Shift {
  const s = copyShift(state);
  for (const task of s.services) {
    if (task.status === "waiting") resumeIfResupplied(s, task);
    if (task.status !== "working") continue;
    const v = s.vehicles.find((x) => x.id === task.vehicleId);
    const workRatio = seconds / task.duration;
    const intended = task.demand * workRatio;
    const used = Math.min(intended, v?.cargo ?? 0);
    if (v && used > 0) {
      v.cargo = roundQty(Math.max(0, v.cargo - used));
      task.consumed = roundQty(Math.min(task.demand, task.consumed + used));
      s.consumed[task.kind] = roundQty(s.consumed[task.kind] + used);
    }
    if (used > 0) {
      task.progress = Math.min(
        100,
        task.progress + (used / task.demand) * 100,
      );
    }
    const standId = flightStandId(s, task.flightId);
    if (task.consumed >= task.demand - 1e-6) {
      // 物资已足量消费即视为作业完成（吸收逐秒浮点误差），归整最终账目
      task.status = "done";
      task.progress = 100;
      task.consumed = roundQty(task.demand);
      if (v) v.cargo = roundQty(v.cargo);
      if (v) startReturn(v);
      record(
        s,
        `${task.flightId} ${serviceCatalog[task.kind].label}完成 · 实耗 ${Math.round(task.consumed)} ${materialCatalog[task.kind].unit}`,
        "success",
      );
    } else if (v && v.cargo <= 0) {
      // 部分供给完成：允许等待续供，但车辆与服务位继续被占用
      task.status = "waiting";
      v.status = "waiting";
      record(
        s,
        `${task.flightId} ${serviceCatalog[task.kind].label}物资耗尽（已完成 ${Math.floor(task.progress)}%），等待续供`,
        "warning",
      );
      if (standId) resumeIfResupplied(s, task);
    }
  }
  return s;
}

/** 途中改派/取消：未使用物资随车返回，进入可核查的滞留区而非直接加回仓库 */
export function cancelService(state: Shift, serviceId: string): Shift {
  const s = copyShift(state);
  const task = s.services.find((t) => t.id === serviceId);
  if (!task) return state;
  if (task.status === "done" || task.status === "pending") {
    record(s, "该任务当前不可取消", "warning");
    s.conflicts++;
    s.score -= 10;
    return s;
  }
  const v = s.vehicles.find((x) => x.id === task.vehicleId);
  task.status = "pending";
  task.vehicleId = undefined;
  if (v) {
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
        `${task.flightId} ${serviceCatalog[task.kind].label}取消，车载 ${qty} ${materialCatalog[v.kind].unit}随 ${v.id} 回滞留区核验`,
        "warning",
      );
      v.cargo = 0;
    }
    v.serviceId = undefined;
    if (v.status !== "returning") startReturn(v);
  }
  return s;
}
