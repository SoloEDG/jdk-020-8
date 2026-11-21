import type { Shift } from "../../../shared/types";
import { initialFlights } from "../../flights";
import { initialStands } from "../../apron";
import { initialServices } from "../../services";
import { initialVehicles } from "../../fleet";
import {
  initialSupplyVehicles,
  initialWarehouse,
} from "../../materials/model/depot";
import { materialCatalog, materialKinds } from "../../materials/model/catalog";
import { emptyMaterialRow } from "../../materials/model/ledger";

export function createShift(): Shift {
  const flights = initialFlights();
  const initialStock = emptyMaterialRow();
  for (const k of materialKinds) initialStock[k] = materialCatalog[k].initialStock;
  return {
    version: 2,
    time: 0,
    paused: false,
    speed: 1,
    score: 0,
    conflicts: 0,
    flights,
    stands: initialStands(),
    services: initialServices(flights),
    vehicles: initialVehicles(),
    supplyVehicles: initialSupplyVehicles(),
    warehouse: initialWarehouse(),
    initialStock,
    standCache: {},
    consumed: emptyMaterialRow(),
    holding: [],
    events: [
      {
        id: 0,
        time: 0,
        text: "早班开始 · 3 架航班等待机位分配，物资请先预约补给",
        tone: "info",
      },
    ],
    selectedFlightId: "MU2451",
    nextEventId: 1,
    nextBatchId: 1,
  };
}
