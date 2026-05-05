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

  // Limitar análisis a 60 segundos máximo para no bloquear UI
  const maxSamples = Math.min(sampleRate * 60, channelData.length);
  const frameSize = 2048; // Reducir tamaño de frame para más velocidad
  const hopSize = frameSize; // Sin solapamiento para más velocidad

  for (let i = 0; i < maxSamples - frameSize; i += hopSize) {
    // Permitir que el navegador responda cada 0.5 segundos
    if (i % (sampleRate / 2) === 0) {
      await new Promise((resolve) => setTimeout(resolve, 0));
    }

    const frame = new Float32Array(frameSize);
    for (let j = 0; j < frameSize; j++) {
      frame[j] = channelData[i + j] || 0;
    }

    const { frequency, confidence } = detectFramePitch(frame, sampleRate);

    if (frequency > 60 && frequency < 2000 && confidence > 0.6) {
      const { note, octave } = frequencyToNote(frequency);
      const time = i / sampleRate;

      const lastNote = notes[notes.length - 1];
      if (
        !lastNote ||
        Math.abs(lastNote.frequency - frequency) > 15 ||
        time - lastNote.time > 0.15
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
  // Usar FFT simplificado en lugar de autocorrelación completa
  const rms = Math.sqrt(
    frame.reduce((sum, s) => sum + s * s, 0) / frame.length
  );

  if (rms < 0.01) {
    return { frequency: -1, confidence: 0 };
  }

  const autoCorr = computeAutoCorrelationFast(frame);
  if (!autoCorr) {
    return { frequency: -1, confidence: 0 };
  }

  let bestOffset = 0;
  let maxCorr = 0;

  const minPeriod = Math.floor(sampleRate / 2000);
  const maxPeriod = Math.floor(sampleRate / 50);

  for (let offset = minPeriod; offset < Math.min(maxPeriod, autoCorr.length); offset++) {
    if (autoCorr[offset] > maxCorr) {
      maxCorr = autoCorr[offset];
      bestOffset = offset;
    }
  }

  if (bestOffset === 0 || maxCorr < 0.5) {
    return { frequency: -1, confidence: 0 };
  }

  const frequency = sampleRate / bestOffset;
  const confidence = Math.min(maxCorr, 1.0);

  return { frequency, confidence };
};

const computeAutoCorrelationFast = (frame: Float32Array): Float32Array | null => {
  const length = Math.min(frame.length, 2048); // Limitar a 2048 para velocidad
  const result = new Float32Array(length);

  let sum = 0;
  for (let i = 0; i < length; i++) {
    sum += frame[i] * frame[i];
  }

  if (sum === 0) return null;

  result[0] = 1;

  for (let lag = 1; lag < length; lag++) {
    let corr = 0;
    for (let i = 0; i < length - lag; i++) {
      corr += frame[i] * frame[i + lag];
    }
    result[lag] = corr / sum;
  }

  return result;
};

export const generateGuiTabs = (notes: Note[]): string => {
  if (notes.length === 0) return "No se detectaron notas para guitarra";

  const stringOrder = ["e", "B", "G", "D", "A", "E"];
  const standardTuning: Record<string, number> = {
    e: 64, B: 59, G: 55, D: 50, A: 45, E: 40,
  };

  const groupedNotes = [];
  let lastTime = -1;

  for (const note of notes) {
    if (note.time - lastTime > 0.2) {
      groupedNotes.push(note);
      lastTime = note.time;
    }
  }

  // Crear matriz de cuerdas
  const strings: Record<string, string[]> = {
    e: [], B: [], G: [], D: [], A: [], E: [],
  };

  for (const note of groupedNotes) {
    const midiNote = frequencyToMidi(note.frequency);
    let placed = false;

    for (const stringName of stringOrder) {
      const tuning = standardTuning[stringName];
      const fret = midiNote - tuning;
      if (fret >= 0 && fret <= 22) {
        strings[stringName].push(String(fret).padStart(2, "-"));
        placed = true;
        break;
      }
    }

    if (!placed) {
      for (const stringName of stringOrder) {
        strings[stringName].push("--");
      }
    }

    // Agregar separadores para las cuerdas que no fueron utilizadas
    if (placed) {
      for (const stringName of stringOrder) {
        if (!strings[stringName][strings[stringName].length - 1]?.startsWith("-")) {
          // Ya fue agregado
        } else if (strings[stringName][strings[stringName].length - 1] === "--") {
          // Ya fue agregado como vacío
        } else {
          strings[stringName].push("--");
        }
      }
    }
  }

  // Normalizar longitudes
  const maxLen = Math.max(...Object.values(strings).map((s) => s.length));
  for (const stringName of stringOrder) {
    while (strings[stringName].length < maxLen) {
      strings[stringName].push("--");
    }
  }

  let tab = "";
  tab += "e|" + strings.e.join("-") + "|\n";
  tab += "B|" + strings.B.join("-") + "|\n";
  tab += "G|" + strings.G.join("-") + "|\n";
  tab += "D|" + strings.D.join("-") + "|\n";
  tab += "A|" + strings.A.join("-") + "|\n";
  tab += "E|" + strings.E.join("-") + "|\n";

  return tab || "No se pudieron generar tablaturas";
};

export const generateBassTabs = (notes: Note[]): string => {
  if (notes.length === 0) return "No se detectaron notas para bajo";

  const stringOrder = ["G", "D", "A", "E"];
  const bassTuning: Record<string, number> = { G: 43, D: 38, A: 33, E: 28 };

  const groupedNotes = [];
  let lastTime = -1;

  for (const note of notes) {
    if (note.time - lastTime > 0.2) {
      groupedNotes.push(note);
      lastTime = note.time;
    }
  }

  // Crear matriz de cuerdas
  const strings: Record<string, string[]> = {
    G: [], D: [], A: [], E: [],
  };

  for (const note of groupedNotes) {
    const midiNote = frequencyToMidi(note.frequency);
    let placed = false;

    for (const stringName of stringOrder) {
      const tuning = bassTuning[stringName];
      const fret = midiNote - tuning;
      if (fret >= 0 && fret <= 24) {
        strings[stringName].push(String(fret).padStart(2, "-"));
        placed = true;
        break;
      }
    }

    if (!placed) {
      for (const stringName of stringOrder) {
        strings[stringName].push("--");
      }
    }

    // Agregar separadores para las cuerdas que no fueron utilizadas
    if (placed) {
      for (const stringName of stringOrder) {
        if (!strings[stringName][strings[stringName].length - 1]?.startsWith("-")) {
          // Ya fue agregado
        } else if (strings[stringName][strings[stringName].length - 1] === "--") {
          // Ya fue agregado como vacío
        } else {
          strings[stringName].push("--");
        }
      }
    }
  }

  // Normalizar longitudes
  const maxLen = Math.max(...Object.values(strings).map((s) => s.length));
  for (const stringName of stringOrder) {
    while (strings[stringName].length < maxLen) {
      strings[stringName].push("--");
    }
  }

  let tab = "";
  tab += "G|" + strings.G.join("-") + "|\n";
  tab += "D|" + strings.D.join("-") + "|\n";
  tab += "A|" + strings.A.join("-") + "|\n";
  tab += "E|" + strings.E.join("-") + "|\n";

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

export const extractFretboardNotes = (
  notes: Note[],
  instrument: "guitar" | "bass"
): Array<{ string: string; fret: number }> => {
  if (notes.length === 0) return [];

  const stringTuning =
    instrument === "guitar"
      ? { e: 64, B: 59, G: 55, D: 50, A: 45, E: 40 }
      : { G: 43, D: 38, A: 33, E: 28 };

  const result: Array<{ string: string; fret: number }> = [];
  const stringOrder = instrument === "guitar" ? ["e", "B", "G", "D", "A", "E"] : ["G", "D", "A", "E"];

  const groupedNotes = [];
  let lastTime = -1;

  for (const note of notes) {
    if (note.time - lastTime > 0.2) {
      groupedNotes.push(note);
      lastTime = note.time;
    }
  }

  for (const note of groupedNotes) {
    const midiNote = frequencyToMidi(note.frequency);

    for (const stringName of stringOrder) {
      const tuning = stringTuning[stringName as keyof typeof stringTuning];
      const fret = midiNote - tuning;
      if (fret >= 0 && fret <= (instrument === "guitar" ? 22 : 24)) {
        result.push({ string: stringName, fret });
        break;
      }
    }
  }

  return result;
};

export const generateNotesGroupedByMinute = (notes: Note[]): { minute: number; guitar: string; bass: string }[] => {
  if (notes.length === 0) return [];

  const groupedByMinute: { [key: number]: Note[] } = {};

  for (const note of notes) {
    const minute = Math.floor(note.time / 60);
    if (!groupedByMinute[minute]) {
      groupedByMinute[minute] = [];
    }
    groupedByMinute[minute].push(note);
  }

  const standardTuning: Record<string, number> = {
    E: 40, A: 45, D: 50, G: 55, B: 59, e: 64,
  };
  const bassTuning: Record<string, number> = { E: 28, A: 33, D: 38, G: 43 };

  const result: { minute: number; guitar: string; bass: string }[] = [];

  for (const [minute, minuteNotes] of Object.entries(groupedByMinute)) {
    const guitarFrets: string[] = [];
    const bassFrets: string[] = [];

    for (const note of minuteNotes) {
      const midiNote = frequencyToMidi(note.frequency);

      // Guitar
      let guitarPlaced = false;
      for (const stringName of ["E", "A", "D", "G", "B", "e"]) {
        const fret = midiNote - standardTuning[stringName];
        if (fret >= 0 && fret <= 22) {
          guitarFrets.push(`${fret}`);
          guitarPlaced = true;
          break;
        }
      }
      if (!guitarPlaced) guitarFrets.push("-");

      // Bass
      let bassPlaced = false;
      for (const [string, tuning] of Object.entries(bassTuning)) {
        const fret = midiNote - tuning;
        if (fret >= 0 && fret <= 24) {
          bassFrets.push(`${fret}`);
          bassPlaced = true;
          break;
        }
      }
      if (!bassPlaced) bassFrets.push("-");
    }

    result.push({
      minute: parseInt(minute),
      guitar: guitarFrets.join(" "),
      bass: bassFrets.join(" "),
    });
  }

  return result.sort((a, b) => a.minute - b.minute);
};
