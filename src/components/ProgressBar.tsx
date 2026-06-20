export default function ProgressBar({ value, className = '' }: { value: number; className?: string }) {
  const pct = Math.round(Math.max(0, Math.min(1, value)) * 100);
  return (
    <div className={`h-2 w-full overflow-hidden rounded-full bg-slate-700 ${className}`}>
      <div className="h-full rounded-full bg-amber-400 transition-all" style={{ width: `${pct}%` }} />
    </div>
  );
}
