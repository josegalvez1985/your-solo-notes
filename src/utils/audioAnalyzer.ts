interface Note {
  frequency: number;
  note: string;
  octave: number;
  time: number;
  confidence: number;
}

const NOTES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

export const frequencyToMidi = (frequency: number): number => {
  return Math.round(12 * Math.log2(frequency / 440) + 69);
};

export const frequencyToNote = (frequency: number): { note: string; octave: number } => {
  if (frequency <= 0) return { note: "", octave: 0 };

  const midiNote = frequencyToMidi(frequency);
  const noteIndex = midiNote % 12;
  const octave = Math.floor(midiNote / 12) - 1;

  return {
    note: NOTES[noteIndex < 0 ? noteIndex + 12 : noteIndex],
    octave,
  };
};

export const detectPitch = async (audioBuffer: AudioBuffer): Promise<Note[]> => {
  const channelData = audioBuffer.getChannelData(0);
  const sampleRate = audioBuffer.sampleRate;
  const notes: Note[] = [];

  const frameSize = 4096;
  const hopSize = frameSize / 2;

  for (let i = 0; i < channelData.length - frameSize; i += hopSize) {
    const frame = new Float32Array(frameSize);
    for (let j = 0; j < frameSize; j++) {
      frame[j] = channelData[i + j] || 0;
    }

    const { frequency, confidence } = detectFramePitch(frame, sampleRate);

    if (frequency > 60 && frequency < 2000 && confidence > 0.7) {
      const { note, octave } = frequencyToNote(frequency);
      const time = i / sampleRate;

      // Evitar duplicados muy cercanos
      const lastNote = notes[notes.length - 1];
      if (
        !lastNote ||
        Math.abs(lastNote.frequency - frequency) > 10 ||
        time - lastNote.time > 0.1
      ) {
        notes.push({ frequency, note, octave, time, confidence });
      }
    }
  }

  return notes;
};

const detectFramePitch = (
  frame: Float32Array,
  sampleRate: number
): { frequency: number; confidence: number } => {
  const autoCorr = computeAutoCorrelation(frame);
  if (!autoCorr || autoCorr.length === 0) {
    return { frequency: -1, confidence: 0 };
  }

  let bestOffset = 0;
  let maxCorr = 0;

  const minPeriod = Math.floor(sampleRate / 2000);
  const maxPeriod = Math.floor(sampleRate / 60);

  for (let offset = minPeriod; offset < maxPeriod && offset < autoCorr.length; offset++) {
    if (autoCorr[offset] > maxCorr) {
      maxCorr = autoCorr[offset];
      bestOffset = offset;
    }
  }

  if (bestOffset === 0 || maxCorr === 0) {
    return { frequency: -1, confidence: 0 };
  }

  const frequency = sampleRate / bestOffset;
  const confidence = Math.min(maxCorr, 1.0);

  return { frequency, confidence };
};

const computeAutoCorrelation = (frame: Float32Array): Float32Array | null => {
  const result = new Float32Array(frame.length);
  const length = frame.length;

  for (let lag = 0; lag < length; lag++) {
    let sum = 0;
    for (let i = 0; i < length - lag; i++) {
      sum += frame[i] * frame[i + lag];
    }
    result[lag] = sum / (length - lag);
  }

  // Normalizar
  const maxVal = Math.max(...Array.from(result));
  if (maxVal > 0) {
    for (let i = 0; i < result.length; i++) {
      result[i] /= maxVal;
    }
  }

  return result;
};

export const generateGuiTabs = (notes: Note[]): string => {
  if (notes.length === 0) return "No se detectaron notas para guitarra";

  const strings: Record<string, (number | string)[]> = {
    e: [], B: [], G: [], D: [], A: [], E: [],
  };

  const standardTuning: Record<string, number> = {
    E: 40, A: 45, D: 50, G: 55, B: 59, e: 64,
  };

  for (const note of notes) {
    const midiNote = frequencyToMidi(note.frequency);
    let placed = false;

    for (const [string, tuning] of Object.entries(standardTuning)) {
      const fret = midiNote - tuning;
      if (fret >= 0 && fret <= 22) {
        strings[string].push(fret);
        placed = true;
        break;
      }
    }

    if (!placed) {
      strings.e.push("-");
    }
  }

  let tab = "";
  tab += "e|" + strings.e.map((f) => String(f).padStart(2, "-")).join("-") + "|\n";
  tab += "B|" + strings.B.map((f) => String(f).padStart(2, "-")).join("-") + "|\n";
  tab += "G|" + strings.G.map((f) => String(f).padStart(2, "-")).join("-") + "|\n";
  tab += "D|" + strings.D.map((f) => String(f).padStart(2, "-")).join("-") + "|\n";
  tab += "A|" + strings.A.map((f) => String(f).padStart(2, "-")).join("-") + "|\n";
  tab += "E|" + strings.E.map((f) => String(f).padStart(2, "-")).join("-") + "|\n";

  return tab || "No se pudieron generar tablaturas";
};

export const generateBassTabs = (notes: Note[]): string => {
  if (notes.length === 0) return "No se detectaron notas para bajo";

  const strings: Record<string, (number | string)[]> = { G: [], D: [], A: [], E: [] };
  const bassTuning: Record<string, number> = { E: 28, A: 33, D: 38, G: 43 };

  for (const note of notes) {
    const midiNote = frequencyToMidi(note.frequency);
    let placed = false;

    for (const [string, tuning] of Object.entries(bassTuning)) {
      const fret = midiNote - tuning;
      if (fret >= 0 && fret <= 24) {
        strings[string].push(fret);
        placed = true;
        break;
      }
    }

    if (!placed) {
      strings.E.push("-");
    }
  }

  let tab = "";
  tab += "G|" + strings.G.map((f) => String(f).padStart(2, "-")).join("-") + "|\n";
  tab += "D|" + strings.D.map((f) => String(f).padStart(2, "-")).join("-") + "|\n";
  tab += "A|" + strings.A.map((f) => String(f).padStart(2, "-")).join("-") + "|\n";
  tab += "E|" + strings.E.map((f) => String(f).padStart(2, "-")).join("-") + "|\n";

  return tab || "No se pudieron generar tablaturas";
};

export const generatePianoNotation = (notes: Note[]): string => {
  if (notes.length === 0) return "No se detectaron notas para piano";

  let notation = "Tiempo | Nota | Octava | Confianza\n";
  notation += "-------|------|--------|----------\n";

  const groupedNotes: Note[] = [];
  let lastTime = -1;

  for (const note of notes) {
    if (note.time - lastTime > 0.1) {
      groupedNotes.push(note);
      lastTime = note.time;
    }
  }

  for (const note of groupedNotes) {
    const confidence = (note.confidence * 100).toFixed(0);
    notation += `${note.time.toFixed(2)}s | ${note.note.padEnd(4)} | ${note.octave.toString().padEnd(6)} | ${confidence}%\n`;
  }

  return notation || "No se detectaron notas";
};
