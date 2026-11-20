import type { Shift } from "../../../shared/types";
import { clockLabel } from "../../../shared/document";
import { statusLabels, turnaroundProgress } from "../lib/readiness";
interface Props {
  state: Shift;
  onSelect: (id: string) => void;
}
export function FlightBoard({ state, onSelect }: Props) {
  return (
    <section className="flight-board">
      <div className="section-heading">
        <div>
          <span className="eyebrow">FLIGHT STRIPS</span>
          <h2>航班进程</h2>
        </div>
        <span className="count">
          {state.flights.filter((f) => f.status !== "departed").length} ACTIVE
        </span>
      </div>
      <div className="board-tabs">
        <span className="active">全部航班</span>
        <span>进港 / 离港</span>
        <b>06</b>
      </div>
      <div className="flight-list">
        {state.flights.map((f) => (
          <button
            key={f.id}
            className={`flight-card ${f.id === state.selectedFlightId ? "selected" : ""} ${f.status === "departed" ? "completed" : ""}`}
            onClick={() => onSelect(f.id)}
            data-testid={`flight-${f.id}`}
          >
            <div className="flight-top">
              <span className="airline-mark" style={{ background: f.color }}>
                ✈
              </span>
              <strong>{f.id}</strong>
              <span className={`status ${f.status}`}>
                {statusLabels[f.status]}
              </span>
            </div>
            <div className="flight-route">
              {f.from}
              <span>→</span>
              {f.destination.split(" · ")[0]}
            </div>
            <div className="flight-meta">
              <span>
                {f.aircraft} · {f.passengers} PAX
              </span>
              <span>
                {f.standId ?? "—"} <i /> {clockLabel(f.deadline)}
              </span>
            </div>
            {f.status === "parked" && (
              <div className="mini-track">
                <i style={{ width: `${turnaroundProgress(state, f.id)}%` }} />
              </div>
            )}
          </button>
        ))}
      </div>
      <div className="shift-note">
        <span>☀</span>
        <div>
          <strong>早高峰，保持节奏。</strong>
          <p>为每一架飞机，安排恰好的下一步。</p>
        </div>
      </div>
    </section>
  );
}
