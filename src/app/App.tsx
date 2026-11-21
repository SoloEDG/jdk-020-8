import { useState } from "react";
import { FlightBoard, assignStand, selectFlight } from "../features/flights";
import { ApronMap, selectStand } from "../features/apron";
import { FleetPanel, selectVehicle } from "../features/fleet";
import { dispatchService } from "../features/services";
import {
  InventoryPanel,
  SupplyControls,
  HoldingPanel,
} from "../features/materials";
import {
  SessionBar,
  ScoreStrip,
  changeSpeed,
  togglePause,
  saveShift,
  loadShift,
  createShift,
} from "../features/session";
import { useSimulation } from "./useSimulation";
import { Inspector } from "./Inspector";
import "./styles.css";
export function App() {
  const [state, setState] = useSimulation(),
    [notice, setNotice] = useState(""),
    [resetOpen, setResetOpen] = useState(false);
  const notify = (text: string) => {
    setNotice(text);
    window.setTimeout(() => setNotice(""), 4000);
  };
  return (
    <div className="app-shell">
      <SessionBar
        state={state}
        onPause={() => setState(togglePause)}
        onSpeed={() => setState(changeSpeed)}
        onSave={() => {
          try {
            saveShift(state);
            notify("班次已保存到此浏览器");
          } catch {
            notify("保存失败：浏览器存储不可用");
          }
        }}
        onLoad={() => {
          const saved = loadShift();
          if (saved) {
            setState(saved);
            notify("已恢复保存的班次");
          } else notify("没有可用存档，当前班次保持不变");
        }}
        onReset={() => setResetOpen(true)}
      />
      <main>
        <div className="page-heading">
          <div>
            <span className="eyebrow">EVERY MINUTE MATTERS.</span>
            <h1>
              掌控机坪的每一分钟<span>。</span>
            </h1>
          </div>
          <div className="field-badge">
            <span className="live-dot" />
            机场运行正常 <b>SHA / ZSSS</b>
          </div>
        </div>
        <ScoreStrip state={state} />
        <div className="workspace">
          <FlightBoard
            state={state}
            onSelect={(id) => setState((s) => selectFlight(s, id))}
          />
          <div className="center-column">
            <ApronMap
              state={state}
              onStand={(id) => setState((s) => selectStand(s, id))}
              onFlight={(id) => setState((s) => selectFlight(s, id))}
            />
            <FleetPanel
              state={state}
              onSelect={(id) => setState((s) => selectVehicle(s, id))}
            />
            <InventoryPanel state={state} />
            <div className="supply-row">
              <SupplyControls state={state} onChange={setState} />
              <HoldingPanel state={state} onChange={setState} />
            </div>
          </div>
          <Inspector
            state={state}
            onChange={setState}
            onStand={(id) => setState((s) => selectStand(s, id))}
            onAssign={(id) =>
              setState((s) => assignStand(s, s.selectedFlightId, id))
            }
            onDispatch={(kind, id) =>
              setState((s) => dispatchService(s, s.selectedFlightId, kind, id))
            }
          />
        </div>
        <footer>
          <span>APRON 07 · 地面有序，天空自由。</span>
          <span>操作提示：选择航班 → 分配机位 → 派遣车辆 → 批准离港</span>
          <span>
            <i className="live-dot" />
            {state.paused ? "SIMULATION PAUSED" : "SIMULATION LIVE"}
          </span>
        </footer>
      </main>
      {notice && (
        <div className="toast" role="status">
          {notice}
        </div>
      )}
      {resetOpen && (
        <div className="modal-backdrop">
          <div className="modal">
            <span className="eyebrow">NEW SHIFT</span>
            <h2>开启新班次？</h2>
            <p>当前进度将重置。已保存的班次仍可随时读取。</p>
            <div>
              <button className="secondary" onClick={() => setResetOpen(false)}>
                继续当前班次
              </button>
              <button
                className="primary"
                onClick={() => {
                  setState(createShift());
                  setResetOpen(false);
                }}
              >
                开始新班次
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
