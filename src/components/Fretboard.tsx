import { useMemo } from "react";

interface FretboardProps {
  notes: Array<{ string: string; fret: number }>;
  instrument: "guitar" | "bass";
}

export function Fretboard({ notes, instrument }: FretboardProps) {
  const strings = instrument === "guitar" ? ["E", "A", "D", "G", "B", "e"] : ["E", "A", "D", "G"];
  const numFrets = 24;

  const highlightedFrets = useMemo(() => {
    const map = new Map<string, number>();
    for (const note of notes) {
      map.set(note.string, note.fret);
    }
    return map;
  }, [notes]);

  return (
    <div className="w-full overflow-x-auto bg-muted rounded-lg p-4 border border-border">
      <div className="inline-block min-w-full">
        {/* Números de traste */}
        <div className="flex mb-1">
          <div className="w-12" />
          {Array.from({ length: numFrets }).map((_, i) => (
            <div
              key={`fret-${i}`}
              className="w-8 text-center text-xs text-muted-foreground"
            >
              {i === 0 ? "0" : i % 5 === 0 ? i : ""}
            </div>
          ))}
        </div>

        {/* Cuerdas */}
        {strings.map((stringName) => (
          <div key={stringName} className="flex items-center">
            <div className="w-12 font-bold text-sm">{stringName}</div>
            {Array.from({ length: numFrets }).map((_, fretNum) => {
              const isHighlighted =
                highlightedFrets.get(stringName) === fretNum;

              return (
                <div
                  key={`${stringName}-${fretNum}`}
                  className={`w-8 h-6 border-r border-border flex items-center justify-center text-xs font-bold ${
                    isHighlighted
                      ? "bg-primary text-primary-foreground"
                      : fretNum === 0
                        ? "border-l-4 border-l-foreground"
                        : ""
                  }`}
                >
                  {isHighlighted ? "●" : ""}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
