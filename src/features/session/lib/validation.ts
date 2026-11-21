import type { Shift } from "../../../shared/types";
import { materialBalance } from "../../materials/model/ledger";
const kinds = ["fuel", "baggage", "clean"];
const flightStates = [
  "scheduled",
  "incoming",
  "parked",
  "departing",
  "departed",
];
const serviceStates = ["pending", "travel", "working", "waiting", "done"];
const vehicleStates = [
  "idle",
  "loading",
  "travel",
  "working",
  "waiting",
  "returning",
];
const supplyStates = [
  "idle",
  "loading",
  "travel",
  "unloading",
  "returning",
];
type Row = Record<string, unknown>;
function row(value: unknown): value is Row {
  return typeof value === "object" && value !== null;
}
function finite(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}
function nonneg(value: unknown): value is number {
  return finite(value) && value >= 0;
}
function text(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}
function point(value: unknown): boolean {
  return row(value) && finite(value.x) && finite(value.y);
}
function unique(values: Row[]): boolean {
  return (
    values.every((x) => text(x.id)) &&
    new Set(values.map((x) => x.id)).size === values.length
  );
}
function collection(value: unknown, length: number): value is Row[] {
  return (
    Array.isArray(value) &&
    value.length === length &&
    value.every(row) &&
    unique(value)
  );
}
function materialRow(value: unknown): boolean {
  return (
    row(value) &&
    kinds.every((k) => nonneg(value[k]))
  );
}
export function validShift(value: unknown): value is Shift {
  if (
    !row(value) ||
    value.version !== 2 ||
    !finite(value.time) ||
    value.time < 0 ||
    !finite(value.score) ||
    !finite(value.conflicts) ||
    value.conflicts < 0 ||
    typeof value.paused !== "boolean" ||
    ![1, 2, 4].includes(value.speed as number) ||
    !finite(value.nextEventId) ||
    !finite(value.nextBatchId)
  )
    return false;
  if (
    !collection(value.flights, 6) ||
    !collection(value.stands, 6) ||
    !collection(value.vehicles, 6) ||
    !collection(value.services, 18) ||
    !collection(value.supplyVehicles, 3) ||
    !Array.isArray(value.events) ||
    value.events.length > 30
  )
    return false;
  const flights = value.flights,
    stands = value.stands,
    vehicles = value.vehicles,
    services = value.services,
    supplyVehicles = value.supplyVehicles;
  const flightIds = new Set(flights.map((x) => x.id)),
    standIds = new Set(stands.map((x) => x.id)),
    vehicleIds = new Set(vehicles.map((x) => x.id)),
    serviceIds = new Set(services.map((x) => x.id));
  if (!row(value.warehouse)) return false;
  const warehouse = value.warehouse;
  if (
    !materialRow(warehouse.stock) ||
    !materialRow(warehouse.reserved) ||
    !nonneg(warehouse.bays)
  )
    return false;
  if (!materialRow(value.initialStock) || !materialRow(value.consumed))
    return false;
  if (!row(value.standCache)) return false;
  for (const [standId, cacheRow] of Object.entries(value.standCache)) {
    if (!standIds.has(standId) || !materialRow(cacheRow)) return false;
  }
  if (!Array.isArray(value.holding)) return false;
  const holdingIds = new Set<string>();
  for (const h of value.holding) {
    if (
      !row(h) ||
      !text(h.id) ||
      !kinds.includes(h.kind as string) ||
      !nonneg(h.quantity) ||
      (h.quantity as number) === 0 ||
      !["recall", "unload"].includes(h.source as string) ||
      !nonneg(h.receivedAt) ||
      holdingIds.has(h.id as string)
    )
      return false;
    holdingIds.add(h.id as string);
  }
  if (
    !flights.every(
      (f) =>
        text(f.airline) &&
        text(f.from) &&
        text(f.destination) &&
        text(f.aircraft) &&
        ["narrow", "wide"].includes(f.size as string) &&
        flightStates.includes(f.status as string) &&
        finite(f.arrival) &&
        finite(f.deadline) &&
        finite(f.passengers) &&
        f.passengers > 0 &&
        text(f.color) &&
        (f.departureAt === undefined || finite(f.departureAt)) &&
        (f.standId === undefined || standIds.has(f.standId)),
    )
  )
    return false;
  if (
    !stands.every(
      (s) =>
        point(s) &&
        ["narrow", "wide"].includes(s.size as string) &&
        text(s.terminal),
    )
  )
    return false;
  if (
    !vehicles.every(
      (v) =>
        kinds.includes(v.kind as string) &&
        vehicleStates.includes(v.status as string) &&
        point(v.position) &&
        point(v.origin) &&
        point(v.target) &&
        nonneg(v.progress) &&
        v.progress <= 100 &&
        finite(v.tripDuration) &&
        v.tripDuration > 0 &&
        nonneg(v.cargo) &&
        (v.serviceId === undefined || serviceIds.has(v.serviceId)),
    )
  )
    return false;
  if (
    !supplyVehicles.every(
      (v) =>
        kinds.includes(v.kind as string) &&
        supplyStates.includes(v.status as string) &&
        point(v.position) &&
        point(v.origin) &&
        point(v.target) &&
        nonneg(v.progress) &&
        v.progress <= 100 &&
        finite(v.tripDuration) &&
        nonneg(v.cargo) &&
        nonneg(v.capacity) &&
        v.cargo <= (v.capacity as number) &&
        (v.targetStandId === undefined || standIds.has(v.targetStandId)),
    )
  )
    return false;
  if (
    !services.every(
      (s) =>
        flightIds.has(s.flightId) &&
        kinds.includes(s.kind as string) &&
        serviceStates.includes(s.status as string) &&
        nonneg(s.progress) &&
        s.progress <= 100 &&
        finite(s.duration) &&
        s.duration > 0 &&
        nonneg(s.demand) &&
        (s.demand as number) > 0 &&
        nonneg(s.consumed) &&
        (s.consumed as number) <= (s.demand as number) &&
        (s.vehicleId === undefined || vehicleIds.has(s.vehicleId)),
    )
  )
    return false;
  if (
    !flights.every((f) =>
      kinds.every(
        (k) =>
          services.filter((t) => t.flightId === f.id && t.kind === k).length ===
          1,
      ),
    )
  )
    return false;
  const occupied = flights
    .filter((f) => f.status !== "departed" && f.standId !== undefined)
    .map((f) => f.standId);
  if (new Set(occupied).size !== occupied.length) return false;
  if (
    !flights.every(
      (f) =>
        !["parked", "departing", "departed"].includes(f.status as string) ||
        (standIds.has(f.standId) &&
          (f.size === "narrow" ||
            stands.find((s) => s.id === f.standId)?.size === "wide")),
    )
  )
    return false;
  if (
    !services.every((s) => {
      if (s.status === "pending")
        return s.progress === 0 && s.vehicleId === undefined && s.consumed === 0;
      const v = vehicles.find((x) => x.id === s.vehicleId);
      if (!v || v.kind !== s.kind) return false;
      if (s.status === "done")
        return s.progress === 100 && s.consumed === s.demand;
      if (s.status === "waiting")
        return ["working", "waiting"].includes(v.status as string);
      return (
        v.serviceId === s.id &&
        v.status === s.status &&
        flights.find((f) => f.id === s.flightId)?.status === "parked"
      );
    })
  )
    return false;
  if (
    !vehicles.every(
      (v) =>
        !["travel", "working", "waiting"].includes(v.status as string) ||
        services.some(
          (s) =>
            s.id === v.serviceId &&
            s.vehicleId === v.id &&
            (s.status === v.status ||
              (s.status === "waiting" && v.status === "waiting")),
        ),
    )
  )
    return false;
  if (
    !flights.every(
      (f) =>
        services.filter(
          (t) =>
            t.flightId === f.id &&
            ["travel", "working", "waiting"].includes(t.status as string),
        ).length <= 2,
    )
  )
    return false;
  if (
    !flights.every(
      (f) =>
        !["departing", "departed"].includes(f.status as string) ||
        services
          .filter((t) => t.flightId === f.id)
          .every((t) => t.status === "done"),
    )
  )
    return false;
  if (
    !value.events.every(
      (e) =>
        row(e) &&
        finite(e.id) &&
        finite(e.time) &&
        text(e.text) &&
        ["info", "success", "warning"].includes(e.tone as string),
    )
  )
    return false;
  const events = value.events as Row[];
  if (
    new Set(events.map((e) => e.id)).size !== events.length ||
    events.some((e) => (e.id as number) >= (value.nextEventId as number))
  )
    return false;
  if (
    !(flightIds.has(value.selectedFlightId) &&
      (value.selectedStandId === undefined ||
        standIds.has(value.selectedStandId)) &&
      (value.selectedVehicleId === undefined ||
        vehicleIds.has(value.selectedVehicleId)))
  )
    return false;
  // 总账守恒：仓库(含预约) + 在途/车载 + 现场缓存 + 滞留区 + 已消耗 = 初始库存
  const balances = materialBalance(value as unknown as Shift);
  return balances.every((b) => b.conserved);
}
