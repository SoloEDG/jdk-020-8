import type { Shift } from "../../../shared/types";
import { clockLabel } from "../../../shared/document";
import { materialCatalog, verifyAllHolding, verifyHolding } from "../index";

export function HoldingPanel({
  state,
  onChange,
}: {
  state: Shift;
  onChange: (s: Shift) => void;
}) {
  return (
    <section className="holding-panel">
      <div className="section-heading">
        <div>
          <span className="eyebrow">QUARANTINE &amp; RECONCILIATION</span>
          <h2>
            滞留核验区
            <small>改派/取消带回物资 · 核验前不得直接加回仓库</small>
          </h2>
        </div>
        {state.holding.length > 0 && (
          <button
            className="secondary small"
            data-testid="verify-all"
            onClick={() => onChange(verifyAllHolding(state))}
          >
            全部核验入库
          </button>
        )}
      </div>
      {state.holding.length === 0 ? (
        <p className="holding-empty">暂无滞留批次，账目清晰。</p>
      ) : (
        <div className="holding-list">
          {state.holding.map((h) => (
            <div className="holding-row" key={h.id} data-testid={`holding-${h.id}`}>
              <span className="holding-id">{h.id}</span>
              <span style={{ color: materialCatalog[h.kind].color }}>
                {materialCatalog[h.kind].icon}
              </span>
              <strong>
                {h.quantity}
                <small> {materialCatalog[h.kind].unit} {materialCatalog[h.kind].label}</small>
              </strong>
              <em>
                {h.source === "recall" ? "车辆带回" : "现场退回"} ·{" "}
                {clockLabel(h.receivedAt)}
              </em>
              <button
                className="primary small"
                onClick={() => onChange(verifyHolding(state, h.id))}
              >
                核验入库
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
