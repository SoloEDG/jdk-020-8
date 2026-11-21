import type { ServiceKind, Shift } from "../../../shared/types";
import { serviceCatalog } from "../model/catalog";
import { serviceBlockReason } from "../lib/eligibility";
import {
  materialCatalog,
  cacheAt,
  remainingNeed,
} from "../../materials/index";
import { cancelService } from "../model/progress";

const statusText: Record<string, string> = {
  pending: "待派遣",
  travel: "车辆前往中",
  working: "作业中",
  waiting: "等待续供",
  done: "已完成 ✓",
};

export function ServicePanel({
  state,
  onDispatch,
  onChange,
}: {
  state: Shift;
  onDispatch: (kind: ServiceKind, vehicleId: string) => void;
  onChange: (s: Shift) => void;
}) {
  const tasks = state.services.filter(
    (t) => t.flightId === state.selectedFlightId,
  );
  const flight = state.flights.find((f) => f.id === state.selectedFlightId);
  return (
    <div className="service-panel">
      <div className="subheading">
        <h3>地勤保障</h3>
        <span>GROUND SERVICES</span>
      </div>
      {tasks.map((t, i) => {
        const info = serviceCatalog[t.kind],
          reason = serviceBlockReason(state, t.flightId, t.kind),
          available = state.vehicles.filter(
            (v) => v.kind === t.kind && v.status === "idle",
          );
        const selected =
          state.vehicles.find((v) => v.id === state.selectedVehicleId) ??
          available[0];
        const spec = materialCatalog[t.kind];
        const onSite = flight?.standId
          ? cacheAt(state, flight.standId, t.kind)
          : 0;
        const need = remainingNeed(state, t);
        const short = t.status === "pending" && onSite < need;
        return (
          <div className={`service-task ${t.status}`} key={t.id}>
            <div className="service-icon">
              {t.kind === "fuel" ? "◈" : t.kind === "baggage" ? "▤" : "✧"}
            </div>
            <div className="service-content">
              <div className="service-title">
                <strong>{info.label}</strong>
                <span>
                  {t.status === "done"
                    ? "已完成 ✓"
                    : t.status === "working"
                      ? `${Math.floor(t.progress)}%`
                      : statusText[t.status] ?? `0${i + 1}`}
                </span>
              </div>
              <div className="service-detail">
                {t.status === "pending" ? (
                  reason ??
                  `${selected?.id ?? "暂无空闲车辆"} · ${Math.round(t.duration)}s`
                ) : (
                  <>
                    {t.vehicleId + " · " + info.english}
                  </>
                )}
              </div>
              <div
                className={`material-line ${short || t.status === "waiting" ? "short" : ""}`}
                data-testid={`material-line-${t.kind}`}
              >
                {spec.icon} 需求 {need} {spec.unit} · 现场 {onSite} · 已耗{" "}
                {Math.round(t.consumed)}
                {t.status === "waiting" && <em>（占用服务位，等待续供）</em>}
                {short && <em>（先在右侧安排补给）</em>}
              </div>
              {(t.status === "working" ||
                t.status === "done" ||
                t.status === "waiting") && (
                <div className="task-track">
                  <i style={{ width: `${t.progress}%` }} />
                </div>
              )}
            </div>
            {t.status === "pending" && (
              <button
                className="dispatch"
                data-testid={`start-service-${t.kind}`}
                disabled={!!reason || !selected}
                title={reason ?? info.description}
                onClick={() => selected && onDispatch(t.kind, selected.id)}
              >
                派遣 ↗
              </button>
            )}
            {(t.status === "travel" ||
              t.status === "working" ||
              t.status === "waiting") && (
              <button
                className="dispatch cancel"
                data-testid={`cancel-service-${t.kind}`}
                title="未使用物资随车回滞留区核验，不会直接加回仓库"
                onClick={() => onChange(cancelService(state, t.id))}
              >
                取消
              </button>
            )}
          </div>
        );
      })}
      <p className="dependency-note">
        ↳ 先完成行李装卸，再进行客舱清洁。燃油可同步保障；物资须先卸到机位才能作业。
      </p>
    </div>
  );
}
