import type { Stand } from "../../../shared/types";
export function initialStands(): Stand[] {
  return [
    { id: "A01", size: "narrow", x: 220, y: 250, terminal: "T1" },
    { id: "A02", size: "narrow", x: 420, y: 250, terminal: "T1" },
    { id: "A03", size: "wide", x: 650, y: 250, terminal: "T1" },
    { id: "B01", size: "narrow", x: 220, y: 495, terminal: "远机位" },
    { id: "B02", size: "narrow", x: 420, y: 495, terminal: "远机位" },
    { id: "B03", size: "wide", x: 650, y: 495, terminal: "远机位" },
  ];
}
