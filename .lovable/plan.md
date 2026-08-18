# Shatta — clean desktop companion build

The current project is an empty TanStack template. The uploaded CyberFox app is a complete, working product that I'll port here as the functional foundation, with a brand-new Shatta character layer on top.

## 1. Existing reusable systems (port largely as-is)

| System | File in upload | Verdict |
| --- | --- | --- |
| Settings + persistence | `hooks/usePetSettings.ts` | Reuse (new storage key `shatta:settings:v1`) |
| Global mood store | `hooks/usePetMood.ts` | Reuse, extend state list |
| Web Audio blips | `lib/pet-audio.ts` | Reuse engine, new Shatta sound set |
| Voice output (TTS + browser fallback) | `lib/voice-output.ts` | Reuse, retune voice |
| Voice input (mic, record, cancel, transcribe) | `hooks/useVoiceInput.ts` | Reuse |
| AI chat streaming hook | `hooks/useFoxChat.ts` | Reuse, rename `useShattaChat` |
| Server routes | `routes/api/chat.ts`, `speak.ts`, `transcribe.ts` | Reuse (new system prompt) |
| Dev context (opt-in) | `lib/dev-context.ts`, `hooks/useDevEvents.ts` | Reuse |
| Electron shell (transparent, always-on-top, click-through, mic permission, external links, tray, offline fallback) | `electron/main.cjs`, `preload.cjs`, `pet.html` | Reuse architecture, rebrand + new offline art |
| Tests / vitest / eslint / vite config | `tests/*`, configs | Reuse and extend |

## 2. CyberFox-specific systems to replace

- `components/CyberFox.tsx` — 450-line monolith mixing state machine, movement, drag, gestures, rendering. Replaced by a character-agnostic engine + Shatta character definition.
- Sprite maps hardcoded to 6 fox PNGs, and the 6-state `PetState` union — replaced by a 17-state machine.
- Fox personality/system prompt, blue/cyan neon tokens, landing page copy, download section, `data-fox-ui` hooks, `window.cyberfox` bridge naming.
- Fake "walk" (single PNG + CSS keyframe) — replaced by a real 5-frame walk cycle.

## 3. Existing Shatta code

None. Clean build.

## 4. Assets available

- Reference sheet only (the uploaded image) — used as art direction, never shipped as a runtime sprite.
- Fox PNGs — discarded, not reused.

## 5. Assets still required (I will generate them)

Transparent PNGs in `src/characters/shatta/assets/`, all same canvas, same scale, alpha background, Shatta only, matching the reference (red cat, black `</>` hoodie, one headphone, tiny fang, expressive tail):

`idle, blink, curious, happy, silly, annoyed, surprised, mischievous, thinking, speaking, sleepy, sleeping, stretch, grooming, celebrate, drag, walk-1..walk-5` (~21 frames).

Walk frames are generated as distinct poses (paw/leg/torso/tail positions differ), so the walk cycle is real frame animation, not one PNG sliding. If any frame comes back visually inconsistent I'll regenerate it; I will not substitute CSS fakery, and I'll list explicitly anything that couldn't be produced.

## 6. Proposed Shatta architecture

```text
src/characters/
  types.ts                 shared CharacterDefinition contract
  shatta/
    assets/*.png           transparent frames
    sprites.ts             state -> frame(s), fps, loop
    personality.ts         states, moods, lines, sounds, system prompt
    sounds.ts              Shatta sound set
src/pet/
  usePetState.ts           centralized 17-state machine (single source of truth)
  useIdleLife.ts           randomized breathing/blink/ear/tail/look/groom/stretch/sleepy
  useWalker.ts             target picking, direction, real frame stepping, stop->idle
  useDragging.ts           pointer drag
  useVisibility.ts         hidden tab/window pause
  Sprite.tsx               frame renderer (preload, alpha, facing, secondary motion)
  SpeechBubble.tsx
  CompactMenu.tsx          ☰ -> Chat / Voice / Audio / Settings
  QuickChat.tsx            small input near Shatta -> thinking -> bubble -> speaking -> idle
  SettingsPanel.tsx
  Companion.tsx            composition root used by BOTH web and overlay
```

One engine, one state machine, no character logic duplicated in components. Electron loads `/overlay`, which renders the exact same `Companion`.

Color: red / dark red / warm red / neutral dark tokens replace the cyan accent in `src/styles.css`; the UI stays dark-neutral, not globally red.

## 7. Files I expect to change

- New: everything under `src/characters/` and `src/pet/`, `src/routes/overlay.tsx`, `src/routes/api/{chat,speak,transcribe}.ts`, `src/hooks/{usePetSettings,usePetMood,useShattaChat,useVoiceInput,useDevEvents}.ts`, `src/lib/{pet-audio,voice-output,dev-context}.ts`, `electron/{main.cjs,preload.cjs,pet.html}`, `tests/*`, `vitest.config.ts`.
- Rewritten: `src/routes/index.tsx` (Shatta landing page), `src/styles.css` (red/dark design system), `src/routes/__root.tsx` (metadata), `package.json` (test script, electron deps).

## 8. Phases

1. Port infrastructure (settings, mood store, audio, voice, chat, API routes, tests) — verify typecheck + tests.
2. Generate Shatta assets, verify transparency and consistency.
3. Character engine + state machine + walk cycle + idle life + sleep.
4. Compact menu, quick chat, speech bubbles, settings panel.
5. Landing page, overlay route, design system.
6. Electron shell + offline fallback.
7. Full verification: tests, typecheck, production build, `/`, `/overlay`, browser check for console errors and no opaque rectangle.
