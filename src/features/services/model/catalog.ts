import type { Flight, Service, ServiceKind } from "../../../shared/types";
export const serviceCatalog: Record<
  ServiceKind,
  {
    label: string;
    english: string;
    duration: number;
    requires: ServiceKind[];
    description: string;
  }
> = {
  baggage: {
    label: "行李装卸",
    english: "BAGGAGE",
    duration: 26,
    requires: [],
    description: "先卸后装，释放客舱清洁作业区域",
  },
  fuel: {
    label: "燃油补给",
    english: "REFUEL",
    duration: 34,
    requires: [],
    description: "独立保障，可与行李装卸同步进行",
  },
  clean: {
    label: "客舱清洁",
    english: "CABIN CLEAN",
    duration: 22,
    requires: ["baggage"],
    description: "行李装卸完成后方可进入客舱",
  },
};
export function initialServices(flights: Flight[]): Service[] {
  return flights.flatMap((f) =>
    (Object.keys(serviceCatalog) as ServiceKind[]).map((kind) => ({
      id: `${f.id}-${kind}`,
      flightId: f.id,
      kind,
      status: "pending",
      progress: 0,
      duration: serviceCatalog[kind].duration * (f.size === "wide" ? 1.3 : 1),
    })),
  );
}
