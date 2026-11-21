import type { Shift, ServiceKind } from "../../../shared/types";
import { serviceCatalog } from "../model/catalog";
import { cacheAt } from "../../materials/model/ledger";
export function serviceBlockReason(
  s: Shift,
  flightId: string,
  kind: ServiceKind,
): string | undefined {
  const f = s.flights.find((x) => x.id === flightId),
    task = s.services.find((x) => x.flightId === flightId && x.kind === kind);
  if (!f || f.status !== "parked") return "请先分配机位";
  if (!task || task.status !== "pending") return "任务已派遣";
  if (
    serviceCatalog[kind].requires.some(
      (k) =>
        !s.services.some(
          (t) => t.flightId === flightId && t.kind === k && t.status === "done",
        ),
    )
  )
    return "等待行李装卸完成";
  const active = s.services.filter(
    (t) =>
      t.flightId === flightId &&
      (t.status === "travel" ||
        t.status === "working" ||
        t.status === "waiting"),
  ).length;
  if (active >= 2) return "机位的两个服务位均已占用";
  if (!f.standId) return "请先分配机位";
  // 只要有任意物资实际到场即可开工；不足部分会在耗尽后进入等待续供
  if (cacheAt(s, f.standId, kind) <= 0)
    return "物资尚未到场：请先安排补给并等待卸货";
  return undefined;
}
