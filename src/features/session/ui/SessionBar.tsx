import {
  Pause,
  Play,
  FastForward,
  Save,
  FolderOpen,
  RotateCcw,
  Plane,
} from "lucide-react";
import type { Shift } from "../../../shared/types";
import { clockLabel } from "../../../shared/document";
export function SessionBar({
  state,
  onPause,
  onSpeed,
  onSave,
  onLoad,
  onReset,
}: {
  state: Shift;
  onPause: () => void;
  onSpeed: () => void;
  onSave: () => void;
  onLoad: () => void;
  onReset: () => void;
}) {
  return (
    <header className="session-bar">
      <div className="brand">
        <div className="brand-icon">
          <Plane size={25} />
        </div>
        <div>
          <strong>
            APRON <b>07</b>
          </strong>
          <span>机场地勤指挥 / GROUND CONTROL</span>
        </div>
      </div>
      <div className="shift-title">
        <span className="live-dot" />
        早班值守<span>SHIFT 01 · EAST FIELD</span>
      </div>
      <div className="clock">
        <span>LOCAL TIME</span>
        <strong>
          {clockLabel(state.time)}
          <small>:{String(Math.floor(state.time % 60)).padStart(2, "0")}</small>
        </strong>
      </div>
      <div className="time-buttons">
        <button
          aria-label={state.paused ? "继续" : "暂停"}
          data-testid="pause"
          onClick={onPause}
        >
          {state.paused ? <Play size={17} /> : <Pause size={17} />}
        </button>
        <button onClick={onSpeed} data-testid="speed" title="切换模拟速度">
          <FastForward size={15} />
          {state.speed}×
        </button>
      </div>
      <div className="file-buttons">
        <button onClick={onSave} title="保存班次" aria-label="保存班次">
          <Save size={17} />
        </button>
        <button onClick={onLoad} title="读取存档" aria-label="读取存档">
          <FolderOpen size={17} />
        </button>
        <button onClick={onReset} title="新班次" aria-label="新班次">
          <RotateCcw size={17} />
        </button>
      </div>
    </header>
  );
}
