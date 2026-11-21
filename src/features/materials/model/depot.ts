import type { Shift, SupplyVehicle, WarehouseState } from "../../../shared/types";
import { materialCatalog, materialKinds } from "./catalog";
import { emptyMaterialRow } from "./ledger";

export const depotPoint = { x: 850, y: 510 };
/** 补给车在机位旁的卸货点偏移（与保障车错开，共用同一服务位空间） */
export const supplyOffset = { x: 66, y: 40 };

export function initialWarehouse(): WarehouseState {
  const stock = emptyMaterialRow();
  for (const k of materialKinds) stock[k] = materialCatalog[k].initialStock;
  return { stock, reserved: emptyMaterialRow(), bays: 2 };
}

export function initialSupplyVehicles(): SupplyVehicle[] {
  return materialKinds.map((kind, i) => {
    const p = { x: 798 + i * 4, y: 528 + i * 14 };
    return {
      id: `SV-${kind === "fuel" ? "F" : kind === "clean" ? "C" : "B"}01`,
      kind,
      status: "idle",
      position: p,
      origin: p,
      target: p,
      progress: 0,
      tripDuration: 0,
      cargo: 0,
      capacity: materialCatalog[kind].capacity,
    };
  });
}

/**
 * 机坪停车空间：每个机位最多同时容纳 2 台车辆，
 * 保障车与补给车共用同一机坪交通与停车资源。
 */
export function standOccupancy(state: Shift, standId: string): number {
  const serviceCount = state.vehicles.filter((v) => {
    if (v.status !== "travel" && v.status !== "working" && v.status !== "waiting")
      return false;
    const task = state.services.find((t) => t.id === v.serviceId);
    const flight = task && state.flights.find((f) => f.id === task.flightId);
    return flight?.standId === standId;
  }).length;
  const supplyCount = state.supplyVehicles.filter(
    (v) =>
      (v.status === "travel" || v.status === "unloading") &&
      v.targetStandId === standId,
  ).length;
  return serviceCount + supplyCount;
}

export const supplyLabels: Record<string, string> = {
  idle: "待命",
  loading: "仓库装车",
  travel: "在途补给",
  unloading: "现场卸货",
  returning: "返回核验",
};
