import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Logo } from "@/components/Logo";
import { Upload, Guitar, Sparkles, Loader2 } from "lucide-react";
import { useState, useRef } from "react";
import { detectPitch, generateGuiTabs, generateBassTabs, generatePianoNotation } from "@/utils/audioAnalyzer";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [tabs, setTabs] = useState<{ instrument: string; notation: string }[]>([]);
  const [error, setError] = useState("");
  const [fileName, setFileName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setError("");
    setTabs([]);
    setFileName(file.name);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

      const detectedNotes = await detectPitch(audioBuffer);

      if (detectedNotes.length === 0) {
        throw new Error("No se detectaron notas. Intenta con otro archivo.");
      }

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
        <Logo />
        {/* <Link to="/login">
          <Button variant="ghost">Entrar</Button>
        </Link> */}
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

        {isProcessing && (
          <div className="mx-auto mt-6 max-w-md flex items-center justify-center gap-2 rounded-lg bg-muted p-4">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-sm">Analizando...</span>
          </div>
        )}

        {error && (
          <div className="mx-auto mt-6 max-w-md rounded-lg bg-destructive/10 p-4 text-sm text-destructive">
            {error}
          </div>
        )}

        {tabs.length > 0 && (
          <div className="mx-auto mt-8 max-w-2xl space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold">Tablaturas Extraídas</h2>
              <Button onClick={downloadTab} size="sm" variant="outline">
                Descargar
              </Button>
            </div>
            <div className="space-y-4">
              {tabs.map((tab, idx) => (
                <div key={idx} className="rounded-lg border border-border p-4">
                  <h3 className="font-medium mb-2">{tab.instrument}</h3>
                  <pre className="overflow-x-auto bg-muted p-3 rounded text-xs leading-relaxed">
                    {tab.notation}
                  </pre>
                </div>
              ))}
            </div>
          </div>
        )}

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
      </main>
    </div>
  );
}
