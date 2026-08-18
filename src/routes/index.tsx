import { createFileRoute } from "@tanstack/react-router";
import { Heart, MessageSquare, Mic, Send, Sparkles, Star } from "lucide-react";

import { Shatta } from "@/components/pet/Shatta";
import { SHATTA_PORTRAIT } from "@/characters/shatta/sprites";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Shatta — The Chaotic Coding Cat Desktop Companion" },
      {
        name: "description",
        content:
          "Meow. I'm Shatta — a chaotic little AI desktop companion. Red cat, black hoodie, one headphone, endless attitude.",
      },
      { property: "og:title", content: "Shatta — The Chaotic Coding Cat" },
      {
        property: "og:description",
        content: "Your chaotic little AI desktop companion. Chat, voice, moods and wandering antics.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const FEATURES = [
  {
    icon: MessageSquare,
    title: "TALK TO ME",
    body: "Chat with Shatta whenever you want. Streaming answers in a tiny composer that never steals your window.",
  },
  {
    icon: Mic,
    title: "I CAN TALK TOO",
    body: "Voice in. Voice out. Maximum meow. The mic closes the second you stop talking.",
  },
  {
    icon: Sparkles,
    title: "I WANDER",
    body: "She walks around your desktop instead of sitting there like a dead icon. Stretching, grooming, napping.",
  },
  {
    icon: Heart,
    title: "I HAVE ATTITUDE",
    body: "Different moods, reactions, expressions and personality. Poke her and find out which one you get.",
  },
];

const NAV = [
  { label: "HOME", href: "#top" },
  { label: "FEATURES", href: "#features" },
  { label: "TALK TO HER", href: "#talk" },
  { label: "DOWNLOAD", href: "#download" },
];

function Deco({ className, children }: { className: string; children: React.ReactNode }) {
  return (
    <span aria-hidden="true" className={`pointer-events-none absolute select-none text-primary/70 ${className}`}>
      {children}
    </span>
  );
}

function Landing() {
  return (
    <main id="top" className="min-h-screen bg-background text-foreground">
      {/* nav */}
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/85 backdrop-blur">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3">
          <a href="#top" className="wordmark-sm text-2xl">
            SHATTA
          </a>
          <ul className="hidden items-center gap-6 text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground sm:flex">
            {NAV.map((n) => (
              <li key={n.label}>
                <a href={n.href} className="scribble-underline pb-1 transition hover:text-foreground">
                  {n.label}
                </a>
              </li>
            ))}
          </ul>
          <a
            href="#download"
            className="rounded-full bg-primary px-4 py-2 font-display text-xs font-extrabold uppercase tracking-widest text-primary-foreground transition hover:scale-105 hover:brightness-110"
          >
            Get her
          </a>
        </nav>
      </header>

      {/* hero */}
      <section className="relative overflow-hidden">
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-70"
          style={{
            background:
              "radial-gradient(60% 55% at 78% 30%, var(--shatta-glow), transparent 70%), radial-gradient(50% 40% at 10% 90%, color-mix(in oklab, var(--shatta-red-deep) 35%, transparent), transparent 70%)",
          }}
        />
        <div className="relative mx-auto grid max-w-6xl gap-12 px-5 py-16 md:grid-cols-[1.1fr_0.9fr] md:items-center md:py-24">
          <div className="relative">
            <Deco className="-left-2 -top-4 text-2xl deco-twinkle">✦</Deco>
            <Deco className="left-40 -top-8 text-sm deco-drift">{"</>"}</Deco>
            <span className="sticker font-display text-[0.7rem] font-extrabold uppercase tracking-[0.25em] text-primary">
              Desktop companion
            </span>
            <h1 className="mt-6 leading-[0.85]">
              <span className="wordmark block text-[3.4rem] sm:text-7xl md:text-8xl">MEOW.</span>
              <span className="wordmark mt-2 block text-[3.4rem] text-foreground sm:text-7xl md:text-8xl">
                I&apos;M SHATTA.
              </span>
            </h1>
            <p className="mt-7 max-w-md font-sans text-base leading-relaxed text-muted-foreground">
              Your chaotic little <span className="font-bold text-primary">AI desktop companion</span>. She helps
              you code, distracts you, and makes everything 200% worse. Or better.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-3">
              <a
                href="#talk"
                className="rounded-2xl bg-primary px-6 py-3 font-display text-sm font-extrabold uppercase tracking-widest text-primary-foreground shadow-[0_12px_30px_-12px_var(--shatta-glow)] transition hover:-translate-y-0.5 hover:rotate-[-1.5deg] hover:brightness-110"
              >
                Meet Shatta →
              </a>
              <a
                href="#features"
                className="rounded-2xl border-2 border-primary/50 px-6 py-3 font-display text-sm font-extrabold uppercase tracking-widest text-foreground transition hover:-translate-y-0.5 hover:border-primary hover:text-primary"
              >
                See what she can do
              </a>
            </div>
            <p className="mt-5 font-sans text-xs italic text-muted-foreground">
              psst — she&apos;s already on this page. poke her. drag her. double-click for her menu.
            </p>
          </div>

          <div className="relative mx-auto w-full max-w-sm">
            <Deco className="-right-1 top-2 text-3xl deco-twinkle">★</Deco>
            <Deco className="-left-3 bottom-8 text-2xl deco-drift">♥</Deco>
            <div className="relative grid aspect-square place-items-center rounded-[2.5rem] border-2 border-primary/25 bg-card/60 shadow-[0_40px_100px_-50px_var(--shatta-glow)]">
              <img
                src={SHATTA_PORTRAIT}
                alt="Shatta, a red cat wearing a black developer hoodie and one headphone"
                width={320}
                height={320}
                loading="eager"
                className="motion-breathe h-3/4 w-3/4 object-contain drop-shadow-[0_20px_40px_var(--shatta-glow)]"
              />
              <span className="absolute -bottom-4 right-6 rotate-[-4deg] rounded-2xl border-2 border-primary/50 bg-card px-3 py-1.5 font-display text-xs font-bold text-foreground">
                meow?
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* features */}
      <section id="features" className="relative mx-auto max-w-6xl px-5 py-20">
        <div className="flex items-end justify-between gap-4">
          <h2 className="wordmark text-4xl text-foreground sm:text-5xl">SMALL CAT.</h2>
          <Star className="mb-3 h-5 w-5 shrink-0 text-primary deco-twinkle" aria-hidden="true" />
        </div>
        <h2 className="wordmark -mt-1 text-4xl sm:text-5xl">BIG PROBLEM.</h2>

        <div className="mt-12 grid gap-5 md:grid-cols-2">
          {FEATURES.map(({ icon: Icon, title, body }, i) => (
            <article
              key={title}
              className={`panel-dark relative rounded-[1.75rem] p-6 transition duration-200 hover:-translate-y-1 ${
                i % 2 ? "md:translate-y-6" : ""
              }`}
            >
              <span className="grid h-10 w-10 place-items-center rounded-2xl bg-primary/15 text-primary">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <h3 className="mt-4 font-display text-2xl font-extrabold tracking-wide text-primary">{title}</h3>
              <p className="mt-2 max-w-sm font-sans text-sm leading-relaxed text-muted-foreground">{body}</p>
              <span aria-hidden="true" className="absolute right-5 top-5 font-display text-xs text-primary/40">
                {"</>"}
              </span>
            </article>
          ))}
        </div>
      </section>

      {/* chat showcase */}
      <section id="talk" className="relative border-y-2 border-border/60 bg-card/30">
        <div className="mx-auto grid max-w-5xl gap-10 px-5 py-20 md:grid-cols-[0.8fr_1.2fr] md:items-center">
          <div className="relative mx-auto w-56">
            <img
              src={SHATTA_PORTRAIT}
              alt="Shatta waiting for a message"
              width={224}
              height={224}
              loading="lazy"
              className="motion-breathe w-full object-contain"
            />
            <Deco className="right-0 top-0 text-xl deco-twinkle">✦</Deco>
          </div>

          <div>
            <h2 className="wordmark text-4xl sm:text-5xl">TALK TO HER.</h2>
            <p className="mt-3 font-sans text-sm text-muted-foreground">
              She answers. Whether you like the answer is a separate conversation.
            </p>

            <div className="mt-8 space-y-3">
              <p className="w-fit max-w-xs rotate-[-1deg] rounded-2xl rounded-bl-md border-2 border-primary/40 bg-card px-4 py-2.5 font-sans text-sm">
                what do you want?
              </p>
              <p className="ml-auto w-fit max-w-xs rotate-[1deg] rounded-2xl rounded-br-md bg-primary px-4 py-2.5 font-sans text-sm text-primary-foreground">
                Are you always this annoying?
              </p>
              <p className="w-fit max-w-xs rotate-[-1.5deg] rounded-2xl rounded-bl-md border-2 border-primary/40 bg-card px-4 py-2.5 font-display text-sm font-bold">
                yes. obviously.
              </p>
            </div>

            <div className="mt-8 flex items-center gap-2 rounded-full border-2 border-primary/35 bg-background px-4 py-2">
              <span aria-hidden="true" className="text-primary">
                ✦
              </span>
              <span className="flex-1 font-sans text-sm text-muted-foreground">Type something...</span>
              <span
                aria-hidden="true"
                className="grid h-8 w-8 place-items-center rounded-full bg-primary text-primary-foreground"
              >
                <Send className="h-4 w-4" />
              </span>
            </div>
            <p className="mt-3 font-sans text-xs text-muted-foreground">
              This is a preview. The real thing lives with her on your desktop — click Shatta on this page to chat
              for real.
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section id="download" className="relative overflow-hidden px-5 py-24 text-center">
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{
            background: "radial-gradient(50% 60% at 50% 50%, var(--shatta-glow), transparent 70%)",
          }}
        />
        <div className="relative mx-auto max-w-3xl">
          <Deco className="left-6 top-10 text-2xl deco-drift">★</Deco>
          <Deco className="right-8 top-16 text-xl deco-twinkle">♥</Deco>
          <h2 className="wordmark text-5xl leading-[0.9] sm:text-7xl">SHE&apos;S WAITING.</h2>
          <p className="mt-6 font-sans text-base text-muted-foreground">
            Your desktop is boring without her.
          </p>
          <div className="mt-9 flex flex-wrap justify-center gap-3">
            <span className="cursor-not-allowed rounded-2xl bg-primary px-7 py-3.5 font-display text-sm font-extrabold uppercase tracking-widest text-primary-foreground opacity-90">
              Get Shatta — coming soon
            </span>
            <a
              href="/overlay"
              className="rounded-2xl border-2 border-primary/50 px-7 py-3.5 font-display text-sm font-extrabold uppercase tracking-widest transition hover:-translate-y-0.5 hover:border-primary hover:text-primary"
            >
              Open overlay view
            </a>
          </div>
        </div>
      </section>

      <footer className="border-t border-border/60 px-5 py-10 text-center">
        <p className="wordmark-sm text-lg">SHATTA</p>
        <p className="mt-2 font-sans text-xs text-muted-foreground">
          She&apos;s judging your variable names. Stay chaotic.
        </p>
      </footer>

      <Shatta variant="page" initial={{ x: 0.82, y: 0.72 }} />
    </main>
  );
}
