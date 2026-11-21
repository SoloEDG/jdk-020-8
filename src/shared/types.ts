export type ServiceKind = "baggage" | "fuel" | "clean";
export type MaterialKind = ServiceKind;
export type LoadMode = "bulk" | "express";
export type FlightStatus =
  "scheduled" | "incoming" | "parked" | "departing" | "departed";
export type ServiceStatus =
  | "pending"
  | "travel"
  | "working"
  | "waiting"
  | "done";
export type VehicleStatus =
  | "idle"
  | "loading"
  | "travel"
  | "working"
  | "waiting"
  | "returning";
export type SupplyStatus =
  | "idle"
  | "loading"
  | "travel"
  | "unloading"
  | "returning";
export interface Point {
  x: number;
  y: number;
}
export interface Flight {
  id: string;
  airline: string;
  from: string;
  destination: string;
  aircraft: string;
  size: "narrow" | "wide";
  arrival: number;
  deadline: number;
  passengers: number;
  status: FlightStatus;
  standId?: string;
  departureAt?: number;
  color: string;
}
export interface Stand extends Point {
  id: string;
  size: "narrow" | "wide";
  terminal: string;
}
export interface Service {
  id: string;
  flightId: string;
  kind: ServiceKind;
  status: ServiceStatus;
  progress: number;
  duration: number;
  vehicleId?: string;
  demand: number;
  consumed: number;
}
export interface Vehicle {
  id: string;
  kind: ServiceKind;
  status: VehicleStatus;
  position: Point;
  origin: Point;
  target: Point;
  progress: number;
  tripDuration: number;
  serviceId?: string;
  cargo: number;
  loadQty?: number;
  loadMode?: LoadMode;
  recall?: boolean;
}
export interface SupplyVehicle {
  id: string;
  kind: MaterialKind;
  status: SupplyStatus;
  position: Point;
  origin: Point;
  target: Point;
  progress: number;
  tripDuration: number;
  cargo: number;
  capacity: number;
  loadQty?: number;
  targetStandId?: string;
  mode?: LoadMode;
  recall?: boolean;
}
export interface HoldingBatch {
  id: string;
  kind: MaterialKind;
  quantity: number;
  source: "recall" | "unload";
  receivedAt: number;
}
export interface WarehouseState {
  stock: Record<MaterialKind, number>;
  reserved: Record<MaterialKind, number>;
  bays: number;
}
export interface Event {
  id: number;
  time: number;
  text: string;
  tone: "info" | "success" | "warning";
}
export interface Shift {
  version: 2;
  time: number;
  paused: boolean;
  speed: 1 | 2 | 4;
  score: number;
  conflicts: number;
  flights: Flight[];
  stands: Stand[];
  services: Service[];
  vehicles: Vehicle[];
  supplyVehicles: SupplyVehicle[];
  warehouse: WarehouseState;
  initialStock: Record<MaterialKind, number>;
  standCache: Record<string, Record<MaterialKind, number>>;
  consumed: Record<MaterialKind, number>;
  holding: HoldingBatch[];
  events: Event[];
  selectedFlightId: string;
  selectedStandId?: string;
  selectedVehicleId?: string;
  nextEventId: number;
  nextBatchId: number;
}
export type CommandResult = (state: Shift) => Shift;
