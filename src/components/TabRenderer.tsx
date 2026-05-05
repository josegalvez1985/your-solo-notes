import { useEffect, useRef } from "react";

interface TabRendererProps {
  tabNotation: string;
  instrument: string;
  currentTime: number;
}

export function TabRenderer({ tabNotation, instrument, currentTime }: TabRendererProps) {
  const preRef = useRef<HTMLPreElement>(null);

  useEffect(() => {
    const pre = preRef.current;
    if (!pre || !tabNotation) return;

    const lines = tabNotation.split("\n");
    const totalNotes = lines[0]?.match(/\d+/g)?.length || 0;
    const timePerNote = currentTime / (totalNotes || 1);

    const scrollPos = Math.max(0, currentTime * 10);
    pre.style.transform = `translateX(${Math.min(0, -scrollPos)}px)`;
  }, [currentTime, tabNotation]);

  return (
    <div className="w-full overflow-x-auto bg-muted rounded-lg p-4 border border-border">
      <pre
        ref={preRef}
        className="text-xs leading-relaxed whitespace-pre-wrap break-words font-mono transition-transform duration-75"
      >
        {tabNotation}
      </pre>
    </div>
  );
}
