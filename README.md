# Shatta Companion

I am giving you two sources of truth:

1. THE UPLOADED PROJECT SOURCE

   This is the existing mature CyberFox desktop-companion codebase.

   Treat it as the functional/product reference.

2. THE ATTACHED SHATTA DESIGN IMAGE

   This is the visual and animation reference for the new character.

I want you to create a CLEAN SHATTA VERSION of this product.

IMPORTANT:

Do NOT simply rename CyberFox to Shatta.

Do NOT preserve CyberFox's visual identity.

Do NOT blindly modify the existing Shatta implementation if one exists.

Instead, inspect the uploaded source first, understand its working architecture and feature set, then build a clean Shatta implementation using that architecture and feature parity.

==================================================

SOURCE OF TRUTH PRIORITY

==================================================

For FUNCTIONALITY:

Use the uploaded CyberFox project as the source of truth.

For SHATTA'S appearance, poses, expressions, colors, and animation language:

Use the attached Shatta image as the source of truth.

For ARCHITECTURE:

Prefer clean reusable/shared systems from the uploaded project, but refactor anything necessary to avoid duplicated character-specific logic.

The final result must be a real Shatta desktop companion.

==================================================

DO NOT DESTROY THE EXISTING FUNCTIONALITY

==================================================

Before modifying anything:

1. Inspect the uploaded repository.

2. Identify the existing:

   - character state system

   - movement system

   - drag system

   - idle system

   - sleep system

   - audio system

   - AI chat

   - voice input

   - voice output

   - settings

   - Electron overlay

   - offline fallback

   - reduced-motion handling

   - hidden-tab/window handling

   - local persistence

   - tests

   - build configuration

3. Preserve proven infrastructure where it is reusable.

Do NOT rewrite working systems unnecessarily.

==================================================

SHATTA CHARACTER

==================================================

The attached image is a DESIGN/ANIMATION REFERENCE.

Do NOT display the entire reference image inside the application.

Shatta must be rendered as a real transparent character.

Preserve:

- face

- eyes

- ears

- headphones

- hoodie

- tail

- proportions

- silhouette

- expressions

- cute/funky personality

- overall art direction

Do NOT turn her into:

- a generic cat

- realistic artwork

- a different anime character

- a redesigned mascot

==================================================

COLOR RULE

==================================================

Where CyberFox currently uses its blue/cyan character accent, adapt that accent to Shatta's RED visual identity.

Use:

- red

- dark red

- warm red

- neutral dark tones

Do NOT globally paint the entire UI red.

Only adapt the appropriate character/product accent colors.

==================================================

REAL ANIMATION

==================================================

This is critical.

The reference image contains multiple Shatta poses.

These must become actual character states/animation frames.

Do NOT fake animation by only:

- translating one PNG

- rotating one PNG

- scaling one PNG

- bouncing one PNG

A different pose in the reference must correspond to a different visual pose/frame.

==================================================

REQUIRED STATES

==================================================

At minimum:

idle

blink

curious

happy

silly

annoyed

surprised

mischievous

thinking

speaking

sleepy

sleeping

walking

dragging

celebrating

stretching

grooming

Use a centralized state machine.

Do not duplicate mood/state logic across components.

==================================================

WALK CYCLE

==================================================

Implement a REAL multi-frame walk cycle based on the Shatta reference.

Target:

walk-1

walk-2

walk-3

walk-4

walk-5

The frames should visibly change:

- paw positions

- leg positions

- body weight

- torso position

- tail position

Add subtle secondary motion:

- body bounce

- head movement

- tail counter-motion

Support:

- walking left

- walking right

- stopping

- natural transition back to idle

A single static image sliding across the screen is NOT an acceptable walk cycle.

==================================================

IDLE LIFE

==================================================

Implement randomized idle behavior:

- breathing

- blinking

- ear movement

- tail movement

- looking around

- grooming

- stretching

- playful movement

- sleepy transition

Avoid repetitive timing.

==================================================

SLEEP

==================================================

Implement:

idle → sleepy → sleeping

Sleeping should have:

- actual sleeping pose

- subtle breathing

- optional ZZZ

Interaction should wake Shatta naturally.

Must work in:

- web

- Electron

==================================================

AI CHAT

==================================================

Preserve the existing CyberFox AI chat functionality.

But redesign the interaction to feel like a desktop pet.

Do NOT use a large permanent chat window.

Use:

small input near Shatta

→ thinking state

→ response

→ speech bubble

→ speaking state

→ return to idle

The speech bubble should appear near Shatta.

==================================================

SPEECH

==================================================

When Shatta speaks:

- use existing TTS infrastructure

- enter speaking state

- show speech bubble

- animate speaking pose/face when artwork permits

- return to idle after audio ends

Voice output remains OFF by default.

Respect:

- mute

- volume

- stop

- permissions

==================================================

VOICE INPUT

==================================================

Preserve:

- microphone permission

- recording state

- cancel

- transcription

- errors

Feed transcription into the same AI conversation system.

==================================================

AUDIO

==================================================

Preserve the existing lightweight Web Audio/pixel sound system.

Create Shatta-specific reactions for:

- click

- happy

- surprised

- walking

- sleeping

- celebration

- speaking

==================================================

COMPACT CONTROLS

==================================================

Replace the permanently visible large control buttons with ONE compact menu.

Example:

☰

On hover/click reveal:

Chat

Voice

Audio

Settings

Collapse when no longer needed.

==================================================

DESKTOP COMPANION

==================================================

Preserve the working Electron architecture from the uploaded project.

The Electron application must use the same React character engine as the web overlay.

No duplicated character implementation.

The desktop companion must:

- be transparent

- float above the desktop

- be draggable

- support interaction

- support chat text input

- support microphone permissions

- open external links in the browser

- avoid normal browser chrome

==================================================

OFFLINE FALLBACK

==================================================

Preserve the existing offline fallback architecture.

The fallback should still display Shatta and provide basic useful behavior instead of a broken page.

==================================================

SETTINGS

==================================================

Preserve existing settings functionality.

Include:

- AI chat

- voice input

- voice output

- volume

- sound effects

- reduced motion

- microphone status

- optional developer context

Persist locally.

==================================================

REDUCED MOTION

==================================================

Respect prefers-reduced-motion.

Also pause expensive animation when the tab/window is hidden.

==================================================

ASSET ARCHITECTURE

==================================================

Create clean transparent Shatta assets under:

src/characters/shatta/assets/

For example:

shatta-idle.png

shatta-blink.png

shatta-walk-1.png

shatta-walk-2.png

shatta-walk-3.png

shatta-walk-4.png

shatta-walk-5.png

shatta-thinking.png

shatta-speaking.png

shatta-sleepy.png

shatta-sleeping.png

shatta-happy.png

shatta-surprised.png

shatta-annoyed.png

shatta-stretch.png

shatta-grooming.png

Use only the assets actually needed.

Every runtime character asset must:

- have real alpha transparency

- have consistent proportions

- have consistent scale

- contain only Shatta

NEVER use the full reference sheet as the runtime character.

==================================================

IF ART ASSETS CANNOT BE EXTRACTED

==================================================

Do NOT fake the missing artwork with CSS.

Do NOT claim a true walk cycle exists when it is only one image being transformed.

Instead:

1. Build the complete animation/state architecture.

2. Use the available transparent assets where appropriate.

3. Clearly identify the exact missing pose assets required.

4. Do not invent a visually different Shatta.

==================================================

FEATURE PARITY

==================================================

The final Shatta product must retain the mature functionality of the uploaded CyberFox project:

- web landing page

- transparent overlay

- Electron desktop companion

- walking

- idle

- sleeping

- wake

- celebration

- click

- double-click

- hover

- drag

- speech bubbles

- AI chat

- streaming responses

- thinking state

- voice input

- voice output

- audio effects

- mute

- volume

- settings

- local persistence

- reduced motion

- hidden-tab pause

- offline fallback

- developer context where already supported

But the character itself must be completely Shatta.

==================================================

QUALITY BAR

==================================================

Do not optimize for "feature checkbox completed".

The goal is:

A genuinely alive, cute, funny, polished desktop companion.

Shatta should feel like a living little creature on the desktop.

==================================================

WORKFLOW

==================================================

IMPORTANT:

Do NOT immediately start rewriting files.

First inspect the uploaded project and give me a concise implementation plan containing:

1. Existing reusable systems.

2. Existing CyberFox-specific systems that must be replaced.

3. Existing Shatta-related code, if any.

4. Assets available.

5. Assets still required.

6. Proposed clean Shatta architecture.

7. Files you expect to change.

WAIT FOR MY APPROVAL BEFORE MAKING LARGE CHANGES.

Do not spend credits implementing before the plan is approved.

After approval, implement in logical phases and verify each phase.

==================================================

VERIFICATION

==================================================

Final verification must include:

- tests

- typecheck

- production build

- web /

- web /overlay

- Electron overlay

Verify:

1. Shatta renders without an opaque rectangle.

2. Walk cycle uses real different poses.

3. Idle is alive.

4. Sleep works.

5. Wake works.

6. Thinking works.

7. Speaking works.

8. Speech bubbles work.

9. AI chat works.

10. Voice input works.

11. Voice output works.

12. Audio works.

13. Drag works.

14. Click works.

15. Double-click works.

16. Compact menu works.

17. Settings persist.

18. Reduced motion works.

19. Hidden-tab/window pause works.

20. Electron and web share the same character engine.

21. No console errors.

Do not package a release until the final verification passes.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/b668b27d-e55b-4426-adb1-949d130f22fb).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
