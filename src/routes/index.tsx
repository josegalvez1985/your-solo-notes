import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Music, Download, Loader2, AlertCircle, Upload, Play, Pause } from "lucide-react";
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
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
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

    try {
      // Crear URL para reproducción
      const audioUrl = URL.createObjectURL(file);
      if (audioRef.current) {
        audioRef.current.src = audioUrl;
      }

      // Analizar audio
      const arrayBuffer = await file.arrayBuffer();
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

      const detectedNotes = await detectPitch(audioBuffer);

      if (detectedNotes.length === 0) {
        throw new Error("No se detectaron notas. Intenta con otro archivo.");
      }

      // Guardar todas las notas detectadas para usar en tiempo real
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

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);

      // Mostrar nota actual según el tiempo
      if (allNotesRef.current.length > 0) {
        const currentNotesList = allNotesRef.current.filter(
          (note) =>
            note.time <= audio.currentTime &&
            note.time + 0.5 > audio.currentTime // Mostrar nota si está dentro de 0.5 seg
        );

        if (currentNotesList.length > 0) {
          const latest = currentNotesList[currentNotesList.length - 1];
          setCurrentNotes({
            guitar: `${latest.note}${latest.octave}`,
            bass: `${latest.note}${latest.octave}`,
            piano: `${latest.note}${latest.octave}`,
          });
        }
      }
    };

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("play", handlePlay);
    audio.addEventListener("pause", handlePause);

    return () => {
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("pause", handlePause);
    };
  }, []);

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
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

  const formatTime = (seconds: number) => {
    if (!seconds) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="rounded-2xl border border-border bg-gradient-card p-6 shadow-elegant">
        <h1 className="text-2xl font-bold">Extrae Tablaturas en Vivo</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Carga tu música y mira las tablaturas mientras suena
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
            <p className="mt-3 font-semibold text-lg">Carga tu archivo</p>
            <p className="text-sm text-muted-foreground mt-1">MP3, WAV, MP4, etc.</p>
          </div>

          {isProcessing && (
            <div className="flex items-center gap-3 rounded-lg bg-muted p-4">
              <Loader2 className="h-6 w-6 animate-spin flex-shrink-0" />
              <div>
                <p className="font-medium">Procesando...</p>
                <p className="text-xs text-muted-foreground">Analizando notas</p>
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2 rounded-lg bg-destructive/10 p-4 text-destructive">
              <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
              <p className="text-sm">{error}</p>
            </div>
          )}

          {/* Audio Player */}
          {tabs.length > 0 && (
            <div className="space-y-3 rounded-lg border border-border p-4 bg-muted/50">
              <div className="flex items-center gap-3">
                <Button
                  size="sm"
                  variant="hero"
                  onClick={togglePlay}
                  className="h-10 w-10 p-0"
                >
                  {isPlaying ? (
                    <Pause className="h-5 w-5" />
                  ) : (
                    <Play className="h-5 w-5" />
                  )}
                </Button>
                <div className="flex-1">
                  <div className="h-1 bg-border rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all"
                      style={{
                        width: `${duration ? (currentTime / duration) * 100 : 0}%`,
                      }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>{formatTime(currentTime)}</span>
                    <span>{formatTime(duration)}</span>
                  </div>
                </div>
              </div>
              <audio ref={audioRef} />
              <p className="text-xs text-muted-foreground text-center">
                {fileName}
              </p>
            </div>
          )}
        </div>
      </div>

      {tabs.length > 0 && (
        <div className="space-y-4">
          {/* Current Notes Display */}
          {(currentNotes.guitar || currentNotes.bass || currentNotes.piano) && (
            <Card className="p-6 bg-primary/5">
              <h2 className="font-semibold mb-4">Nota Actual</h2>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-4 rounded-lg bg-background border border-border">
                  <p className="text-xs text-muted-foreground mb-2">🎸 Guitarra</p>
                  <p className="text-2xl font-bold text-primary">
                    {currentNotes.guitar || "-"}
                  </p>
                </div>
                <div className="text-center p-4 rounded-lg bg-background border border-border">
                  <p className="text-xs text-muted-foreground mb-2">🎸 Bajo</p>
                  <p className="text-2xl font-bold text-primary">
                    {currentNotes.bass || "-"}
                  </p>
                </div>
                <div className="text-center p-4 rounded-lg bg-background border border-border">
                  <p className="text-xs text-muted-foreground mb-2">🎹 Piano</p>
                  <p className="text-2xl font-bold text-primary">
                    {currentNotes.piano || "-"}
                  </p>
                </div>
              </div>
            </Card>
          )}

          {/* Tablaturas */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Music className="h-5 w-5" />
              <h2 className="font-semibold">Tablaturas Completas</h2>
            </div>
            <Button onClick={downloadTab} size="sm" variant="outline">
              <Download className="h-4 w-4" />
              Descargar
            </Button>
          </div>

          <div className="space-y-4">
            {tabs.map((tab, idx) => (
              <Card key={idx} className="p-4">
                <h3 className="font-medium mb-3">{tab.instrument}</h3>
                <pre className="overflow-x-auto bg-muted p-3 rounded text-xs leading-relaxed whitespace-pre-wrap break-words">
                  {tab.notation}
                </pre>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
