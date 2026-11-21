import { useEffect, useState } from "react";
import type { Shift } from "../shared/types";
import { advanceClock, createShift } from "../features/session";
import { advanceFleet } from "../features/fleet";
import { advanceServices } from "../features/services";
import { advanceSupply } from "../features/materials/model/advanceSupply";
export function useSimulation() {
  const [state, setState] = useState<Shift>(createShift);
  useEffect(() => {
    let previous = performance.now();
    const id = setInterval(() => {
      const now = performance.now(),
        elapsed = Math.min((now - previous) / 1000, 1);
      previous = now;
      setState((s) => {
        if (s.paused) return s;
        const dt = elapsed * s.speed;
        const timed = advanceClock(s, dt);
        return advanceServices(
          advanceFleet(advanceSupply(timed, dt), dt),
          dt,
        );
      });
    }, 100);
    return () => clearInterval(id);
  }, []);
  return [state, setState] as const;
}
