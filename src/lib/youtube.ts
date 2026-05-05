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
}

export function isNativeAvailable(): boolean {
  return Capacitor.isNativePlatform();
}

export async function fetchYoutubeAudio(url: string): Promise<YoutubeAudio> {
  if (!Capacitor.isNativePlatform()) {
    throw new Error(
      "La extracción de YouTube solo funciona en la app instalada en Android.",
    );
  }

  const result = await Youtube.extractAndDownload({ url });

  const fileResult = await Filesystem.readFile({
    path: result.path,
    directory: Directory.Cache,
  });

  const base64 = fileResult.data as string;
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

  const audioContext = new (window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
  const audioBuffer = await audioContext.decodeAudioData(bytes.buffer);

  const playbackUrl = Capacitor.convertFileSrc(result.absolutePath);

  return { audioBuffer, title: result.title, playbackUrl };
}
