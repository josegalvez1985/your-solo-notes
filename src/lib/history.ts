import type { TuningName } from "@/utils/audioAnalyzer";

export interface HistoryEntry {
  id: string;
  url: string;
  title: string;
  tuning: TuningName;
  createdAt: number;
  notes: {
    frequency: number;
    note: string;
    octave: number;
    time: number;
    duration: number;
    confidence: number;
  }[];
}

const STORAGE_KEY = "tusolo:history:v1";
const MAX_ENTRIES = 5;

export function loadHistory(): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as HistoryEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveHistoryEntry(entry: HistoryEntry): HistoryEntry[] {
  const current = loadHistory().filter((e) => e.url !== entry.url);
  const next = [entry, ...current].slice(0, MAX_ENTRIES);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // quota or unavailable, ignore
  }
  return next;
}

export function deleteHistoryEntry(id: string): HistoryEntry[] {
  const next = loadHistory().filter((e) => e.id !== id);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
  return next;
}
