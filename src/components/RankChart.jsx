// Tiny inline SVG line chart — no dependencies.
export default function RankChart({ history }) {
  const w = 320;
  const h = 110;
  const padX = 24;
  const padY = 16;
  const ranks = history.map((p) => p.rank);
  const max = Math.max(...ranks);
  const min = Math.min(...ranks);
  const range = Math.max(max - min, 1);

  const points = history.map((p, i) => {
    const x = padX + (i * (w - padX * 2)) / (history.length - 1);
    const y = padY + ((p.rank - min) / range) * (h - padY * 2); // lower rank = higher on chart
    return [x, y];
  });
  const path = points.map((p, i) => (i === 0 ? `M${p[0]},${p[1]}` : `L${p[0]},${p[1]}`)).join(' ');

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-auto">
      <line x1={padX} y1={padY} x2={padX} y2={h - padY} stroke="#1f2940" />
      <line x1={padX} y1={h - padY} x2={w - padX} y2={h - padY} stroke="#1f2940" />
      <path d={path} fill="none" stroke="#f5c542" strokeWidth="2" />
      {points.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={2.5} fill="#f5c542" />
      ))}
      <text x={padX} y={padY - 4} fill="#8a96b2" fontSize="9">rank #{min}</text>
      <text x={padX} y={h - padY + 12} fill="#8a96b2" fontSize="9">rank #{max}</text>
    </svg>
  );
}
