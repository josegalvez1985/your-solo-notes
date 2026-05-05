interface AlphaTabRendererProps {
  notation: string;
  instrument: string;
}

export function AlphaTabRenderer({ notation, instrument }: AlphaTabRendererProps) {
  const lines = notation.split("\n").filter((l) => l.trim());

  return (
    <div className="w-full bg-muted rounded-lg border border-border p-4 overflow-x-auto">
      <div className="font-mono text-sm bg-background rounded p-3 space-y-1">
        {lines.map((line, idx) => (
          <div key={idx} className="text-foreground">
            {line}
          </div>
        ))}
      </div>
    </div>
  );
}
