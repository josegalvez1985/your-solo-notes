import { Music2 } from "lucide-react";

export function Logo({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const text = size === "lg" ? "text-4xl" : size === "sm" ? "text-lg" : "text-2xl";
  const icon = size === "lg" ? "h-9 w-9" : size === "sm" ? "h-5 w-5" : "h-7 w-7";
  return (
    <div className="flex items-center gap-2">
      <div className="rounded-xl bg-gradient-hero p-2 shadow-glow">
        <Music2 className={`${icon} text-primary-foreground`} />
      </div>
      <span className={`${text} font-black tracking-tight`}>
        Tu<span className="bg-gradient-hero bg-clip-text text-transparent">Solo</span>
      </span>
    </div>
  );
}