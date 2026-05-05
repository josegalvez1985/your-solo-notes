import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Music, Download, Loader2, Upload, Sparkles, Guitar } from "lucide-react";
import { detectPitch, generateGuiTabs, generateBassTabs, generatePianoNotation, generateNotesGroupedByMinute, extractFretboardNotes } from "@/utils/audioAnalyzer";
import { TabRenderer } from "@/components/TabRenderer";
import { Fretboard } from "@/components/Fretboard";

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
  const [notesGrouped, setNotesGrouped] = useState<{ minute: number; guitar: string; bass: string }[]>([]);
  const [guitarFretboardNotes, setGuitarFretboardNotes] = useState<Array<{ string: string; fret: number }>>([]);
  const [bassFretboardNotes, setBassFretboardNotes] = useState<Array<{ string: string; fret: number }>>([]);

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
      const groupedByMinute = generateNotesGroupedByMinute(detectedNotes);
      const guitarFrets = extractFretboardNotes(detectedNotes, "guitar");
      const bassFrets = extractFretboardNotes(detectedNotes, "bass");

      setTabs([
        { instrument: "🎸 Guitarra", notation: guitarTab },
        { instrument: "🎸 Bajo", notation: bassTab },
        { instrument: "🎹 Piano", notation: pianoNotes },
      ]);
      setNotesGrouped(groupedByMinute);
      setGuitarFretboardNotes(guitarFrets);
      setBassFretboardNotes(bassFrets);
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

          <div className="space-y-8">
            {/* Fretboards */}
            {guitarFretboardNotes.length > 0 && (
              <div className="rounded-2xl border border-border bg-gradient-card p-5 shadow-elegant">
                <h3 className="font-semibold mb-4 text-sm">🎸 Guitarra - Diapasón</h3>
                <Fretboard notes={guitarFretboardNotes} instrument="guitar" />
              </div>
            )}

            {bassFretboardNotes.length > 0 && (
              <div className="rounded-2xl border border-border bg-gradient-card p-5 shadow-elegant">
                <h3 className="font-semibold mb-4 text-sm">🎸 Bajo - Diapasón</h3>
                <Fretboard notes={bassFretboardNotes} instrument="bass" />
              </div>
            )}

            {/* Tabs */}
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
              <h2 className="font-semibold mb-6 text-lg">Notas Detectadas por Minuto</h2>
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
