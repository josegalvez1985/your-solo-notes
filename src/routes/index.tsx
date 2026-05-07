import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Music, Download, Loader2, Sparkles, Guitar, Youtube } from "lucide-react";
import { detectPitch, generateGuiTabs, generateBassTabs, generateNotesGroupedByMinute } from "@/utils/audioAnalyzer";
import { TabRenderer } from "@/components/TabRenderer";
import { fetchYoutubeAudio, isNativeAvailable } from "@/lib/youtube";

interface TabLine {
  instrument: string;
  notation: string;
}

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const [url, setUrl] = useState("");
  const [stage, setStage] = useState<"idle" | "downloading" | "analyzing" | "done">("idle");
  const [tabs, setTabs] = useState<TabLine[]>([]);
  const [error, setError] = useState("");
  const [title, setTitle] = useState("");
  const [playbackUrl, setPlaybackUrl] = useState("");
  const [notesGrouped, setNotesGrouped] = useState<{ minute: number; guitar: string; bass: string }[]>([]);

  const audioRef = useRef<HTMLAudioElement>(null);

  const isProcessing = stage === "downloading" || stage === "analyzing";

  const handleExtract = async () => {
    if (!url.trim()) return;
    setError("");
    setTabs([]);
    setNotesGrouped([]);
    setPlaybackUrl("");
    setTitle("");
    setStage("downloading");

    try {
      if (!isNativeAvailable()) {
        throw new Error(
          "Esta función requiere la app instalada en Android. En navegador no hay forma de extraer audio de YouTube sin servidor.",
        );
      }

      const { audioBuffer, title: ytTitle, playbackUrl: ytPlayback } = await fetchYoutubeAudio(url.trim());
      setTitle(ytTitle);
      setPlaybackUrl(ytPlayback);

      setStage("analyzing");
      const detectedNotes = await detectPitch(audioBuffer);
      if (detectedNotes.length === 0) {
        throw new Error("No se detectaron notas en el audio.");
      }

      setTabs([
        { instrument: "🎸 Guitarra", notation: generateGuiTabs(detectedNotes) },
        { instrument: "🎸 Bajo", notation: generateBassTabs(detectedNotes) },
      ]);
      setNotesGrouped(generateNotesGroupedByMinute(detectedNotes));
      setStage("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
      setStage("idle");
    }
  };

  const downloadTab = () => {
    if (tabs.length === 0) return;
    const content = tabs.map((t) => `${t.instrument}\n${t.notation}`).join("\n\n---\n\n");
    const safeTitle = (title || "tablatura").replace(/[^a-z0-9]/gi, "_").slice(0, 60);
    const element = document.createElement("a");
    element.setAttribute("href", "data:text/plain;charset=utf-8," + encodeURIComponent(content));
    element.setAttribute("download", `tablatura-${safeTitle}.txt`);
    element.style.display = "none";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute -top-40 -left-40 h-96 w-96 rounded-full bg-primary/30 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-accent/30 blur-3xl" />

      <header className="relative z-10 mx-auto flex max-w-5xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2">
          <Music className="h-8 w-8 text-primary" />
          <span className="text-xl font-bold">TuSolo</span>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-3xl px-6 pt-12 pb-24 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card/50 px-4 py-1.5 text-xs text-muted-foreground backdrop-blur">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          Pega un link de YouTube y obtén la tablatura
        </div>

        <h1 className="mt-6 text-5xl font-black tracking-tight md:text-7xl">
          Toca el solo de
          <br />
          <span className="bg-gradient-hero bg-clip-text text-transparent">
            cualquier canción
          </span>
        </h1>

        <p className="mx-auto mt-6 max-w-xl text-lg text-muted-foreground">
          Pega un enlace de YouTube y la app extrae las notas del solo en guitarra y bajo.
        </p>

        <div className="mx-auto mt-8 max-w-md space-y-3">
          <div className="flex items-center gap-2 rounded-lg border border-border bg-card/50 px-3 py-2 backdrop-blur">
            <Youtube className="h-5 w-5 text-red-500 shrink-0" />
            <input
              type="url"
              inputMode="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://youtube.com/watch?v=..."
              disabled={isProcessing}
              className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground disabled:opacity-50"
            />
          </div>
          <Button
            onClick={handleExtract}
            disabled={isProcessing || !url.trim()}
            className="w-full"
          >
            {isProcessing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {stage === "downloading" ? "Descargando audio..." : "Analizando notas..."}
              </>
            ) : (
              "Extraer solo"
            )}
          </Button>
          {!isNativeAvailable() && (
            <div className="rounded-xl border border-border bg-card/60 p-5 text-left backdrop-blur">
              <p className="text-sm font-semibold mb-1">📱 Instala la app Android</p>
              <p className="text-xs text-muted-foreground mb-3">
                La extracción de audio requiere la app nativa. Descárgala e instálala en tu celular.
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
                Requiere Android 6.0+. Activa "Instalar apps de fuentes desconocidas" en ajustes.
              </p>
            </div>
          )}
        </div>

        {playbackUrl && (
          <div className="mx-auto mt-6 max-w-md rounded-lg border border-border p-4 bg-muted/50">
            <p className="text-xs text-muted-foreground mb-2 truncate">{title}</p>
            <audio ref={audioRef} src={playbackUrl} controls className="w-full" />
          </div>
        )}

        {error && (
          <div className="mx-auto mt-6 max-w-md rounded-lg bg-destructive/10 p-4 text-sm text-destructive">
            {error}
          </div>
        )}

        {tabs.length === 0 && !isProcessing && !error && (
          <div className="mt-20 grid gap-4 sm:grid-cols-3">
            {[
              { t: "🎸 Multi-instrumento", d: "Guitarra y bajo" },
              { t: "⚡ Directo de YouTube", d: "Pega el link y listo" },
              { t: "📖 Descargables", d: "Guarda la tablatura en .txt" },
            ].map((f) => (
              <div
                key={f.t}
                className="rounded-2xl border border-border bg-gradient-card p-5 text-left shadow-elegant"
              >
                <p className="font-semibold">{f.t}</p>
                <p className="mt-1 text-sm text-muted-foreground">{f.d}</p>
              </div>
            ))}
          </div>
        )}
      </main>

      {tabs.length > 0 && (
        <div className="relative z-10 mx-auto max-w-3xl px-6 pb-12">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Guitar className="h-5 w-5" />
              <h2 className="font-semibold">Tablaturas</h2>
            </div>
            <Button onClick={downloadTab} size="sm" variant="outline">
              <Download className="h-4 w-4" />
              Descargar
            </Button>
          </div>

          <div className="space-y-4">
            {tabs.map((tab, idx) => (
              <div
                key={idx}
                className="rounded-2xl border border-border bg-gradient-card p-5 shadow-elegant"
              >
                <h3 className="font-semibold mb-3 text-sm">{tab.instrument}</h3>
                <TabRenderer
                  tabNotation={tab.notation}
                  instrument={tab.instrument}
                  currentTime={audioRef.current?.currentTime || 0}
                />
                <pre className="overflow-x-auto bg-muted p-4 rounded text-xs leading-relaxed whitespace-pre-wrap break-words max-h-40 mt-3">
                  {tab.notation}
                </pre>
              </div>
            ))}
          </div>

          {notesGrouped.length > 0 && (
            <div className="mt-12 rounded-2xl border border-border bg-gradient-card p-6 shadow-elegant">
              <h2 className="font-semibold mb-6 text-lg">Notas detectadas por minuto</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-4 font-semibold">Minuto</th>
                      <th className="text-left py-3 px-4 font-semibold">🎸 Guitarra</th>
                      <th className="text-left py-3 px-4 font-semibold">Bajo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {notesGrouped.map((row) => (
                      <tr key={row.minute} className="border-b border-border hover:bg-muted/50">
                        <td className="py-3 px-4 font-medium">{row.minute}:00</td>
                        <td className="py-3 px-4 font-mono text-xs">{row.guitar}</td>
                        <td className="py-3 px-4 font-mono text-xs">{row.bass}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
