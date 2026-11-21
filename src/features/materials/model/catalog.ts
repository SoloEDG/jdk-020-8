import type { Flight, MaterialKind, ServiceKind } from "../../../shared/types";

export interface MaterialSpec {
  kind: MaterialKind;
  label: string;
  english: string;
  unit: string;
  /** 单车容量（使用单位） */
  capacity: number;
  /** 仓库装车每单位耗时（秒） */
  loadPerUnit: number;
  /** 现场卸货每单位耗时（秒） */
  unloadPerUnit: number;
  /** 单次装卸最少耗时（秒），避免小批量瞬时完成 */
  minHandling: number;
  /** 初始库存 */
  initialStock: number;
  /** 仓库预约占位上限 */
  reservationCap: number;
  color: string;
  icon: string;
}

export const materialCatalog: Record<MaterialKind, MaterialSpec> = {
  fuel: {
    kind: "fuel",
    label: "航空燃油",
    english: "JET FUEL",
    unit: "L",
    capacity: 2400,
    loadPerUnit: 0.004,
    unloadPerUnit: 0.006,
    minHandling: 4,
    initialStock: 9000,
    reservationCap: 7200,
    color: "#dda24d",
    icon: "◈",
  },
  clean: {
    kind: "clean",
    label: "清洁耗材",
    english: "CLEANING KIT",
    unit: "份",
    capacity: 40,
    loadPerUnit: 0.4,
    unloadPerUnit: 0.3,
    minHandling: 3,
    initialStock: 160,
    reservationCap: 120,
    color: "#798cab",
    icon: "✧",
  },
  baggage: {
    kind: "baggage",
    label: "行李容器",
    english: "ULD / BAGGAGE",
    unit: "件",
    capacity: 60,
    loadPerUnit: 0.25,
    unloadPerUnit: 0.2,
    minHandling: 3,
    initialStock: 240,
    reservationCap: 180,
    color: "#4b9392",
    icon: "▤",
  },
};

export const materialKinds: MaterialKind[] = ["fuel", "clean", "baggage"];

/** 保障作业对物资的需求量（按机型与载客） */
export function serviceDemand(kind: ServiceKind, flight: Flight): number {
  switch (kind) {
    case "fuel":
      return Math.round(
        (flight.size === "wide" ? 2200 : 1100) +
          flight.passengers * (flight.size === "wide" ? 2.4 : 1.8),
      );
    case "clean":
      return Math.max(6, Math.round(flight.passengers / 22));
    case "baggage":
      return Math.max(18, Math.round(flight.passengers * 0.55));
  }
}

export function loadSeconds(kind: MaterialKind, quantity: number): number {
  const spec = materialCatalog[kind];
  return Math.max(spec.minHandling, quantity * spec.loadPerUnit);
}

export function unloadSeconds(kind: MaterialKind, quantity: number): number {
  const spec = materialCatalog[kind];
  return Math.max(spec.minHandling, quantity * spec.unloadPerUnit);
}
