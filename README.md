# ÆTHER — AI Creative Studio

A Claude-powered creative workspace with three distinct modes of thought, an animated starfield, and persistent session history. Built as a single React component.

---

## Features

**Three AI Modes**

- **◎ Oracle** — Ask anything and receive a profound, metaphor-rich answer. Philosophy, science, culture, life — the cosmos replies with depth and specificity.
- **⬡ Forge** — Feed it a word, emotion, or seed idea and it transmutes it into a poem or lyrical prose fragment. Surprising, emotionally resonant, never generic.
- **◈ Lens** — Any concept examined from three genuinely contrasting perspectives drawn from different disciplines, cultures, or schools of thought.

**UI & Experience**

- Animated starfield canvas background with drifting, twinkling stars
- Mode-specific nebula glow that shifts color with each mode transition
- Typewriter text animation — responses reveal character by character
- Inline markdown rendering for bold headers in Lens mode
- Quick-start prompt cards to spark inspiration
- Copy response to clipboard with a single click
- Session history drawer with up to 20 recent sessions, persisted across reloads
- Click any history item to restore the full session
- `⌘↵` keyboard shortcut to invoke

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 18 (hooks) |
| Styling | Inline styles + Tailwind utility classes |
| AI | Anthropic Claude (`claude-sonnet-4-20250514`) |
| Animation | Canvas API (`requestAnimationFrame`) |
| Persistence | `window.storage` (Claude artifact storage API) |
| Fonts | Cormorant Garamond · DM Mono (Google Fonts) |

---

## Project Structure

```
aether.jsx
└── StarField            Canvas starfield animation component
└── TypewriterText       Letter-by-letter text reveal with markdown parsing
└── HistoryItem          Clickable session history entry
└── Aether (default)     Root app — layout, state, API calls
```

---

## How It Works

### AI Calls

Each mode sends a tailored system prompt to the Anthropic API alongside the user's query. Responses are returned in full and then animated via the `TypewriterText` component, which streams characters at ~10ms intervals and parses `**bold**` syntax inline.

```js
const res = await fetch("https://api.anthropic.com/v1/messages", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1000,
    system: mode.system,
    messages: [{ role: "user", content: query }]
  })
});
```

### Starfield Animation

A `<canvas>` element fills the viewport. 130 stars are initialised with random position, velocity, radius, and phase offset. Each frame, stars drift upward and twinkle via a sine wave applied to opacity. On viewport resize, the canvas and star array reinitialise.

### Persistence

Session history is serialised to JSON and stored via `window.storage.set("aether-history", ...)`. On mount, the app attempts to read it back. History is capped at 20 entries and stored newest-first.

---

## Modes — System Prompts

**Oracle**
> You are a wise, eloquent oracle. Give profound, thoughtful answers in 3-5 vivid sentences. Use metaphor when it illuminates. Be specific, never generic. Surprise the reader.

**Forge**
> You are a master poet and creative writer. Transform the given input into something beautiful and unexpected — a poem, vivid prose, or lyrical fragment. 60-100 words. Be surprising and emotionally resonant.

**Lens**
> You are a multi-perspectival thinker. Present exactly 3 contrasting perspectives on the topic, formatted with bold headers. Make each perspective genuinely distinct and illuminating.

---

## Running Locally

Drop `aether.jsx` into any React + Tailwind project, or open it directly in the Claude artifact viewer. No build step required when used as a Claude artifact.

For standalone use, install dependencies:

```bash
npm install react react-dom
```

Note: the `window.storage` persistence API is specific to the Claude artifact environment. Replace with `localStorage` for standalone deployment.

---

## Design Decisions

The palette centres on near-black (`#05060F`) with warm cream text (`#E8E0D0`) and three accent ramps — amber gold for Oracle, soft violet for Forge, seafoam for Lens. Cormorant Garamond brings editorial weight to the logotype and response body; DM Mono handles all labels and metadata for a clean technical contrast.

The nebula glow — a blurred, radial colour orb behind the input — transitions with each mode switch, making the colour change feel spatial rather than cosmetic.

---

## License

MIT
