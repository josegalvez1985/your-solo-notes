interface RangeSelectorProps {
  duration: number;
  start: number;
  end: number;
  onChange: (start: number, end: number) => void;
  disabled?: boolean;
}

export function RangeSelector({ duration, start, end, onChange, disabled }: RangeSelectorProps) {
  const handleStart = (v: number) => {
    const next = Math.min(v, end - 1);
    onChange(Math.max(0, next), end);
  };
  const handleEnd = (v: number) => {
    const next = Math.max(v, start + 1);
    onChange(start, Math.min(duration, next));
  };

  return (
    <div className="rounded-xl border border-border bg-card/60 p-4 backdrop-blur space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Rango a analizar</span>
        <span className="font-mono text-xs text-muted-foreground tabular-nums">
          {formatTime(start)} → {formatTime(end)}
        </span>
      </div>

      <div className="space-y-2">
        <label className="block text-xs text-muted-foreground">Inicio: {formatTime(start)}</label>
        <input
          type="range"
          min={0}
          max={duration}
          step={1}
          value={start}
          disabled={disabled}
          onChange={(e) => handleStart(parseFloat(e.target.value))}
          className="w-full accent-primary"
          aria-label="Inicio del rango"
        />
      </div>

      <div className="space-y-2">
        <label className="block text-xs text-muted-foreground">Fin: {formatTime(end)}</label>
        <input
          type="range"
          min={0}
          max={duration}
          step={1}
          value={end}
          disabled={disabled}
          onChange={(e) => handleEnd(parseFloat(e.target.value))}
          className="w-full accent-primary"
          aria-label="Fin del rango"
        />
      </div>

      <p className="text-[10px] text-muted-foreground">
        Tip: limita el rango al solo (típicamente 20-60 segundos) para mejor precisión y menos ruido.
      </p>
    </div>
  );
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}
