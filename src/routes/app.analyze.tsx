import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Music, Download, Loader2, AlertCircle, Upload } from "lucide-react";
import { detectPitch, generateGuiTabs, generateBassTabs, generatePianoNotation } from "@/utils/audioAnalyzer";

interface TabLine {
  instrument: string;
  notation: string;
}

// Configurar la URL del backend
const API_URL = process.env.NODE_ENV === "production"
  ? "https://tusolo-backend.onrender.com"
  : "http://localhost:3001";

export const Route = createFileRoute("/app/analyze")({
  component: AnalyzePage,
  validateSearch: (search: Record<string, any>) => ({
    url: search.url as string,
  }),
});

function AnalyzePage() {
  const search = Route.useSearch();
  const [youtubeUrl, setYoutubeUrl] = useState(search.url || "");
  const [isProcessing, setIsProcessing] = useState(false);
  const [tabs, setTabs] = useState<TabLine[]>([]);
  const [error, setError] = useState<string>("");
  const [fileName, setFileName] = useState<string>("");
  const [progress, setProgress] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (search.url) {
      setYoutubeUrl(search.url);
    }
  }, [search.url]);

  const extractVideoId = (url: string): string | null => {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/,
      /^([a-zA-Z0-9_-]{11})$/,
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    return null;
  };

  const analyzeAudioBuffer = async (audioBuffer: AudioBuffer, name: string) => {
    setFileName(name);
    setProgress("Detectando notas...");

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
      setError(`Error al procesar archivo: ${message}`);
    } finally {
      setIsProcessing(false);
      setProgress("");
    }
  };

  const handleYoutubeUrl = async () => {
    if (!youtubeUrl.trim()) {
      setError("Por favor ingresa una URL de YouTube");
      return;
    }

    setIsProcessing(true);
    setError("");
    setTabs([]);
    setProgress("");

    try {
      const videoId = extractVideoId(youtubeUrl);
      if (!videoId) {
        throw new Error("URL de YouTube inválida");
      }

      setFileName(`YouTube: ${videoId}`);
      setProgress("Descargando audio desde YouTube...");

      const response = await fetch(`${API_URL}/api/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoUrl: youtubeUrl }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Error descargando audio");
      }

      setProgress("Procesando audio...");
      const data = await response.json();

      const binaryString = atob(data.audioBase64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const audioBuffer = await audioContext.decodeAudioData(bytes.buffer);

      await analyzeAudioBuffer(audioBuffer, `YouTube: ${videoId}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error desconocido";
      setError(message);
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
        <h1 className="text-2xl font-bold">Analizar Canción</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Pega un enlace de YouTube o carga un archivo de audio para extraer tablaturas
        </p>

        <div className="mt-6 space-y-4">
          {/* YouTube Input */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Enlace de YouTube</label>
            <div className="flex gap-2">
              <Input
                type="url"
                placeholder="https://youtube.com/watch?v=..."
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleYoutubeUrl()}
              />
              <Button
                onClick={handleYoutubeUrl}
                disabled={isProcessing || !youtubeUrl.trim()}
                size="lg"
              >
                Analizar
              </Button>
            </div>
          </div>

          {/* File Upload */}
          <div>
            <label className="text-sm font-medium block mb-2">O carga un archivo de audio</label>
            <div
              onClick={() => fileInputRef.current?.click()}
              className="cursor-pointer rounded-lg border-2 border-dashed border-border p-8 text-center transition-colors hover:border-primary hover:bg-muted/50"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="audio/*"
                onChange={handleFileUpload}
                className="hidden"
              />
              <Upload className="mx-auto h-8 w-8 text-muted-foreground" />
              <p className="mt-2 font-medium text-sm">Haz clic para cargar un archivo</p>
              <p className="text-xs text-muted-foreground">MP3, WAV, FLAC, M4A, etc.</p>
            </div>
          </div>

          {fileName && (
            <div className="rounded-lg bg-muted p-3 text-sm">
              📁 <span className="font-medium">{fileName}</span>
            </div>
          )}

          {isProcessing && (
            <div className="flex items-center gap-2 rounded-lg bg-muted p-4">
              <Loader2 className="h-5 w-5 animate-spin" />
              <div>
                <p className="font-medium text-sm">Procesando...</p>
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
              <h2 className="font-semibold">Tablaturas Analizadas</h2>
            </div>
            <Button onClick={downloadTab} size="sm" variant="outline">
              <Download className="h-4 w-4" />
              Descargar
            </Button>
          </div>

          <div className="space-y-6">
            {tabs.map((tab, idx) => (
              <div key={idx}>
                <h3 className="mb-3 font-medium text-sm">{tab.instrument}</h3>
                <pre className="overflow-x-auto rounded-lg bg-muted p-4 font-mono text-xs leading-relaxed">
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
