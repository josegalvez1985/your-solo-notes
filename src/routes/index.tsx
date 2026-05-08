import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Music,
  Download,
  Loader2,
  Sparkles,
  Guitar,
  Youtube,
  AlertCircle,
  WifiOff,
  Lock,
  Copy,
  Share2,
  Trash2,
  History,
  Check,
} from "lucide-react";
import {
  detectPitch,
  generateGuitarTabSegments,
  generateBassTabSegments,
  generateNotesGroupedByMinute,
  segmentsToText,
  TUNINGS,
  type Note,
  type TuningName,
  type TabSegment,
} from "@/utils/audioAnalyzer";
import { TabRenderer } from "@/components/TabRenderer";
import { PlayerControls } from "@/components/PlayerControls";
import { RangeSelector } from "@/components/RangeSelector";
import {
  fetchYoutubeAudio,
  isNativeAvailable,
  isValidYoutubeUrl,
  YoutubeError,
} from "@/lib/youtube";
import { loadHistory, saveHistoryEntry, deleteHistoryEntry, type HistoryEntry } from "@/lib/history";

export const Route = createFileRoute("/")({
  component: Index,
});

type Stage = "idle" | "downloading" | "ready" | "analyzing" | "done";

function Index() {
  const [url, setUrl] = useState("");
  const [urlError, setUrlError] = useState("");
  const [stage, setStage] = useState<Stage>("idle");
  const [notes, setNotes] = useState<Note[]>([]);
  const [error, setError] = useState<{ kind: string; message: string; retryable: boolean } | null>(null);
  const [title, setTitle] = useState("");
  const [playbackUrl, setPlaybackUrl] = useState("");
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);
  const [duration, setDuration] = useState(0);
  const [tuning, setTuning] = useState<TuningName>("standard");
  const [rangeStart, setRangeStart] = useState(0);
  const [rangeEnd, setRangeEnd] = useState(0);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [copied, setCopied] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    setHistory(loadHistory());
  }, []);

  const isProcessing = stage === "downloading" || stage === "analyzing";
  const native = isNativeAvailable();

  const guitarSegments = useMemo<TabSegment[]>(
    () => (notes.length > 0 ? generateGuitarTabSegments(notes, TUNINGS[tuning]) : []),
    [notes, tuning],
  );
  const bassSegments = useMemo<TabSegment[]>(
    () => (notes.length > 0 ? generateBassTabSegments(notes, TUNINGS[tuning]) : []),
    [notes, tuning],
  );
  const notesGrouped = useMemo(
    () => (notes.length > 0 ? generateNotesGroupedByMinute(notes, TUNINGS[tuning]) : []),
    [notes, tuning],
  );

  const validateUrl = () => {
    if (url.trim() && !isValidYoutubeUrl(url)) {
      setUrlError("URL no parece de YouTube. Ej: https://youtube.com/watch?v=...");
    } else {
      setUrlError("");
    }
  };

  const resetResults = () => {
    setNotes([]);
    setPlaybackUrl("");
    setTitle("");
    setAudioBuffer(null);
    setDuration(0);
    setRangeStart(0);
    setRangeEnd(0);
    setProgress(0);
    setError(null);
  };

  const handleDownload = async () => {
    if (!url.trim()) return;
    if (!isValidYoutubeUrl(url)) {
      setUrlError("URL no parece de YouTube.");
      return;
    }

    resetResults();
    setStage("downloading");

    try {
      if (!native) {
        throw new YoutubeError(
          "platform",
          "Esta función requiere la app instalada en Android.",
        );
      }
      const result = await fetchYoutubeAudio(url.trim());
      setTitle(result.title);
      setPlaybackUrl(result.playbackUrl);
      setAudioBuffer(result.audioBuffer);
      const realDuration = result.audioBuffer.duration;
      setDuration(realDuration);
      setRangeStart(0);
      setRangeEnd(Math.min(realDuration, 60));
      setStage("ready");
    } catch (e) {
      const yt = e instanceof YoutubeError ? e : new YoutubeError("unknown", String(e));
      setError({ kind: yt.kind, message: yt.message, retryable: yt.retryable });
      setStage("idle");
    }
  };

  const handleAnalyze = async () => {
    if (!audioBuffer) return;
    setError(null);
    setProgress(0);
    setStage("analyzing");

    try {
      const detected = await detectPitch(audioBuffer, {
        startTime: rangeStart,
        endTime: rangeEnd,
        onProgress: setProgress,
      });
      if (detected.length === 0) {
        setError({
          kind: "noNotes",
          message: "No se detectaron notas claras en este rango. Intenta otro rango o sube el volumen del original.",
          retryable: true,
        });
        setStage("ready");
        return;
      }
      setNotes(detected);
      saveHistoryEntry({
        id: crypto.randomUUID(),
        url: url.trim(),
        title: title || "Sin título",
        tuning,
        createdAt: Date.now(),
        notes: detected,
      });
      setHistory(loadHistory());
      setStage("done");
    } catch (e) {
      setError({
        kind: "analysis",
        message: e instanceof Error ? e.message : "Error analizando audio",
        retryable: true,
      });
      setStage("ready");
    }
  };

  const handleLoadHistory = (entry: HistoryEntry) => {
    setUrl(entry.url);
    setTitle(entry.title);
    setTuning(entry.tuning);
    setNotes(entry.notes as Note[]);
    setPlaybackUrl("");
    setAudioBuffer(null);
    setStage("done");
    setError(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDeleteHistory = (id: string) => {
    setHistory(deleteHistoryEntry(id));
  };

  const downloadTab = () => {
    if (notes.length === 0) return;
    const guitarText = `🎸 GUITARRA — ${TUNINGS[tuning].label}\n${segmentsToText(guitarSegments)}`;
    const bassText = `🎸 BAJO — ${TUNINGS[tuning].label}\n${segmentsToText(bassSegments)}`;
    const content = `${title}\n\n${guitarText}\n\n---\n\n${bassText}`;
    const safeTitle = (title || "tablatura").replace(/[^a-z0-9]/gi, "_").slice(0, 60);
    const element = document.createElement("a");
    element.setAttribute("href", "data:text/plain;charset=utf-8," + encodeURIComponent(content));
    element.setAttribute("download", `tablatura-${safeTitle}.txt`);
    element.style.display = "none";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(label);
      setTimeout(() => setCopied(null), 1800);
    } catch {
      // ignore
    }
  };

  const shareTab = async () => {
    const text = `${title}\n\n🎸 ${segmentsToText(guitarSegments)}\n\n🎸 Bajo:\n${segmentsToText(bassSegments)}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: `Tablatura — ${title}`, text });
      } catch {
        // user cancelled
      }
    } else {
      copyToClipboard(text, "share");
    }
  };

  const seekAudio = (t: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = t;
      setCurrentTime(t);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute -top-40 -left-40 h-96 w-96 rounded-full bg-primary/30 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-accent/30 blur-3xl" />

      <header className="relative z-10 mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2">
          <Music className="h-7 w-7 text-primary" />
          <span className="text-lg font-bold">TuSolo</span>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-3xl px-6 pt-6 pb-24">
        <section className="text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card/50 px-4 py-1.5 text-xs text-muted-foreground backdrop-blur">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            Pega un link de YouTube y obtén la tablatura
          </div>

          <h1 className="mt-4 text-4xl font-black tracking-tight md:text-6xl">
            Toca el solo de
            <br />
            <span className="bg-gradient-hero bg-clip-text text-transparent">
              cualquier canción
            </span>
          </h1>

          <p className="mx-auto mt-4 max-w-xl text-base text-muted-foreground md:text-lg">
            Pega un enlace de YouTube y la app extrae las notas del solo en guitarra y bajo.
          </p>

          <div className="mx-auto mt-6 max-w-md space-y-3">
            <div className="space-y-1">
              <div
                className={`flex items-center gap-2 rounded-lg border bg-card/50 px-3 py-2 backdrop-blur transition-colors ${
                  urlError ? "border-destructive" : "border-border"
                }`}
              >
                <Youtube className="h-5 w-5 text-red-500 shrink-0" />
                <input
                  type="url"
                  inputMode="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  onBlur={validateUrl}
                  placeholder="https://youtube.com/watch?v=..."
                  disabled={isProcessing}
                  className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground disabled:opacity-50"
                  aria-invalid={!!urlError}
                  aria-describedby="url-error"
                />
              </div>
              {urlError && (
                <p id="url-error" className="text-left text-xs text-destructive">
                  {urlError}
                </p>
              )}
            </div>

            <Button
              onClick={handleDownload}
              disabled={isProcessing || !url.trim() || !!urlError}
              className="w-full"
              aria-live="polite"
            >
              {stage === "downloading" ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Descargando audio...
                </>
              ) : stage === "analyzing" ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Analizando {Math.round(progress * 100)}%
                </>
              ) : (
                "Descargar audio"
              )}
            </Button>

            {!native && (
              <div className="rounded-xl border border-primary/40 bg-primary/5 p-5 text-left backdrop-blur">
                <p className="text-sm font-semibold mb-1">📱 Necesitas la app Android</p>
                <p className="text-xs text-muted-foreground mb-3">
                  La extracción de audio requiere la app nativa por restricciones de YouTube.
                </p>
                <a
                  href="https://github.com/josegalvez1985/your-solo-notes/releases/latest/download/app-release.apk"
                  download
                  className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  <Download className="h-4 w-4" />
                  Descargar APK
                </a>
                <p className="mt-2 text-[10px] text-muted-foreground">
                  Android 6.0+. Activa "Instalar apps de fuentes desconocidas".
                </p>
              </div>
            )}
          </div>

          {error && <ErrorBanner error={error} onRetry={error.retryable ? handleDownload : undefined} />}

          {stage === "analyzing" && (
            <div className="mx-auto mt-6 max-w-md" role="status" aria-live="polite">
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-primary transition-all duration-150"
                  style={{ width: `${Math.round(progress * 100)}%` }}
                />
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Detectando frecuencias... esto puede tardar unos segundos.
              </p>
            </div>
          )}
        </section>

        {stage === "idle" && history.length === 0 && !error && (
          <section className="mt-16 grid gap-4 sm:grid-cols-3">
            {[
              { t: "🎸 Multi-instrumento", d: "Guitarra y bajo a la vez" },
              { t: "⏱ Selector de rango", d: "Analiza solo el solo" },
              { t: "🔁 Loop A-B", d: "Practica el pasaje difícil" },
            ].map((f) => (
              <div
                key={f.t}
                className="rounded-2xl border border-border bg-gradient-card p-5 text-left shadow-elegant"
              >
                <p className="font-semibold">{f.t}</p>
                <p className="mt-1 text-sm text-muted-foreground">{f.d}</p>
              </div>
            ))}
          </section>
        )}

        {stage === "idle" && history.length > 0 && (
          <section className="mt-12">
            <div className="mb-3 flex items-center gap-2">
              <History className="h-4 w-4" />
              <h2 className="text-sm font-semibold">Análisis recientes</h2>
            </div>
            <div className="space-y-2">
              {history.map((h) => (
                <div
                  key={h.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card/40 p-3 hover:bg-card transition-colors"
                >
                  <button
                    onClick={() => handleLoadHistory(h)}
                    className="flex-1 text-left"
                    type="button"
                  >
                    <p className="truncate text-sm font-medium">{h.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {h.notes.length} notas · {TUNINGS[h.tuning].label} ·{" "}
                      {new Date(h.createdAt).toLocaleDateString()}
                    </p>
                  </button>
                  <button
                    onClick={() => handleDeleteHistory(h.id)}
                    className="rounded p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    type="button"
                    aria-label={`Eliminar ${h.title}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        {playbackUrl && (
          <section className="mt-8 space-y-4">
            <div className="rounded-xl border border-border bg-card/60 p-4 backdrop-blur">
              <p className="text-xs text-muted-foreground mb-2 truncate">{title}</p>
              <audio ref={audioRef} src={playbackUrl} className="w-full" preload="metadata" />
              <PlayerControls
                audioRef={audioRef}
                duration={duration}
                tuning={tuning}
                onTuningChange={setTuning}
                onTimeUpdate={setCurrentTime}
              />
            </div>

            {(stage === "ready" || stage === "analyzing") && (
              <>
                <RangeSelector
                  duration={duration}
                  start={rangeStart}
                  end={rangeEnd}
                  onChange={(s, e) => {
                    setRangeStart(s);
                    setRangeEnd(e);
                  }}
                  disabled={stage === "analyzing"}
                />
                <Button
                  onClick={handleAnalyze}
                  disabled={stage === "analyzing"}
                  className="w-full"
                >
                  {stage === "analyzing" ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Analizando {Math.round(progress * 100)}%
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      Analizar rango seleccionado
                    </>
                  )}
                </Button>
              </>
            )}
          </section>
        )}

        {stage === "done" && notes.length > 0 && (
          <section className="mt-10 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Guitar className="h-5 w-5" />
                <h2 className="font-semibold">Tablaturas ({notes.length} notas)</h2>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={() =>
                    copyToClipboard(
                      `🎸 ${segmentsToText(guitarSegments)}\n\n🎸 Bajo:\n${segmentsToText(bassSegments)}`,
                      "all",
                    )
                  }
                  size="sm"
                  variant="outline"
                  aria-label="Copiar tablatura"
                >
                  {copied === "all" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copied === "all" ? "Copiado" : "Copiar"}
                </Button>
                <Button onClick={shareTab} size="sm" variant="outline" aria-label="Compartir tablatura">
                  <Share2 className="h-4 w-4" />
                  Compartir
                </Button>
                <Button onClick={downloadTab} size="sm" variant="outline" aria-label="Descargar .txt">
                  <Download className="h-4 w-4" />
                  .txt
                </Button>
              </div>
            </div>

            <div className="space-y-6">
              <div className="rounded-2xl border border-border bg-gradient-card p-5 shadow-elegant">
                <h3 className="font-semibold mb-3 text-sm flex items-center gap-2">
                  🎸 Guitarra <span className="text-xs text-muted-foreground font-normal">{TUNINGS[tuning].label}</span>
                </h3>
                <TabRenderer segments={guitarSegments} currentTime={currentTime} onSeek={seekAudio} />
              </div>

              <div className="rounded-2xl border border-border bg-gradient-card p-5 shadow-elegant">
                <h3 className="font-semibold mb-3 text-sm flex items-center gap-2">
                  🎸 Bajo <span className="text-xs text-muted-foreground font-normal">{TUNINGS[tuning].label}</span>
                </h3>
                <TabRenderer segments={bassSegments} currentTime={currentTime} onSeek={seekAudio} />
              </div>
            </div>

            {notesGrouped.length > 0 && (
              <div className="rounded-2xl border border-border bg-gradient-card p-6 shadow-elegant">
                <h2 className="font-semibold mb-4 text-base">Notas por minuto</h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-3 px-3 font-semibold">Min</th>
                        <th className="text-left py-3 px-3 font-semibold">🎸 Guitarra</th>
                        <th className="text-left py-3 px-3 font-semibold">Bajo</th>
                        <th className="text-right py-3 px-3 font-semibold">Acción</th>
                      </tr>
                    </thead>
                    <tbody>
                      {notesGrouped.map((row) => (
                        <tr key={row.minute} className="border-b border-border hover:bg-muted/40">
                          <td className="py-3 px-3 font-medium">{row.minute}:00</td>
                          <td className="py-3 px-3 font-mono text-xs">{row.guitar}</td>
                          <td className="py-3 px-3 font-mono text-xs">{row.bass}</td>
                          <td className="py-3 px-3 text-right">
                            <button
                              onClick={() => seekAudio(row.startTime)}
                              className="text-xs text-primary hover:underline"
                              type="button"
                            >
                              ▶ ir
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <Button
              onClick={() => {
                resetResults();
                setUrl("");
                setStage("idle");
              }}
              variant="outline"
              className="w-full"
            >
              Analizar otra canción
            </Button>
          </section>
        )}
      </main>
    </div>
  );
}

function ErrorBanner({
  error,
  onRetry,
}: {
  error: { kind: string; message: string; retryable: boolean };
  onRetry?: () => void;
}) {
  const Icon =
    error.kind === "network" ? WifiOff : error.kind === "private" ? Lock : AlertCircle;

  return (
    <div
      role="alert"
      className="mx-auto mt-6 max-w-md rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-left text-sm"
    >
      <div className="flex items-start gap-2">
        <Icon className="h-4 w-4 mt-0.5 text-destructive shrink-0" />
        <div className="flex-1">
          <p className="text-destructive font-medium">{error.message}</p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="mt-2 text-xs text-destructive underline hover:no-underline"
              type="button"
            >
              Reintentar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
