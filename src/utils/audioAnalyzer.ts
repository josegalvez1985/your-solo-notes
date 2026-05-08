import { PitchDetector } from "pitchy";

export interface Note {
  frequency: number;
  note: string;
  octave: number;
  time: number;
  duration: number;
  confidence: number;
}

export type TuningName = "standard" | "dropD" | "halfStepDown" | "openG";

export interface Tuning {
  name: TuningName;
  label: string;
  guitar: Record<string, number>;
  bass: Record<string, number>;
  guitarStringOrder: string[];
  bassStringOrder: string[];
}

const NOTES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

export const TUNINGS: Record<TuningName, Tuning> = {
  standard: {
    name: "standard",
    label: "Estándar (E A D G B e)",
    guitar: { e: 64, B: 59, G: 55, D: 50, A: 45, E: 40 },
    bass: { G: 43, D: 38, A: 33, E: 28 },
    guitarStringOrder: ["e", "B", "G", "D", "A", "E"],
    bassStringOrder: ["G", "D", "A", "E"],
  },
  dropD: {
    name: "dropD",
    label: "Drop D (D A D G B e)",
    guitar: { e: 64, B: 59, G: 55, D: 50, A: 45, E: 38 },
    bass: { G: 43, D: 38, A: 33, E: 26 },
    guitarStringOrder: ["e", "B", "G", "D", "A", "E"],
    bassStringOrder: ["G", "D", "A", "E"],
  },
  halfStepDown: {
    name: "halfStepDown",
    label: "Medio tono abajo (Eb)",
    guitar: { e: 63, B: 58, G: 54, D: 49, A: 44, E: 39 },
    bass: { G: 42, D: 37, A: 32, E: 27 },
    guitarStringOrder: ["e", "B", "G", "D", "A", "E"],
    bassStringOrder: ["G", "D", "A", "E"],
  },
  openG: {
    name: "openG",
    label: "Open G (D G D G B D)",
    guitar: { e: 62, B: 59, G: 55, D: 50, A: 43, E: 38 },
    bass: { G: 43, D: 38, A: 33, E: 28 },
    guitarStringOrder: ["e", "B", "G", "D", "A", "E"],
    bassStringOrder: ["G", "D", "A", "E"],
  },
};

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

export interface DetectOptions {
  startTime?: number;
  endTime?: number;
  onProgress?: (pct: number) => void;
  minClarity?: number;
  minDurationMs?: number;
}

const median = (arr: number[]): number => {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};

export const detectPitch = async (
  audioBuffer: AudioBuffer,
  opts: DetectOptions = {},
): Promise<Note[]> => {
  const {
    startTime = 0,
    endTime,
    onProgress,
    minClarity = 0.9,
    minDurationMs = 80,
  } = opts;

  const channelData = audioBuffer.getChannelData(0);
  const sampleRate = audioBuffer.sampleRate;
  const startSample = Math.max(0, Math.floor(startTime * sampleRate));
  const endSample = endTime
    ? Math.min(channelData.length, Math.floor(endTime * sampleRate))
    : channelData.length;

  const frameSize = 2048;
  const hopSize = 1024;
  const detector = PitchDetector.forFloat32Array(frameSize);
  detector.minVolumeDecibels = -40;
  const frame = new Float32Array(frameSize);

  type Raw = { freq: number; clarity: number; time: number };
  const rawDetections: Raw[] = [];

  const totalFrames = Math.max(1, Math.floor((endSample - startSample - frameSize) / hopSize));
  let processed = 0;

  for (let i = startSample; i + frameSize <= endSample; i += hopSize) {
    if (processed % 200 === 0) {
      await new Promise((resolve) => setTimeout(resolve, 0));
      onProgress?.(processed / totalFrames);
    }
    processed++;

    for (let j = 0; j < frameSize; j++) {
      frame[j] = channelData[i + j];
    }

    const [frequency, clarity] = detector.findPitch(frame, sampleRate);
    if (frequency > 60 && frequency < 2000 && clarity > minClarity) {
      rawDetections.push({ freq: frequency, clarity, time: i / sampleRate });
    }
  }

  // Median filter window of 3 to remove single-frame outliers.
  const smoothed: Raw[] = [];
  for (let i = 0; i < rawDetections.length; i++) {
    const window = rawDetections.slice(Math.max(0, i - 1), Math.min(rawDetections.length, i + 2));
    const medFreq = median(window.map((w) => w.freq));
    if (Math.abs(rawDetections[i].freq - medFreq) < 5) {
      smoothed.push(rawDetections[i]);
    }
  }

  // Group consecutive frames of same MIDI note into single Note with duration.
  const minDur = minDurationMs / 1000;
  const grouped: Note[] = [];
  let current: { midi: number; freqs: number[]; clarities: number[]; start: number; end: number } | null = null;

  for (const r of smoothed) {
    const midi = frequencyToMidi(r.freq);
    if (current && current.midi === midi && r.time - current.end < 0.15) {
      current.freqs.push(r.freq);
      current.clarities.push(r.clarity);
      current.end = r.time;
    } else {
      if (current) {
        const dur = current.end - current.start;
        if (dur >= minDur) {
          const meanFreq = current.freqs.reduce((a, b) => a + b, 0) / current.freqs.length;
          const { note, octave } = frequencyToNote(meanFreq);
          grouped.push({
            frequency: meanFreq,
            note,
            octave,
            time: current.start,
            duration: dur,
            confidence: current.clarities.reduce((a, b) => a + b, 0) / current.clarities.length,
          });
        }
      }
      current = { midi, freqs: [r.freq], clarities: [r.clarity], start: r.time, end: r.time };
    }
  }
  if (current) {
    const dur = current.end - current.start;
    if (dur >= minDur) {
      const meanFreq = current.freqs.reduce((a, b) => a + b, 0) / current.freqs.length;
      const { note, octave } = frequencyToNote(meanFreq);
      grouped.push({
        frequency: meanFreq,
        note,
        octave,
        time: current.start,
        duration: dur,
        confidence: current.clarities.reduce((a, b) => a + b, 0) / current.clarities.length,
      });
    }
  }

  onProgress?.(1);
  return grouped;
};

interface PlacedNote {
  string: string;
  fret: number;
  time: number;
  duration: number;
}

const placeNote = (
  midi: number,
  tuning: Record<string, number>,
  order: string[],
  maxFret: number,
): { string: string; fret: number } | null => {
  for (const stringName of order) {
    const fret = midi - tuning[stringName];
    if (fret >= 0 && fret <= maxFret) {
      return { string: stringName, fret };
    }
  }
  return null;
};

export interface TabSegment {
  startTime: number;
  endTime: number;
  notation: string;
  positions: { string: string; fret: number; time: number; columnStart: number; columnEnd: number }[];
}

const buildTabSegments = (
  notes: Note[],
  tuning: Record<string, number>,
  order: string[],
  maxFret: number,
  notesPerLine: number,
): TabSegment[] => {
  if (notes.length === 0) return [];

  const placed: PlacedNote[] = [];
  for (const note of notes) {
    const midi = frequencyToMidi(note.frequency);
    const p = placeNote(midi, tuning, order, maxFret);
    if (p) {
      placed.push({ ...p, time: note.time, duration: note.duration });
    }
  }

  if (placed.length === 0) return [];

  const segments: TabSegment[] = [];
  for (let i = 0; i < placed.length; i += notesPerLine) {
    const slice = placed.slice(i, i + notesPerLine);
    const strings: Record<string, string[]> = {};
    for (const s of order) strings[s] = [];

    const positions: TabSegment["positions"] = [];
    let column = 0;

    for (const p of slice) {
      const fretStr = p.fret.toString();
      const width = Math.max(fretStr.length, 1);
      for (const s of order) {
        if (s === p.string) {
          strings[s].push(fretStr);
        } else {
          strings[s].push("-".repeat(width));
        }
      }
      positions.push({
        string: p.string,
        fret: p.fret,
        time: p.time,
        columnStart: column,
        columnEnd: column + width,
      });
      column += width + 2; // +2 for "--" separator
    }

    let notation = "";
    for (const s of order) {
      notation += `${s}|--${strings[s].join("--")}--|\n`;
    }

    segments.push({
      startTime: slice[0].time,
      endTime: slice[slice.length - 1].time + slice[slice.length - 1].duration,
      notation,
      positions,
    });
  }

  return segments;
};

export const generateGuitarTabSegments = (notes: Note[], tuning: Tuning): TabSegment[] => {
  return buildTabSegments(notes, tuning.guitar, tuning.guitarStringOrder, 22, 32);
};

export const generateBassTabSegments = (notes: Note[], tuning: Tuning): TabSegment[] => {
  return buildTabSegments(notes, tuning.bass, tuning.bassStringOrder, 24, 32);
};

export const segmentsToText = (segments: TabSegment[]): string => {
  return segments.map((s) => s.notation).join("\n");
};

export const generateNotesGroupedByMinute = (
  notes: Note[],
  tuning: Tuning,
): { minute: number; guitar: string; bass: string; startTime: number }[] => {
  if (notes.length === 0) return [];

  const groupedByMinute: Record<number, Note[]> = {};
  for (const note of notes) {
    const minute = Math.floor(note.time / 60);
    if (!groupedByMinute[minute]) groupedByMinute[minute] = [];
    groupedByMinute[minute].push(note);
  }

  const result: { minute: number; guitar: string; bass: string; startTime: number }[] = [];

  for (const [minute, minuteNotes] of Object.entries(groupedByMinute)) {
    const guitarFrets: string[] = [];
    const bassFrets: string[] = [];

    for (const note of minuteNotes) {
      const midi = frequencyToMidi(note.frequency);
      const g = placeNote(midi, tuning.guitar, tuning.guitarStringOrder, 22);
      const b = placeNote(midi, tuning.bass, tuning.bassStringOrder, 24);
      guitarFrets.push(g ? `${g.fret}` : "-");
      bassFrets.push(b ? `${b.fret}` : "-");
    }

    result.push({
      minute: parseInt(minute),
      guitar: guitarFrets.join(" "),
      bass: bassFrets.join(" "),
      startTime: minuteNotes[0].time,
    });
  }

  return result.sort((a, b) => a.minute - b.minute);
};
