import { useMemo } from "react";
import type { TabSegment } from "@/utils/audioAnalyzer";

interface TabRendererProps {
  segments: TabSegment[];
  currentTime: number;
  onSeek?: (time: number) => void;
}

export function TabRenderer({ segments, currentTime, onSeek }: TabRendererProps) {
  const activeSegmentIdx = useMemo(() => {
    for (let i = 0; i < segments.length; i++) {
      if (currentTime >= segments[i].startTime && currentTime <= segments[i].endTime) {
        return i;
      }
    }
    return -1;
  }, [segments, currentTime]);

  if (segments.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
        No se generó tablatura para este instrumento.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {segments.map((seg, idx) => {
        const isActive = idx === activeSegmentIdx;
        const activePos = isActive
          ? seg.positions.find(
              (p, i) =>
                currentTime >= p.time &&
                (i === seg.positions.length - 1 || currentTime < seg.positions[i + 1].time),
            )
          : undefined;

        return (
          <div
            key={idx}
            className={`relative rounded-lg border overflow-x-auto transition-colors ${
              isActive ? "border-primary bg-primary/5" : "border-border bg-muted/40"
            }`}
          >
            <div className="flex items-center justify-between px-3 pt-2 text-[10px] text-muted-foreground">
              <span>
                {formatTime(seg.startTime)} – {formatTime(seg.endTime)}
              </span>
              {onSeek && (
                <button
                  onClick={() => onSeek(seg.startTime)}
                  className="text-primary hover:underline"
                  type="button"
                >
                  ▶ ir a este compás
                </button>
              )}
            </div>
            <pre className="relative font-mono text-xs leading-relaxed whitespace-pre p-3">
              {seg.notation}
              {isActive && activePos && (
                <span
                  className="pointer-events-none absolute top-2 bottom-2 w-[2px] bg-primary animate-pulse"
                  style={{
                    left: `calc(${0.75}rem + ${(activePos.columnStart + 2) * 0.6}em)`,
                  }}
                />
              )}
            </pre>
          </div>
        );
      })}
    </div>
  );
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}
