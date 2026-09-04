/* Lightweight SVG charts for the admin Overview.
   Colors come from CSS variables (--chart-1 … --chart-6) defined in index.css
   so the palette can be restyled without touching these components. */

const CHART_VARS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--chart-6)",
];

/** Donut / pie breakdown. items: [{ label, value, color? }] */
export function DonutChart({ items = [], size = 200, thickness = 28, emptyLabel = "No data" }) {
  const total = items.reduce((sum, item) => sum + (Number(item.value) || 0), 0);
  const radius = (size - thickness) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * radius;

  if (total <= 0) {
    return (
      <div className="adm-chart-empty" style={{ minHeight: size }}>
        {emptyLabel}
      </div>
    );
  }

  let offset = 0;
  const slices = items.map((item, index) => {
    const value = Number(item.value) || 0;
    const length = (value / total) * circumference;
    const slice = {
      ...item,
      value,
      color: item.color || CHART_VARS[index % CHART_VARS.length],
      dash: `${length} ${circumference - length}`,
      offset,
      pct: Math.round((value / total) * 100),
    };
    offset += length;
    return slice;
  });

  return (
    <div className="adm-donut">
      <svg
        className="adm-donut-svg"
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        role="img"
        aria-label="Distribution chart"
      >
        <circle
          cx={cx}
          cy={cy}
          r={radius}
          fill="none"
          stroke="var(--chart-track)"
          strokeWidth={thickness}
        />
        {slices.map((slice) =>
          slice.value <= 0 ? null : (
            <circle
              key={slice.label}
              cx={cx}
              cy={cy}
              r={radius}
              fill="none"
              stroke={slice.color}
              strokeWidth={thickness}
              strokeDasharray={slice.dash}
              strokeDashoffset={-slice.offset}
              strokeLinecap="butt"
              transform={`rotate(-90 ${cx} ${cy})`}
            />
          )
        )}
        <text
          x={cx}
          y={cy - 6}
          textAnchor="middle"
          className="adm-donut-total"
        >
          {total}
        </text>
        <text
          x={cx}
          y={cy + 14}
          textAnchor="middle"
          className="adm-donut-total-label"
        >
          total
        </text>
      </svg>
      <ul className="adm-chart-legend">
        {slices.map((slice) => (
          <li key={slice.label}>
            <span className="adm-chart-swatch" style={{ background: slice.color }} />
            <span className="adm-chart-legend-label">{slice.label}</span>
            <span className="adm-chart-legend-value">
              {slice.value}
              <span className="adm-chart-legend-pct"> ({slice.pct}%)</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Vertical bar chart. items: [{ label, value, color? }] */
export function BarChart({ items = [], height = 220, emptyLabel = "No data" }) {
  const max = Math.max(0, ...items.map((item) => Number(item.value) || 0));

  if (!items.length || max <= 0) {
    return (
      <div className="adm-chart-empty" style={{ minHeight: height }}>
        {emptyLabel}
      </div>
    );
  }

  return (
    <div className="adm-bars" style={{ minHeight: height }}>
      {items.map((item, index) => {
        const value = Number(item.value) || 0;
        const pct = max ? (value / max) * 100 : 0;
        const color = item.color || CHART_VARS[index % CHART_VARS.length];
        return (
          <div className="adm-bars-col" key={item.label}>
            <div className="adm-bars-value">{value}</div>
            <div className="adm-bars-track">
              <div
                className="adm-bars-fill"
                style={{ height: `${Math.max(pct, value > 0 ? 4 : 0)}%`, background: color }}
                title={`${item.label}: ${value}`}
              />
            </div>
            <div className="adm-bars-label">{item.label}</div>
          </div>
        );
      })}
    </div>
  );
}

export { CHART_VARS };
