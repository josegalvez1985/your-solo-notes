import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Music, Download, Loader2, AlertCircle, Upload } from "lucide-react";
import { detectPitch, generateGuiTabs, generateBassTabs, generatePianoNotation } from "@/utils/audioAnalyzer";

interface TabLine {
  instrument: string;
  notation: string;
}

export const Route = createFileRoute("/app/analyze")({
  component: AnalyzePage,
});

function AnalyzePage() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [tabs, setTabs] = useState<TabLine[]>([]);
  const [error, setError] = useState<string>("");
  const [fileName, setFileName] = useState<string>("");
  const [progress, setProgress] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const analyzeAudioBuffer = async (audioBuffer: AudioBuffer, name: string) => {
    setFileName(name);
    setProgress("Detectando notas del solo...");

    const detectedNotes = await detectPitch(audioBuffer);

    if (detectedNotes.length === 0) {
      throw new Error("No se detectaron notas en el audio. Intenta con otro archivo.");
    }

    setProgress("Generando tablaturas...");
    const guitarTab = generateGuiTabs(detectedNotes);
    const bassTab = generateBassTabs(detectedNotes);
    const pianoNotes = generatePianoNotation(detectedNotes);

    setTabs([
      { instrument: "🎸 Guitarra", notation: guitarTab },
      { instrument: "🎸 Bajo", notation: bassTab },
      { instrument: "🎹 Piano", notation: pianoNotes },
    ]);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setError("");
    setTabs([]);
    setProgress("");

    try {
      const arrayBuffer = await file.arrayBuffer();
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

      await analyzeAudioBuffer(audioBuffer, file.name);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error desconocido";
      setError(`Error: ${message}`);
    } finally {
      setIsProcessing(false);
      setProgress("");
    }
  };

  const downloadTab = () => {
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
    <div className="space-y-6 pb-12">
      <div className="rounded-2xl border border-border bg-gradient-card p-6 shadow-elegant">
        <h1 className="text-2xl font-bold">Extraer Solos de Música</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Carga un archivo de audio o video para extraer las tablaturas de guitarra, bajo y piano
        </p>

        <div className="mt-6 space-y-4">
          {/* File Upload */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className="cursor-pointer rounded-lg border-2 border-dashed border-border p-12 text-center transition-colors hover:border-primary hover:bg-muted/50"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*,video/*"
              onChange={handleFileUpload}
              disabled={isProcessing}
              className="hidden"
            />
            <Upload className="mx-auto h-12 w-12 text-muted-foreground" />
            <p className="mt-3 font-semibold text-lg">Haz clic para cargar un archivo</p>
            <p className="text-sm text-muted-foreground mt-1">
              Audio: MP3, WAV, FLAC, M4A, OGG
            </p>
            <p className="text-sm text-muted-foreground">
              Video: MP4, WebM, Ogg
            </p>
          </div>

          {fileName && (
            <div className="rounded-lg bg-muted p-3 text-sm">
              📁 <span className="font-medium">{fileName}</span>
            </div>
          )}

          {isProcessing && (
            <div className="flex items-center gap-3 rounded-lg bg-muted p-4">
              <Loader2 className="h-6 w-6 animate-spin flex-shrink-0" />
              <div>
                <p className="font-medium">Procesando...</p>
                <p className="text-xs text-muted-foreground">{progress}</p>
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2 rounded-lg bg-destructive/10 p-4 text-destructive">
              <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
              <p className="text-sm">{error}</p>
            </div>
          )}
        </div>
      </div>

      {tabs.length > 0 && (
        <Card className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Music className="h-5 w-5" />
              <h2 className="font-semibold">Tablaturas Extraídas</h2>
            </div>
            <Button onClick={downloadTab} size="sm" variant="outline">
              <Download className="h-4 w-4" />
              Descargar
            </Button>
          </div>

          <div className="space-y-6">
            {tabs.map((tab, idx) => (
              <div key={idx}>
                <h3 className="mb-3 font-medium">{tab.instrument}</h3>
                <pre className="overflow-x-auto rounded-lg bg-muted p-4 font-mono text-xs leading-relaxed whitespace-pre-wrap break-words">
                  {tab.notation}
                </pre>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
