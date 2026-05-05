import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/Logo";

export const Route = createFileRoute("/login")({
  component: LoginPage,
  head: () => ({ meta: [{ title: "Iniciar sesión — TuSolo" }] }),
});

function LoginPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "signup">("login");

  return (
    <div className="relative flex min-h-screen items-center justify-center px-6 py-12">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-primary/20 blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <Logo size="lg" />
        </div>

        <div className="rounded-3xl border border-border bg-gradient-card p-8 shadow-elegant">
          <div className="mb-6 grid grid-cols-2 gap-1 rounded-xl bg-muted p-1">
            {(["login", "signup"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                  mode === m
                    ? "bg-card text-foreground shadow"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {m === "login" ? "Iniciar sesión" : "Registrarse"}
              </button>
            ))}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              navigate({ to: "/app" });
            }}
            className="space-y-4"
          >
            {mode === "signup" && (
              <div className="space-y-2">
                <Label htmlFor="name">Nombre</Label>
                <Input id="name" placeholder="Tu nombre" required />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="tu@email.com" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input id="password" type="password" placeholder="••••••••" required />
            </div>

            <Button type="submit" variant="hero" size="lg" className="mt-6 w-full">
              {mode === "login" ? "Entrar" : "Crear cuenta"}
            </Button>
          </form>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            Al continuar aceptas los términos de TuSolo
          </p>
        </div>

        <div className="mt-6 text-center">
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">
            ← Volver al inicio
          </Link>
        </div>
      </div>
    </div>
  );
}