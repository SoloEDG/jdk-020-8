import type { Shift } from "../../../shared/types";
import { vehicleLabels, vehicleColors } from "../lib/routing";
import { materialCatalog } from "../../materials/index";
export function FleetPanel({
  state,
  onSelect,
}: {
  state: Shift;
  onSelect: (id: string) => void;
}) {
  const labels: Record<string, string> = {
    idle: "待命",
    loading: "装车中",
    travel: "前往机位",
    working: "作业中",
    waiting: "等待续供",
    returning: "返回车场",
  };
  return (
    <section className="fleet-panel">
      <div className="section-heading">
        <div>
          <span className="eyebrow">GROUND SUPPORT EQUIPMENT</span>
          <h2>
            地勤车队{" "}
            <small>
              {state.vehicles.filter((v) => v.status === "idle").length} / 6
              待命
            </small>
          </h2>
        </div>
        <span className="fleet-hint">选择车辆后派遣 · 车载数量实时显示</span>
      </div>
      <div className="fleet-grid">
        {state.vehicles.map((v) => (
          <button
            className={`fleet-card ${state.selectedVehicleId === v.id ? "chosen" : ""} ${v.status}`}
            key={v.id}
            onClick={() => onSelect(v.id)}
            data-testid={`vehicle-${v.id}`}
          >
            <span
              className="truck-icon"
              style={{ color: vehicleColors[v.kind] }}
            >
              ▰<i />
            </span>
            <div>
              <strong>{v.id}</strong>
              <span>{vehicleLabels[v.kind]}</span>
            </div>
            <em className={v.status === "idle" ? "idle" : ""}>
              <i />
              {labels[v.status]}
            </em>
            {v.cargo > 0 && (
              <b className="cargo-chip">
                {v.cargo} {materialCatalog[v.kind].unit}
              </b>
            )}
          </button>
        ))}
      </div>
    </section>
  );
}
