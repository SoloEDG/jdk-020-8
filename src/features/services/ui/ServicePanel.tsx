import type { ServiceKind, Shift } from "../../../shared/types";
import { serviceCatalog } from "../model/catalog";
import { serviceBlockReason } from "../lib/eligibility";
export function ServicePanel({
  state,
  onDispatch,
}: {
  state: Shift;
  onDispatch: (kind: ServiceKind, vehicleId: string) => void;
}) {
  const tasks = state.services.filter(
    (t) => t.flightId === state.selectedFlightId,
  );
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
                      : t.status === "travel"
                        ? "车辆前往中"
                        : `0${i + 1}`}
                </span>
              </div>
              <div className="service-detail">
                {t.status === "pending"
                  ? (reason ??
                    `${selected?.id ?? "暂无空闲车辆"} · ${Math.round(t.duration)}s`)
                  : t.vehicleId + " · " + info.english}
              </div>
              {(t.status === "working" || t.status === "done") && (
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
          </div>
        );
      })}
      <p className="dependency-note">
        ↳ 先完成行李装卸，再进行客舱清洁。燃油可同步保障。
      </p>
    </div>
  );
}
