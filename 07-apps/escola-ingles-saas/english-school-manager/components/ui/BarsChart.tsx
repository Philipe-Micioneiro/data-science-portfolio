"use client";

/**
 * BarsChart — gráfico de barras em SVG puro.
 * Sem Recharts, sem Chart.js.
 * Suporta modo simples (valor único) e dual (prevista + recebida).
 * Replicado de ui.jsx → BarsChart.
 */

interface DataPointSingle {
  label: string;
  value: number;
  value2?: undefined;
  prevista?: undefined;
  recebida?: undefined;
}

interface DataPointDual {
  label: string;
  prevista: number;
  recebida: number;
  value?: undefined;
  value2?: undefined;
}

type DataPoint = DataPointSingle | DataPointDual;

interface BarsChartProps {
  data: DataPoint[];
  height?: number;
  valueFmt?: (v: number) => string;
}

export default function BarsChart({
  data,
  height = 200,
  valueFmt = (v) => String(v),
}: BarsChartProps) {
  if (!data || data.length === 0) return null;

  const w = 640;
  const h = height;
  const pad = { t: 16, r: 12, b: 26, l: 48 };

  const dual = data[0].recebida != null;

  const max =
    Math.max(
      ...data.map((d) =>
        dual
          ? Math.max((d as DataPointDual).prevista || 0, (d as DataPointDual).recebida || 0)
          : (d as DataPointSingle).value || 0
      )
    ) * 1.1;

  const iw = w - pad.l - pad.r;
  const ih = h - pad.t - pad.b;
  const step = iw / data.length;
  const bw = dual ? step * 0.28 : step * 0.46;

  const Y = (v: number) => pad.t + ih - (v / (max || 1)) * ih;

  const ticks = 4;

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      style={{ width: "100%", height }}
      preserveAspectRatio="none"
    >
      {Array.from({ length: ticks + 1 }).map((_, i) => {
        const v = (i / ticks) * max;
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

      {data.map((d, i) => {
        const cx = pad.l + step * i + step / 2;

        if (dual) {
          const dd = d as DataPointDual;
          const yP = Y(dd.prevista);
          const yR = Y(dd.recebida);
          const barH_P = pad.t + ih - yP;
          const barH_R = pad.t + ih - yR;
          return (
            <g key={i}>
              <rect
                x={cx - bw - 2}
                y={yP}
                width={bw}
                height={barH_P}
                rx="3"
                fill="var(--blue-100)"
              />
              <rect
                x={cx + 2}
                y={yR}
                width={bw}
                height={barH_R}
                rx="3"
                fill="var(--blue)"
              />
              <text
                x={cx}
                y={h - 7}
                textAnchor="middle"
                fontSize="10.5"
                fill="var(--muted-2)"
              >
                {d.label}
              </text>
            </g>
          );
        }

        const sd = d as DataPointSingle;
        const yV = Y(sd.value);
        const barH = pad.t + ih - yV;
        return (
          <g key={i}>
            <rect
              x={cx - bw}
              y={yV}
              width={bw * 2}
              height={barH}
              rx="3"
              fill="var(--red)"
              opacity="0.85"
            />
            <text
              x={cx}
              y={h - 7}
              textAnchor="middle"
              fontSize="10.5"
              fill="var(--muted-2)"
            >
              {d.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
