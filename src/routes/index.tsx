import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Music, Download, Loader2, Upload, Sparkles, Guitar } from "lucide-react";
import { detectPitch, generateGuiTabs, generateBassTabs, generatePianoNotation } from "@/utils/audioAnalyzer";

interface TabLine {
  instrument: string;
  notation: string;
}

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [tabs, setTabs] = useState<TabLine[]>([]);
  const [error, setError] = useState("");
  const [fileName, setFileName] = useState("");
  const [audioUrl, setAudioUrl] = useState<string>("");
  const [currentNotes, setCurrentNotes] = useState<{ [key: string]: string }>({});

  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const allNotesRef = useRef<any[]>([]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setError("");
    setTabs([]);
    setFileName(file.name);

    // Liberar URL anterior si existe
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }

    // Crear URL para el reproductor INMEDIATAMENTE
    const url = URL.createObjectURL(file);
    setAudioUrl(url);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

      const detectedNotes = await detectPitch(audioBuffer);

      if (detectedNotes.length === 0) {
        throw new Error("No se detectaron notas. Intenta con otro archivo.");
      }

      allNotesRef.current = detectedNotes;

      const guitarTab = generateGuiTabs(detectedNotes);
      const bassTab = generateBassTabs(detectedNotes);
      const pianoNotes = generatePianoNotation(detectedNotes);

      setTabs([
        { instrument: "🎸 Guitarra", notation: guitarTab },
        { instrument: "🎸 Bajo", notation: bassTab },
        { instrument: "🎹 Piano", notation: pianoNotes },
      ]);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error desconocido";
      setError(message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleTimeUpdate = () => {
    if (!audioRef.current || allNotesRef.current.length === 0) return;

    const currentTime = audioRef.current.currentTime;
    const currentNotesList = allNotesRef.current.filter(
      (note) => note.time <= currentTime && note.time + 0.5 > currentTime
    );

    if (currentNotesList.length > 0) {
      const latest = currentNotesList[currentNotesList.length - 1];
      setCurrentNotes({
        guitar: `${latest.note}${latest.octave}`,
        bass: `${latest.note}${latest.octave}`,
        piano: `${latest.note}${latest.octave}`,
      });
    }
  };

  useEffect(() => {
    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  const downloadTab = () => {
    if (tabs.length === 0) return;
    const content = tabs.map((t) => `${t.instrument}\n${t.notation}`).join("\n\n---\n\n");
    const element = document.createElement("a");
    element.setAttribute("href", "data:text/plain;charset=utf-8," + encodeURIComponent(content));
    element.setAttribute("download", `tablatura-${fileName.replace(/[^a-z0-9]/gi, "_")}.txt`);
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
          Extrae solos de tus canciones favoritas
        </div>

        <h1 className="mt-6 text-5xl font-black tracking-tight md:text-7xl">
          Toca el solo de
          <br />
          <span className="bg-gradient-hero bg-clip-text text-transparent">
            cualquier canción
          </span>
        </h1>

        <p className="mx-auto mt-6 max-w-xl text-lg text-muted-foreground">
          Carga un archivo de audio o video y obtén las tablaturas de guitarra, bajo y piano en segundos.
        </p>

        <div className="mx-auto mt-8 max-w-md">
          <div
            onClick={() => fileInputRef.current?.click()}
            className="cursor-pointer rounded-lg border-2 border-dashed border-border p-8 text-center transition-colors hover:border-primary hover:bg-muted/50"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*,video/*"
              onChange={handleFileUpload}
              disabled={isProcessing}
              className="hidden"
            />
            <Upload className="mx-auto h-10 w-10 text-muted-foreground" />
            <p className="mt-3 font-semibold">Carga tu archivo</p>
            <p className="text-xs text-muted-foreground mt-1">MP3, WAV, MP4, etc.</p>
          </div>
        </div>

        {/* Reproductor nativo HTML5 - SIEMPRE visible cuando hay audio */}
        {audioUrl && (
          <div className="mx-auto mt-6 max-w-md rounded-lg border border-border p-4 bg-muted/50">
            <p className="text-xs text-muted-foreground mb-2 truncate">{fileName}</p>
            <audio
              ref={audioRef}
              src={audioUrl}
              controls
              onTimeUpdate={handleTimeUpdate}
              className="w-full"
            />
          </div>
        )}

        {isProcessing && (
          <div className="mx-auto mt-6 max-w-md flex items-center justify-center gap-2 rounded-lg bg-muted p-4">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-sm">Analizando tablaturas...</span>
          </div>
        )}

        {error && (
          <div className="mx-auto mt-6 max-w-md rounded-lg bg-destructive/10 p-4 text-sm text-destructive">
            {error}
          </div>
        )}

        {tabs.length > 0 && (currentNotes.guitar || currentNotes.bass || currentNotes.piano) && (
          <div className="mx-auto mt-8 max-w-md rounded-lg border border-border bg-primary/5 p-6">
            <h3 className="font-semibold mb-3 text-sm">Nota Actual</h3>
            <div className="grid grid-cols-3 gap-2">
              <div className="text-center p-3 rounded-lg bg-background border border-border">
                <p className="text-xs text-muted-foreground mb-1">🎸 Guitarra</p>
                <p className="text-xl font-bold text-primary">
                  {currentNotes.guitar || "-"}
                </p>
              </div>
              <div className="text-center p-3 rounded-lg bg-background border border-border">
                <p className="text-xs text-muted-foreground mb-1">🎸 Bajo</p>
                <p className="text-xl font-bold text-primary">
                  {currentNotes.bass || "-"}
                </p>
              </div>
              <div className="text-center p-3 rounded-lg bg-background border border-border">
                <p className="text-xs text-muted-foreground mb-1">🎹 Piano</p>
                <p className="text-xl font-bold text-primary">
                  {currentNotes.piano || "-"}
                </p>
              </div>
            </div>
          </div>
        )}

        {tabs.length === 0 && !isProcessing && (
          <div className="mt-20 grid gap-4 sm:grid-cols-3">
            {[
              { t: "🎸 Multi-instrumento", d: "Guitarra, bajo, piano" },
              { t: "⚡ Al instante", d: "Carga tu audio y obtén tablaturas" },
              { t: "📖 Descargables", d: "Guarda tus tablaturas en .txt" },
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
              <h2 className="font-semibold">Tablaturas Completas</h2>
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
                <pre className="overflow-x-auto bg-muted p-4 rounded text-xs leading-relaxed whitespace-pre-wrap break-words max-h-40">
                  {tab.notation}
                </pre>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
