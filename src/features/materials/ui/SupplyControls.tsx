import { useMemo, useState } from "react";
import type { LoadMode, Shift } from "../../../shared/types";
import {
  materialCatalog,
  materialKinds,
  dispatchSupply,
  recallSupply,
  supplyLabels,
  depotPoint,
  forecastFor,
} from "../index";
import { tripSeconds } from "../../fleet/lib/routing";
import { unloadSeconds } from "../model/catalog";

const BULK_MIN_RATIO = 0.4;

export function SupplyControls({
  state,
  onChange,
}: {
  state: Shift;
  onChange: (s: Shift) => void;
}) {
  const [kind, setKind] = useState<(typeof materialKinds)[number]>("fuel");
  const [standId, setStandId] = useState<string>(
    state.selectedStandId ?? state.stands[0].id,
  );
  const [qty, setQty] = useState<number>(materialCatalog[kind].capacity);
  const [mode, setMode] = useState<LoadMode>("bulk");

  const sv = state.supplyVehicles.find((x) => x.kind === kind)!;
  const spec = materialCatalog[kind];
  const free = state.warehouse.stock[kind] - state.warehouse.reserved[kind];
  const stand = state.stands.find((x) => x.id === standId);
  const eta = useMemo(() => {
    if (!stand) return 0;
    const travel = tripSeconds(depotPoint, {
      x: stand.x + 66,
      y: stand.y + 40,
    });
    const handling = unloadSeconds(kind, qty);
    return Math.round(travel + handling);
  }, [stand, kind, qty]);
  const forecast = forecastFor(state, kind);

  const switchKind = (k: typeof kind) => {
    setKind(k);
    setQty(materialCatalog[k].capacity);
  };

  return (
    <section className="supply-panel">
      <div className="section-heading">
        <div>
          <span className="eyebrow">REPLENISHMENT ROUTING</span>
          <h2>
            补给路线
            <small>集中补货减少空跑 · 少量急送保住航班</small>
          </h2>
        </div>
      </div>
      <div className="supply-kind-tabs">
        {materialKinds.map((k) => {
          const vehicle = state.supplyVehicles.find((x) => x.kind === k)!;
          return (
            <button
              key={k}
              className={kind === k ? "chosen" : ""}
              onClick={() => switchKind(k)}
              data-testid={`supply-tab-${k}`}
            >
              <span style={{ color: materialCatalog[k].color }}>
                {materialCatalog[k].icon}
              </span>
              {materialCatalog[k].label}
              <em className={vehicle.status === "idle" ? "idle" : ""}>
                {supplyLabels[vehicle.status]}
              </em>
            </button>
          );
        })}
      </div>

      <div className="supply-form">
        <label className="supply-field">
          <span>送达机位（远机位同样安排路线）</span>
          <select
            value={standId}
            onChange={(e) => setStandId(e.target.value)}
            data-testid="supply-stand"
          >
            {state.stands.map((st) => (
              <option key={st.id} value={st.id}>
                {st.id} · {st.terminal}
              </option>
            ))}
          </select>
        </label>
        <label className="supply-field">
          <span>
            数量（{spec.unit}）· 车容 {spec.capacity} · 自由库存 {free}
          </span>
          <input
            type="number"
            min={1}
            max={Math.min(spec.capacity, free)}
            value={qty}
            data-testid="supply-qty"
            onChange={(e) => setQty(Number(e.target.value))}
          />
        </label>
        <div className="supply-modes">
          <button
            className={mode === "bulk" ? "chosen" : ""}
            onClick={() => setMode("bulk")}
            title={`单次不少于容量 ${Math.round(BULK_MIN_RATIO * 100)}%，无额外成本`}
          >
            集中补货
            <small>≥ {Math.ceil(spec.capacity * BULK_MIN_RATIO)} {spec.unit}</small>
          </button>
          <button
            className={mode === "express" ? "chosen" : ""}
            onClick={() => setMode("express")}
            title="小批量优先发运，计急送成本 -5 分"
          >
            少量急送
            <small>即时发运 · -5 分</small>
          </button>
        </div>
        <div className="supply-eta">
          预计路上+卸货 <b>{eta}s</b> · 装车另计{" "}
          {Math.round(Math.max(spec.minHandling, qty * spec.loadPerUnit))}s
          {forecast.stockout && (
            <em> 当前断供风险：{forecast.affected.join("、")}</em>
          )}
        </div>
        <div className="supply-actions">
          <button
            className="primary"
            data-testid="dispatch-supply"
            disabled={sv.status !== "idle"}
            onClick={() =>
              onChange(dispatchSupply(state, sv.id, standId, qty, mode))
            }
          >
            {sv.status === "idle" ? "预约并装车 ↗" : `${sv.id} 任务中`}
          </button>
          <button
            className="secondary"
            data-testid="recall-supply"
            disabled={sv.status === "idle" || sv.status === "returning" || !!sv.recall}
            onClick={() => onChange(recallSupply(state, sv.id))}
          >
            途中召回
          </button>
        </div>
      </div>

      <div className="supply-fleet">
        {state.supplyVehicles.map((v) => (
          <div className={`supply-row ${v.status}`} key={v.id}>
            <span style={{ color: materialCatalog[v.kind].color }}>
              {materialCatalog[v.kind].icon}
            </span>
            <strong>{v.id}</strong>
            <span className="supply-row-status">{supplyLabels[v.status]}</span>
            <b>
              {v.cargo}
              <small> {materialCatalog[v.kind].unit}</small>
            </b>
            {v.targetStandId && <em>→ {v.targetStandId}</em>}
            {v.recall && <em className="recall-tag">召回中</em>}
          </div>
        ))}
      </div>
    </section>
  );
}
