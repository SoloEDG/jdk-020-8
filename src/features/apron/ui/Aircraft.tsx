interface Props {
  x: number;
  y: number;
  color: string;
  wide?: boolean;
  departing?: boolean;
}
export function Aircraft({ x, y, color, wide, departing }: Props) {
  return (
    <g
      transform={`translate(${x} ${y})`}
      className={departing ? "plane-departing" : "plane-arriving"}
    >
      <g transform={`scale(${wide ? 1.05 : 0.85})`}>
        <ellipse cx="5" cy="5" rx="34" ry="55" fill="#132b34" opacity=".12" />
        <path
          d="M0 -67 C-8 -63 -10 -47 -10 -21 L-65 10 L-65 20 L-10 6 L-8 44 L-26 57 L-26 63 L0 55 L26 63 L26 57 L8 44 L10 6 L65 20 L65 10 L10 -21 C10 -47 8 -63 0 -67Z"
          fill="#fafaf5"
          stroke="#819197"
          strokeWidth="1.3"
        />
        <path d="M-7 26 L7 26 L6 50 L0 55 L-6 50Z" fill={color} />
        <path d="M-5 -49 Q0 -54 5 -49 L6 -40 L-6 -40Z" fill="#436271" />
        <path d="M0 -34 V24" stroke="#d5dbd7" />
        <path
          d="M-26 -7 L-26 13 M26 -7 L26 13"
          stroke="#adbab9"
          strokeWidth="7"
          strokeLinecap="round"
        />
        <path
          d="M-4 -25 V13 M4 -25 V13"
          stroke="#c5cdcc"
          strokeDasharray="2 4"
        />
      </g>
    </g>
  );
}
