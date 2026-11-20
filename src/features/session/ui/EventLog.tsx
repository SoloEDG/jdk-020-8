import type { Shift } from "../../../shared/types";
import { clockLabel } from "../../../shared/document";
export function EventLog({ state }: { state: Shift }) {
  return (
    <div className="event-log">
      <div className="subheading">
        <h3>塔台动态</h3>
        <span>LIVE COMMS</span>
      </div>
      {state.events.slice(0, 3).map((e) => (
        <div className={`event ${e.tone}`} key={e.id}>
          <span>{clockLabel(e.time)}</span>
          <p>{e.text}</p>
        </div>
      ))}
    </div>
  );
}
