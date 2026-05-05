import express from "express";
import cors from "cors";
import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

app.use(cors());
app.use(express.json());

const TEMP_DIR = path.join(__dirname, "temp_audio");
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

app.post("/api/analyze", async (req, res) => {
  const { videoUrl } = req.body;

  if (!videoUrl) {
    return res.status(400).json({ error: "URL requerida" });
  }

  try {
    const videoIdMatch = videoUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    if (!videoIdMatch) {
      return res.status(400).json({ error: "URL de YouTube inválida" });
    }

    const videoId = videoIdMatch[1];
    const audioFile = path.join(TEMP_DIR, `${videoId}.wav`);

    if (!fs.existsSync(audioFile)) {
      await downloadAudio(videoUrl, audioFile);
    }

    if (!fs.existsSync(audioFile)) {
      return res.status(500).json({ error: "No se pudo descargar el audio" });
    }

    const audioBuffer = fs.readFileSync(audioFile);
    const base64Audio = audioBuffer.toString("base64");

    res.json({
      success: true,
      videoId,
      audioBase64: base64Audio,
      duration: Math.floor(audioBuffer.length / 44100 / 2),
    });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Error procesando video" });
  }
});

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Servidor escuchando en puerto ${PORT}`);
});

function downloadAudio(videoUrl, outputPath) {
  return new Promise((resolve, reject) => {
    const child = spawn("yt-dlp", [
      "-f", "bestaudio",
      "-x",
      "--audio-format", "wav",
      "--audio-quality", "192K",
      "-o", outputPath,
      videoUrl
    ]);

    child.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`yt-dlp error: ${code}`));
      }
    });

    child.stderr.on("data", (data) => {
      console.error(`stderr: ${data}`);
    });
  });
}
