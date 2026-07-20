import React, { useId } from "react";

/**
 * Tiny inline SVG sparkline for KPI tiles. Presentational only — no deps.
 * Draws a smooth-ish area + line from a numeric series and a highlighted
 * end dot. Colour is driven by CSS currentColor so callers set text-* class.
 */
const Sparkline = ({
  data = [],
  width = 96,
  height = 32,
  strokeWidth = 2,
  className,
}) => {
  const gradId = useId();
  const points = Array.isArray(data)
    ? data.filter((n) => Number.isFinite(n))
    : [];
  if (points.length < 2) {
    return (
      <svg width={width} height={height} className={className} aria-hidden />
    );
  }

  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = max - min || 1;
  const stepX = width / (points.length - 1);
  const pad = strokeWidth;
  const usableH = height - pad * 2;

  const coords = points.map((v, i) => {
    const x = i * stepX;
    const y = pad + usableH - ((v - min) / span) * usableH;
    return [x, y];
  });

  const linePath = coords
    .map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`)
    .join(" ");
  const areaPath = `${linePath} L${width},${height} L0,${height} Z`;
  const [lastX, lastY] = coords[coords.length - 1];

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      preserveAspectRatio="none"
      aria-hidden
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.22" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#${gradId})`} stroke="none" />
      <path
        d={linePath}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
      <circle cx={lastX} cy={lastY} r={strokeWidth + 0.5} fill="currentColor" />
    </svg>
  );
};

export default Sparkline;
