import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Logo } from "@/components/Logo";
import { Youtube, Guitar, Sparkles } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const navigate = useNavigate();

  const handleAnalyzeYoutube = () => {
    if (youtubeUrl.trim()) {
      navigate({ to: "/app/analyze", search: { url: youtubeUrl } });
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute -top-40 -left-40 h-96 w-96 rounded-full bg-primary/30 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-accent/30 blur-3xl" />

      <header className="relative z-10 mx-auto flex max-w-5xl items-center justify-between px-6 py-6">
        <Logo />
        {/* <Link to="/login">
          <Button variant="ghost">Entrar</Button>
        </Link> */}
      </header>

      <main className="relative z-10 mx-auto max-w-3xl px-6 pt-12 pb-24 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card/50 px-4 py-1.5 text-xs text-muted-foreground backdrop-blur">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          Solos al instante desde YouTube
        </div>

        <h1 className="mt-6 text-5xl font-black tracking-tight md:text-7xl">
          Toca el solo de
          <br />
          <span className="bg-gradient-hero bg-clip-text text-transparent">
            cualquier canción
          </span>
        </h1>

        <p className="mx-auto mt-6 max-w-xl text-lg text-muted-foreground">
          Pega un link de YouTube, elige tu instrumento y obtén las notas y tablaturas del solo en segundos.
        </p>

        <div className="mx-auto mt-8 max-w-md space-y-3">
          <div className="flex gap-2">
            <Input
              type="url"
              placeholder="https://youtube.com/watch?v=..."
              value={youtubeUrl}
              onChange={(e) => setYoutubeUrl(e.target.value)}
              className="flex-1"
              onKeyDown={(e) => e.key === "Enter" && handleAnalyzeYoutube()}
            />
            <Button
              size="lg"
              variant="hero"
              onClick={handleAnalyzeYoutube}
              disabled={!youtubeUrl.trim()}
            >
              <Youtube className="h-5 w-5" />
            </Button>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link to="/app/tabs">
            <Button size="lg" variant="outline" className="w-full sm:w-auto">
              <Guitar className="h-5 w-5" />
              Ver tablaturas
            </Button>
          </Link>
        </div>

        <div className="mt-20 grid gap-4 sm:grid-cols-3">
          {[
            { t: "🎸 Multi-instrumento", d: "Guitarra, bajo, piano, violín y más" },
            { t: "⚡ Al instante", d: "De link de YouTube a notas en segundos" },
            { t: "📖 Tablaturas", d: "Biblioteca para practicar offline" },
          ].map((f) => (
            <div
              key={f.t}
              className="rounded-2xl border border-border bg-gradient-card p-5 text-left shadow-elegant"
            >
              <p className="font-semibold">{f.t}</p>
              <p className="mt-1 text-sm text-muted-foreground">{f.d}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
