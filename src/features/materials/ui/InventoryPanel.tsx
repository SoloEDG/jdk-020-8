import type { Shift } from "../../../shared/types";
import { clockLabel } from "../../../shared/document";
import {
  materialCatalog,
  materialKinds,
  materialBalance,
  stockoutForecast,
} from "../index";

export function InventoryPanel({ state }: { state: Shift }) {
  const balances = materialBalance(state);
  const forecasts = stockoutForecast(state);
  return (
    <section className="inventory-panel">
      <div className="section-heading">
        <div>
          <span className="eyebrow">MATERIALS &amp; CONSIGNMENT</span>
          <h2>
            物资总账
            <small>仓库预约 ≠ 已装车 · 保障只消费到场数量</small>
          </h2>
        </div>
        <span
          className={`ledger-badge ${
            balances.every((b) => b.conserved) ? "ok" : "bad"
          }`}
          data-testid="ledger-badge"
        >
          {balances.every((b) => b.conserved)
            ? "总账守恒 ✓"
            : "账目异常 ✕"}
        </span>
      </div>
      <div className="inventory-grid">
        {materialKinds.map((kind) => {
          const spec = materialCatalog[kind];
          const b = balances.find((x) => x.kind === kind)!;
          const f = forecasts.find((x) => x.kind === kind)!;
          const free = b.warehouse - b.reserved;
          return (
            <div
              className={`material-card ${f.stockout ? "stockout" : ""}`}
              key={kind}
              data-testid={`material-${kind}`}
            >
              <div className="material-head">
                <span className="material-icon" style={{ color: spec.color }}>
                  {spec.icon}
                </span>
                <div>
                  <strong>{spec.label}</strong>
                  <span>
                    {spec.english} · 单位 {spec.unit} · 车容 {spec.capacity}
                  </span>
                </div>
                {f.stockout && <em className="stockout-flag">预计断供</em>}
              </div>
              <div className="material-main">
                <div className="stock-now">
                  <strong>
                    {free}
                    <small>
                      {" "}
                      / {b.warehouse} {spec.unit}
                    </small>
                  </strong>
                  <span>可用 / 仓库账面（预约占用 {b.reserved}）</span>
                </div>
                <div className="stock-bars">
                  {[
                    ["在途车载", b.inTransit, spec.color],
                    ["现场缓存", b.standCache, "#639b84"],
                    ["滞留待核", b.holding, "#c77b4a"],
                    ["已消耗", b.consumed, "#8a8f86"],
                  ].map(([label, val, color]) => (
                    <div className="stock-bar-row" key={label as string}>
                      <span>{label as string}</span>
                      <div className="stock-bar">
                        <i
                          style={{
                            width: `${Math.min(100, ((val as number) / Math.max(1, b.initial)) * 100)}%`,
                            background: color as string,
                          }}
                        />
                      </div>
                      <b>{val as number}</b>
                    </div>
                  ))}
                </div>
              </div>
              <div className="material-foot">
                {f.stockout ? (
                  <p className="stockout-text" data-testid={`stockout-${kind}`}>
                    最早 {f.atTime !== undefined ? clockLabel(f.atTime) : "—"}{" "}
                    断供 · 影响 {f.affected.join("、") || "—"}
                  </p>
                ) : (
                  <p className="healthy-text">
                    剩余需求 {f.need} {spec.unit} · 可动用 {f.available}，供应充足
                  </p>
                )}
                <span className="ledger-line">
                  总账 {b.total} / {b.initial} {b.conserved ? "✓" : "✕"}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
