import { useId } from 'react';
import type { CompletionPoint, StageSlice } from './Renderers';
export function CompletionChart({
  points
}: {
  points: CompletionPoint[];
}) {
  const gradient = useId().replace(/:/g, '');
  const max = Math.max(1, ...points.map(point => point.count));
  const ticks = [...new Set([0, Math.ceil(max / 2), max])];
  const left = 26,
    right = 381,
    top = 12,
    bottom = 153;
  const y = (count: number) => bottom - (bottom - top) * count / max;
  const coords = points.map((p, i) => ({
    ...p,
    x: left + i * (right - left) / Math.max(1, points.length - 1),
    y: y(p.count)
  }));
  const line = coords.map(p => p.x + ',' + p.y).join(' ');
  return <svg width="100%" height="100%" viewBox="0 0 408 178" preserveAspectRatio="none">
      <defs>
        <linearGradient id={gradient} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#53b2a8" stopOpacity=".34" />
          <stop offset="100%" stopColor="#53b2a8" stopOpacity=".01" />
        </linearGradient>
      </defs>
      {ticks.map(tick => <g key={tick}>
        <line x1={left} x2={right} y1={y(tick)} y2={y(tick)} stroke="#e5ebeb" strokeDasharray="3 4" />
        <text x={left - 7} y={y(tick) + 4} textAnchor="end" fill="#526675" fontSize="11">
          {tick}
        </text>
      </g>)}
      <polygon points={left + ',' + bottom + ' ' + line + ' ' + right + ',' + bottom} fill={'url(#' + gradient + ')'} />
      <polyline points={line} fill="none" stroke="#168579" strokeWidth="2.5" vectorEffect="non-scaling-stroke" />
      {coords.map((p, i) => <g key={p.week}>
        <circle cx={p.x} cy={p.y} r="3" fill="#168579">
          <title>
            {'Week of ' + p.week + ' · ' + p.count + ' completed'}
          </title>
        </circle>
        {(i % Math.ceil(coords.length / 5) === 0 || i === coords.length - 1) && <text x={p.x} y="173" textAnchor="middle" fill="#526675" fontSize="10">
          {p.week}
        </text>}
      </g>)}
    </svg>;
}
export function DistributionChart({
  slices
}: {
  slices: StageSlice[];
}) {
  const total = slices.reduce((sum, slice) => sum + slice.value, 0);
  let offset = 0;
  return <svg width="100%" height="100%" viewBox="0 0 120 120">
      {slices.map(slice => {
      const start = offset,
        percent = slice.value / total * 100;
      offset += percent;
      const length = Math.max(0, percent - (slices.length > 1 ? 0.45 : 0));
      return <circle key={slice.name} cx="60" cy="60" r="47" fill="none" stroke={slice.fill} strokeWidth="16" pathLength="100" strokeDasharray={length + ' ' + (100 - length)} strokeDashoffset={-start} transform="rotate(-90 60 60)">
        <title>
          {slice.name + ' · ' + slice.value + ' cases'}
        </title>
      </circle>;
    })}
    </svg>;
}
