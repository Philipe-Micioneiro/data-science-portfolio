"use client";

/**
 * LineChart — gráfico de linha em SVG puro.
 * Sem Recharts, sem Chart.js.
 * Replicado de ui.jsx → LineChart.
 * Props adaptadas para Next.js TypeScript.
 */

interface DataPoint {
  /** Label do eixo X (ex: "Jan", "Fev") */
  label: string;
  value: number;
}

interface LineChartProps {
  data: DataPoint[];
  color?: string;
  fill?: string;
  height?: number;
  /** Formata os valores dos ticks do eixo Y */
  valueFmt?: (v: number) => string;
}

export default function LineChart({
  data,
  height = 200,
  color = "var(--blue)",
  fill = "rgba(37,99,235,.10)",
  valueFmt = (v) => String(v),
}: LineChartProps) {
  if (!data || data.length === 0) return null;

  const w = 640;
  const h = height;
  const pad = { t: 16, r: 12, b: 26, l: 44 };

  const xs = data.map((d) => d.value);
  const rawMax = Math.max(...xs);
  const rawMin = Math.min(...xs);
  const max = rawMax * 1.1;
  const min = rawMin * 0.85;

  const iw = w - pad.l - pad.r;
  const ih = h - pad.t - pad.b;

  const X = (i: number) =>
    data.length === 1
      ? pad.l + iw / 2
      : pad.l + (i / (data.length - 1)) * iw;

  const Y = (v: number) =>
    pad.t + ih - ((v - min) / (max - min || 1)) * ih;

  const pts = data.map((d, i) => [X(i), Y(d.value)] as [number, number]);

  const line = pts
    .map((p, i) => (i ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1))
    .join(" ");

  const area =
    line +
    ` L ${X(data.length - 1).toFixed(1)} ${(pad.t + ih).toFixed(1)} L ${pad.l} ${(pad.t + ih).toFixed(1)} Z`;

  const ticks = 4;

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      style={{ width: "100%", height }}
      preserveAspectRatio="none"
    >
      {Array.from({ length: ticks + 1 }).map((_, i) => {
        const v = min + (i / ticks) * (max - min);
        const y = Y(v);
        return (
          <g key={i}>
            <line
              x1={pad.l}
              y1={y}
              x2={w - pad.r}
              y2={y}
              stroke="var(--line)"
              strokeWidth="1"
            />
            <text
              x={pad.l - 8}
              y={y + 3.5}
              textAnchor="end"
              fontSize="10.5"
              fill="var(--muted-2)"
            >
              {valueFmt(Math.round(v))}
            </text>
          </g>
        );
      })}
      <path d={area} fill={fill} />
      <path
        d={line}
        fill="none"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {pts.map((p, i) => (
        <circle
          key={i}
          cx={p[0]}
          cy={p[1]}
          r="3"
          fill="#fff"
          stroke={color}
          strokeWidth="2"
        />
      ))}
      {data.map((d, i) => (
        <text
          key={i}
          x={X(i)}
          y={h - 7}
          textAnchor="middle"
          fontSize="10.5"
          fill="var(--muted-2)"
        >
          {d.label}
        </text>
      ))}
    </svg>
  );
}
