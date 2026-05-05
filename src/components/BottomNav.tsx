import { Link, useRouterState } from "@tanstack/react-router";
import { Home, Music, Library, User } from "lucide-react";

const items = [
  { to: "/app", label: "Inicio", icon: Home },
  { to: "/app/solo", label: "Solo", icon: Music },
  { to: "/app/tabs", label: "Tablaturas", icon: Library },
  { to: "/app/profile", label: "Perfil", icon: User },
] as const;

export function BottomNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 border-t border-border bg-card/80 backdrop-blur-xl">
      <ul className="mx-auto flex max-w-lg items-center justify-around px-4 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        {items.map((it) => {
          const active = pathname === it.to;
          const Icon = it.icon;
          return (
            <li key={it.to}>
              <Link
                to={it.to}
                className={`flex flex-col items-center gap-1 rounded-xl px-3 py-1.5 text-xs transition-colors ${
                  active ? "text-primary" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className={`h-5 w-5 ${active ? "drop-shadow-[0_0_8px_var(--primary)]" : ""}`} />
                <span>{it.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}