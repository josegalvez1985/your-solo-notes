import { PitchDetector } from "pitchy";

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

  const frameSize = 2048;
  const hopSize = 1024;
  const maxSamples = channelData.length;

  const detector = PitchDetector.forFloat32Array(frameSize);
  detector.minVolumeDecibels = -40;
  const frame = new Float32Array(frameSize);

  for (let i = 0; i + frameSize <= maxSamples; i += hopSize) {
    if (i % (sampleRate * 2) < hopSize) {
      await new Promise((resolve) => setTimeout(resolve, 0));
    }

    for (let j = 0; j < frameSize; j++) {
      frame[j] = channelData[i + j];
    }

    const [frequency, clarity] = detector.findPitch(frame, sampleRate);

    if (frequency > 60 && frequency < 2000 && clarity > 0.85) {
      const { note, octave } = frequencyToNote(frequency);
      const time = i / sampleRate;
      const lastNote = notes[notes.length - 1];

      if (
        !lastNote ||
        Math.abs(lastNote.frequency - frequency) > 5 ||
        time - lastNote.time > 0.12
      ) {
        notes.push({ frequency, note, octave, time, confidence: clarity });
      }
    }
  }

  return notes;
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
        strings[stringName].push(fret.toString());
        placed = true;
        break;
      }
    }

    if (!placed) {
      for (const stringName of stringOrder) {
        strings[stringName].push("-");
      }
    } else {
      // Llenar con guiones las cuerdas no utilizadas
      for (const stringName of stringOrder) {
        if (strings[stringName][strings[stringName].length - 1] === undefined) {
          strings[stringName].push("-");
        }
      }
    }
  }

  let tab = "";
  tab += "e|--" + strings.e.join("--") + "--|\n";
  tab += "B|--" + strings.B.join("--") + "--|\n";
  tab += "G|--" + strings.G.join("--") + "--|\n";
  tab += "D|--" + strings.D.join("--") + "--|\n";
  tab += "A|--" + strings.A.join("--") + "--|\n";
  tab += "E|--" + strings.E.join("--") + "--|\n";

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
        strings[stringName].push(fret.toString());
        placed = true;
        break;
      }
    }

    if (!placed) {
      for (const stringName of stringOrder) {
        strings[stringName].push("-");
      }
    } else {
      // Llenar con guiones las cuerdas no utilizadas
      for (const stringName of stringOrder) {
        if (strings[stringName][strings[stringName].length - 1] === undefined) {
          strings[stringName].push("-");
        }
      }
    }
  }

  let tab = "";
  tab += "G|--" + strings.G.join("--") + "--|\n";
  tab += "D|--" + strings.D.join("--") + "--|\n";
  tab += "A|--" + strings.A.join("--") + "--|\n";
  tab += "E|--" + strings.E.join("--") + "--|\n";

  return tab || "No se pudieron generar tablaturas";
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
