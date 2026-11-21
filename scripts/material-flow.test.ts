import assert from "node:assert";
import { createShift } from "../src/features/session/model/shift";
import { advanceClock } from "../src/features/session/model/clock";
import { advanceSupply } from "../src/features/materials/model/advanceSupply";
import { advanceFleet } from "../src/features/fleet/model/movement";
import { advanceServices } from "../src/features/services/model/progress";
import { assignStand, departFlight } from "../src/features/flights/model/commands";
import { dispatchService } from "../src/features/services/model/dispatch";
import {
  dispatchSupply,
  recallSupply,
  verifyAllHolding,
} from "../src/features/materials/model/supplyCommands";
import { cancelService } from "../src/features/services/model/progress";
import { materialBalance, allConserved, cacheAt } from "../src/features/materials/model/ledger";
import { stockoutForecast } from "../src/features/materials/model/projection";
import { validShift } from "../src/features/session/lib/validation";
import type { Shift } from "../src/shared/types";

function tick(s: Shift, seconds = 1): Shift {
  const a = advanceClock(s, seconds);
  return advanceServices(advanceFleet(advanceSupply(a, seconds), seconds), seconds);
}
function fastForward(s: Shift, seconds: number): Shift {
  let out = s;
  for (let i = 0; i < seconds; i++) out = tick(out, 1);
  return out;
}

/** 用同型补给车多趟把某机位的某物资补足（受车容限制，必须分批跑） */
function supplyFull(
  s: Shift,
  svId: string,
  standId: string,
  need: number,
): Shift {
  const cap = s.supplyVehicles.find((v) => v.id === svId)!.capacity;
  let remaining = need;
  while (remaining > 0) {
    const qty = Math.min(cap, remaining);
    s = dispatchSupply(s, svId, standId, qty, "express");
    s = fastForward(s, 220); // 装车 + 在途 + 卸货 + 回车场
    remaining -= qty;
  }
  return s;
}

// 1. 初始状态：总账守恒，且物资全部在仓库
let s = createShift();
assert.ok(allConserved(s), "初始总账必须守恒");
assert.ok(validShift(s), "初始班次必须通过存档校验");
let fuel = materialBalance(s).find((b) => b.kind === "fuel")!;
assert.equal(fuel.warehouse, fuel.initial);
assert.equal(fuel.inTransit + fuel.standCache + fuel.consumed + fuel.holding, 0);

// 2. 预约补给：仓库扣减、预约占用，物资并未上车
s = dispatchSupply(s, "SV-F01", "B01", 2000, "bulk");
fuel = materialBalance(s).find((b) => b.kind === "fuel")!;
assert.equal(fuel.reserved, 2000, "预约量应登记为占用");
assert.equal(fuel.warehouse, fuel.initial - 2000);
const svLoading = s.supplyVehicles.find((v) => v.id === "SV-F01")!;
assert.equal(svLoading.status, "loading");
assert.equal(svLoading.cargo, 0, "装车中不应有车载物资");
assert.ok(allConserved(s), "装车预约后总账守恒");

// 3. 装车完成进入在途，再卸货到机位缓存
s = fastForward(s, 60);
let sv = s.supplyVehicles.find((v) => v.id === "SV-F01")!;
assert.ok(["travel", "unloading", "returning", "idle"].includes(sv.status));
s = fastForward(s, 60);
assert.equal(s.standCache.B01?.fuel ?? 0, 2000, "物资应卸入机位现场缓存");
sv = s.supplyVehicles.find((v) => v.id === "SV-F01")!;
assert.equal(sv.status, "idle");
fuel = materialBalance(s).find((b) => b.kind === "fuel")!;
assert.equal(fuel.reserved, 0, "卸货后预约占用应清零");
assert.equal(fuel.standCache, 2000);
assert.ok(allConserved(s));

// 4. 没有物资到场时，保障派遣被阻止
s = assignStand(s, "MU2451", "B01");
const blocked = dispatchService(s, "MU2451", "clean", "CL-01");
assert.equal(blocked.conflicts, s.conflicts + 1, "缺清洁耗材应拒绝派遣");

// 急送清洁耗材（小批量）
const cleanBefore = materialBalance(s).find((b) => b.kind === "clean")!;
s = dispatchSupply(s, "SV-C01", "B01", 10, "express");
assert.equal(s.score, -5, "急送应计成本");
s = fastForward(s, 120);
const cleanCache = s.standCache.B01.clean;
assert.ok(cleanCache >= 10, "急送耗材应到场");
const cleanAfter = materialBalance(s).find((b) => b.kind === "clean")!;
assert.ok(cleanAfter.conserved, "急送后总账守恒");
void cleanBefore;

// 5. 三种物资全部到场后完成保障，消费只来自现场缓存
for (const [kind, vid] of [
  ["fuel", "FL-01"],
  ["baggage", "BG-01"],
  ["clean", "CL-01"],
] as const) {
  if (kind !== "clean") {
    const spec = s.services.find(
      (t) => t.flightId === "MU2451" && t.kind === kind,
    )!;
    const deficit = Math.max(0, spec.demand - cacheAt(s, "B01", kind));
    s = supplyFull(
      s,
      kind === "fuel" ? "SV-F01" : "SV-B01",
      "B01",
      deficit,
    );
  }
  s = dispatchService(s, "MU2451", kind, vid);
  s = fastForward(s, 70);
}
const doneTasks = s.services.filter((t) => t.flightId === "MU2451");
assert.ok(doneTasks.every((t) => t.status === "done"), "三项保障应全部完成");
const consumedFuel = s.consumed.fuel;
assert.ok(consumedFuel > 0, "燃油应有实际消耗");
assert.ok(allConserved(s), "保障消费后总账守恒");
assert.ok(validShift(s), "运行后班次仍可通过存档校验");

// 6. 途中召回：车载物资进入滞留区，不直接回仓库
s = dispatchSupply(s, "SV-B01", "A01", 40, "bulk");
s = fastForward(s, 25); // 完成装车并行驶一段
const recalled = recallSupply(s, "SV-B01");
s = recalled;
const svB = s.supplyVehicles.find((v) => v.id === "SV-B01")!;
assert.ok(svB.recall, "补给车应标记召回");
s = fastForward(s, 60);
assert.ok(s.holding.some((h) => h.kind === "baggage" && h.quantity === 40),
  "召回物资应进入滞留区");
const bag = materialBalance(s).find((b) => b.kind === "baggage")!;
assert.equal(bag.holding, 40);
const warehouseBeforeVerify = bag.warehouse;
assert.ok(allConserved(s), "召回后总账守恒");

// 7. 核验后才能重新入库
s = verifyAllHolding(s);
const bag2 = materialBalance(s).find((b) => b.kind === "baggage")!;
assert.equal(bag2.holding, 0);
assert.equal(bag2.warehouse, warehouseBeforeVerify + 40, "核验通过才入库");
assert.ok(allConserved(s));

// 8. 断供预测：清空自由库存后应标出受影响离港
const drained: Shift = structuredClone(s);
for (const k of ["fuel", "clean", "baggage"] as const) {
  drained.warehouse.reserved[k] = 0;
  drained.warehouse.stock[k] = 0;
}
const forecasts = stockoutForecast(drained);
assert.ok(forecasts.some((f) => f.stockout && f.affected.length > 0),
  "零库存应预测断供并列出受影响航班");

// 9. 保障车途中取消：未使用物资随车回滞留区，不直接加回仓库
let c = createShift();
c = assignStand(c, "CA1833", "A01");
const bagTask = c.services.find((t) => t.flightId === "CA1833" && t.kind === "baggage")!;
c = supplyFull(c, "SV-B01", "A01", bagTask.demand);
const bagWarehouseBefore = c.warehouse.stock.baggage;
c = dispatchService(c, "CA1833", "baggage", "BG-01");
c = fastForward(c, 3); // 车辆仍在前往机位途中
const inTransitTask = c.services.find((t) => t.id === bagTask.id)!;
assert.ok(inTransitTask.status === "travel" || inTransitTask.status === "working");
c = cancelService(c, bagTask.id);
const bg01 = c.vehicles.find((v) => v.id === "BG-01")!;
assert.equal(c.services.find((t) => t.id === bagTask.id)!.status, "pending", "取消后任务回到待派遣");
assert.equal(bg01.cargo, 0, "取消后车辆清空车载");
const bagBalanceAfterCancel = materialBalance(c).find((b) => b.kind === "baggage")!;
assert.ok(bagBalanceAfterCancel.holding > 0, "取消的车载物资应进入滞留区");
assert.equal(
  c.warehouse.stock.baggage,
  bagWarehouseBefore,
  "取消不得把物资直接加回仓库",
);
assert.ok(allConserved(c), "保障车取消后总账守恒");

// 10. 部分供给 → 等待续供 → 续供恢复
let w = createShift();
w = assignStand(w, "CZ3088", "A03");
const fuelTask = w.services.find((t) => t.flightId === "CZ3088" && t.kind === "fuel")!;
// 只送一半需求
w = dispatchSupply(w, "SV-F01", "A03", Math.floor(fuelTask.demand / 2), "express");
w = fastForward(w, 150);
w = dispatchService(w, "CZ3088", "fuel", "FL-01");
w = fastForward(w, 120);
const waitingTask = w.services.find((t) => t.id === fuelTask.id)!;
assert.equal(waitingTask.status, "waiting", "物资耗尽应进入等待续供");
const waitingVehicle = w.vehicles.find((v) => v.id === "FL-01")!;
assert.equal(waitingVehicle.status, "waiting", "车辆应在现场占位等待");
// 续供剩余部分
const remaining = fuelTask.demand - waitingTask.consumed;
w = dispatchSupply(w, "SV-F01", "A03", Math.ceil(remaining), "express");
w = fastForward(w, 200);
const resumed = w.services.find((t) => t.id === fuelTask.id)!;
assert.equal(resumed.status, "done", "续供到位后应自动恢复并完成");
assert.ok(allConserved(w), "等待续供全流程总账守恒");
assert.ok(validShift(w), "等待续供班次通过存档校验");

// 11. 批准离港与存档守恒
w = departFlight(w, "CZ3088");
assert.ok(validShift(w), "离港后存档仍有效");
const json = JSON.stringify(w);
const restored = JSON.parse(json);
assert.ok(validShift(restored), "保存/恢复后必须通过守恒校验");
assert.ok(allConserved(restored as Shift), "恢复后总账仍守恒");

console.log("全部材料补给集成测试通过 ✓");
