import type { ServiceKind, Shift } from "../shared/types";
import { clockLabel } from "../shared/document";
import { flightReady, departFlight, statusLabels } from "../features/flights";
import { StandPicker } from "../features/apron";
import { ServicePanel } from "../features/services";
import { EventLog } from "../features/session";
export function Inspector({
  state,
  onChange,
  onStand,
  onAssign,
  onDispatch,
}: {
  state: Shift;
  onChange: (s: Shift) => void;
  onStand: (id: string) => void;
  onAssign: (id: string) => void;
  onDispatch: (k: ServiceKind, v: string) => void;
}) {
  const f = state.flights.find((x) => x.id === state.selectedFlightId)!;
  return (
    <aside className="inspector">
      <div className="inspector-heading">
        <span className="eyebrow">TURNAROUND CONTROL</span>
        <span className="dot-menu">•••</span>
      </div>
      <div className="selected-flight">
        <span className="airline-mark" style={{ background: f.color }}>
          ✈
        </span>
        <div>
          <h2>{f.id}</h2>
          <p>
            {f.airline} · {f.aircraft}
          </p>
        </div>
        <span className="flight-chip">{f.standId ?? "待分配"}</span>
      </div>
      <div className="route-detail">
        <strong>{f.from.split(" · ")[1]}</strong>
        <span>──────── ✈ ────────</span>
        <strong>{f.destination.split(" · ")[1]}</strong>
      </div>
      <div className="departure-info">
        <span>
          计划离港 <b>{clockLabel(f.deadline)}</b>
        </span>
        <span className={state.time > f.deadline ? "warning-text" : ""}>
          {statusLabels[f.status]}
        </span>
      </div>
      <StandPicker state={state} onAssign={onAssign} onSelect={onStand} />
      {f.status !== "incoming" && f.status !== "scheduled" && (
        <div className="stand-occupancy">
          <span>机位 {f.standId} · 服务位</span>
          <b>
            {
              state.services.filter(
                (t) =>
                  t.flightId === f.id &&
                  (t.status === "travel" || t.status === "working"),
              ).length
            }{" "}
            / 2 占用
          </b>
        </div>
      )}
      <ServicePanel state={state} onDispatch={onDispatch} />
      <button
        className="primary depart-button"
        data-testid="depart"
        disabled={!flightReady(state, f.id) || f.status !== "parked"}
        onClick={() => onChange(departFlight(state, f.id))}
      >
        {f.status === "departed"
          ? "已完成离港"
          : f.status === "departing"
            ? "飞机正在推出…"
            : "批准推出离港"}{" "}
        <span>→</span>
      </button>
      <EventLog state={state} />
    </aside>
  );
}
