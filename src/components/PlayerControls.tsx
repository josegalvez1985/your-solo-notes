import { useEffect, useRef, useState } from "react";
import { Play, Pause, RotateCcw, Repeat } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TUNINGS, type TuningName } from "@/utils/audioAnalyzer";

interface PlayerControlsProps {
  audioRef: React.RefObject<HTMLAudioElement | null>;
  duration: number;
  tuning: TuningName;
  onTuningChange: (t: TuningName) => void;
  onTimeUpdate: (time: number) => void;
}

const SPEEDS = [0.5, 0.75, 1, 1.25];

export function PlayerControls({
  audioRef,
  duration,
  tuning,
  onTuningChange,
  onTimeUpdate,
}: PlayerControlsProps) {
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [loopA, setLoopA] = useState<number | null>(null);
  const [loopB, setLoopB] = useState<number | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handlePlay = () => {
      setPlaying(true);
      const tick = () => {
        if (audio.paused) return;
        setCurrentTime(audio.currentTime);
        onTimeUpdate(audio.currentTime);
        if (loopA !== null && loopB !== null && audio.currentTime >= loopB) {
          audio.currentTime = loopA;
        }
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    };
    const handlePause = () => {
      setPlaying(false);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
    const handleEnded = () => setPlaying(false);

    audio.addEventListener("play", handlePlay);
    audio.addEventListener("pause", handlePause);
    audio.addEventListener("ended", handleEnded);

    return () => {
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("pause", handlePause);
      audio.removeEventListener("ended", handleEnded);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [audioRef, loopA, loopB, onTimeUpdate]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) audio.play();
    else audio.pause();
  };

  const handleSpeed = (s: number) => {
    setSpeed(s);
    if (audioRef.current) audioRef.current.playbackRate = s;
  };

  const handleSeek = (t: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = t;
      setCurrentTime(t);
      onTimeUpdate(t);
    }
  };

  const setA = () => setLoopA(currentTime);
  const setB = () => {
    if (loopA !== null && currentTime > loopA) setLoopB(currentTime);
  };
  const clearLoop = () => {
    setLoopA(null);
    setLoopB(null);
  };

  return (
    <div className="rounded-2xl border border-border bg-card/60 p-4 backdrop-blur space-y-3">
      <div className="flex items-center gap-3">
        <Button onClick={togglePlay} size="sm" variant="default">
          {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </Button>
        <span className="font-mono text-xs tabular-nums text-muted-foreground min-w-[90px]">
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>
        <input
          type="range"
          min={0}
          max={duration || 0}
          step={0.1}
          value={currentTime}
          onChange={(e) => handleSeek(parseFloat(e.target.value))}
          className="flex-1 accent-primary"
          aria-label="Posición de reproducción"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted-foreground">Velocidad:</span>
        {SPEEDS.map((s) => (
          <button
            key={s}
            onClick={() => handleSpeed(s)}
            className={`rounded-md border px-2 py-1 text-xs transition-colors ${
              speed === s
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card hover:bg-muted"
            }`}
            type="button"
          >
            {s}x
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted-foreground">Loop:</span>
        <button
          onClick={setA}
          className="rounded-md border border-border bg-card px-2 py-1 text-xs hover:bg-muted"
          type="button"
        >
          A {loopA !== null ? `(${formatTime(loopA)})` : ""}
        </button>
        <button
          onClick={setB}
          disabled={loopA === null}
          className="rounded-md border border-border bg-card px-2 py-1 text-xs hover:bg-muted disabled:opacity-50"
          type="button"
        >
          B {loopB !== null ? `(${formatTime(loopB)})` : ""}
        </button>
        {(loopA !== null || loopB !== null) && (
          <button
            onClick={clearLoop}
            className="rounded-md border border-border bg-card px-2 py-1 text-xs hover:bg-muted"
            type="button"
            aria-label="Limpiar loop"
          >
            <RotateCcw className="h-3 w-3" />
          </button>
        )}
        {loopA !== null && loopB !== null && (
          <span className="inline-flex items-center gap-1 text-xs text-primary">
            <Repeat className="h-3 w-3" />
            activo
          </span>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor="tuning-select" className="text-xs text-muted-foreground">
          Afinación:
        </label>
        <select
          id="tuning-select"
          value={tuning}
          onChange={(e) => onTuningChange(e.target.value as TuningName)}
          className="rounded-md border border-border bg-card px-2 py-1 text-xs"
        >
          {Object.values(TUNINGS).map((t) => (
            <option key={t.name} value={t.name}>
              {t.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}
