import { Capacitor, registerPlugin } from "@capacitor/core";
import { Filesystem, Directory } from "@capacitor/filesystem";

interface ExtractResult {
  path: string;
  absolutePath: string;
  title: string;
  duration: number;
  mimeType: string;
  bitrate: number;
}

interface YoutubePluginInterface {
  extractAndDownload(options: { url: string }): Promise<ExtractResult>;
}

const Youtube = registerPlugin<YoutubePluginInterface>("Youtube");

export interface YoutubeAudio {
  audioBuffer: AudioBuffer;
  title: string;
  playbackUrl: string;
  duration: number;
}

export type YoutubeErrorKind =
  | "platform"
  | "invalidUrl"
  | "network"
  | "private"
  | "noAudio"
  | "decode"
  | "unknown";

export class YoutubeError extends Error {
  kind: YoutubeErrorKind;
  retryable: boolean;
  constructor(kind: YoutubeErrorKind, message: string, retryable = false) {
    super(message);
    this.kind = kind;
    this.retryable = retryable;
  }
}

const YT_REGEX = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be|m\.youtube\.com)\/.+/i;

export function isValidYoutubeUrl(url: string): boolean {
  return YT_REGEX.test(url.trim());
}

export function isNativeAvailable(): boolean {
  return Capacitor.isNativePlatform();
}

const classifyError = (raw: string): YoutubeError => {
  const lower = raw.toLowerCase();
  if (lower.includes("private") || lower.includes("403")) {
    return new YoutubeError("private", "El video es privado o no está disponible.");
  }
  if (lower.includes("no se encontraron streams") || lower.includes("no audio")) {
    return new YoutubeError("noAudio", "Este video no tiene pista de audio.");
  }
  if (
    lower.includes("network") ||
    lower.includes("timeout") ||
    lower.includes("unknownhost") ||
    lower.includes("connect")
  ) {
    return new YoutubeError("network", "Sin conexión. Verifica tu internet.", true);
  }
  if (lower.includes("decode")) {
    return new YoutubeError("decode", "No se pudo decodificar el audio.", true);
  }
  return new YoutubeError("unknown", raw || "Error desconocido", true);
};

export async function fetchYoutubeAudio(url: string): Promise<YoutubeAudio> {
  if (!Capacitor.isNativePlatform()) {
    throw new YoutubeError(
      "platform",
      "La extracción de YouTube solo funciona en la app instalada en Android.",
    );
  }

  if (!isValidYoutubeUrl(url)) {
    throw new YoutubeError("invalidUrl", "URL inválida. Pega un link de YouTube válido.");
  }

  let result: ExtractResult;
  try {
    result = await Youtube.extractAndDownload({ url });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw classifyError(msg);
  }

  let bytes: Uint8Array;
  try {
    const fileResult = await Filesystem.readFile({
      path: result.path,
      directory: Directory.Cache,
    });
    const base64 = fileResult.data as string;
    const binary = atob(base64);
    bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new YoutubeError("decode", `No se pudo leer el archivo descargado: ${msg}`, true);
  }

  const AudioCtx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const audioContext = new AudioCtx();

  let audioBuffer: AudioBuffer;
  try {
    audioBuffer = await audioContext.decodeAudioData(bytes.buffer as ArrayBuffer);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new YoutubeError("decode", `No se pudo decodificar el audio: ${msg}`, true);
  } finally {
    audioContext.close().catch(() => {});
  }

  const playbackUrl = Capacitor.convertFileSrc(result.absolutePath);

  return {
    audioBuffer,
    title: result.title,
    playbackUrl,
    duration: result.duration,
  };
}
