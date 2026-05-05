import { useEffect, useRef } from "react";

interface TabRendererProps {
  tabNotation: string;
  instrument: string;
  currentTime: number;
}

export function TabRenderer({ tabNotation, instrument, currentTime }: TabRendererProps) {
  const preRef = useRef<HTMLPreElement>(null);

  useEffect(() => {
    if (!preRef.current || !tabNotation) return;

    const lines = tabNotation.split("\n");
    const charWidth = 8;
    const estimatedDuration = lines[0]?.length || 1;
    const scrollPixels = (currentTime / (estimatedDuration / 20)) * charWidth;

    preRef.current.scrollLeft = Math.max(0, scrollPixels);
  }, [currentTime, tabNotation]);

  return (
    <div className="w-full bg-muted rounded-lg border border-border overflow-x-auto">
      <pre
        ref={preRef}
        className="text-xs leading-relaxed whitespace-pre font-mono p-4 transition-all duration-100"
        style={{ minHeight: "120px" }}
      >
        {tabNotation}
      </pre>
    </div>
  );
}
