# 🥬 Scythe & Leeks

> A gloomy leek field, a power game in the financial jungle. You play the "market maker / scythe", moving retail investors' (leeks') money into your own vault.

A **darkly satirical strategy / tycoon** game that runs entirely in the browser. Built with three.js, it turns the "harvesting leeks" metaphor into literal 3D action — lure in retail investors, fatten them up, swing the scythe, and walk the tightrope between regulation, bubbles, and leeks waking up.

[中文](README.md)

## ✨ Features

- 🌑 **Dark realistic green palette**: an oppressive financial jungle where gold coins and cold steel are the only highlights
- 🌱 **Literal metaphor**: leeks grow, get hyped (FOMO), panic, and wake up; when harvested they are cut in the middle and the top half topples over
- 🎯 **30-trading-day settlement**: ranks from "Scythe King" to "Getting Reaped", plus an endless sandbox mode
- 💥 **Emergent systems**: lure → fatten → harvest → upgrade → risk resolution
- 🎲 **Random events**: 8 weighted events — rival crash, policy tailwind, black swan, leek awakening wave, fake news, and more
- 📈 **Economic depth**: bubble, diminishing returns, regulatory heat, reputation, and loyalty all interact
- ✨ **Post-processing**: self-contained Bloom + vignette + ACES tone mapping
- 🔉 **Synthesized audio**: WebAudio ambient bed (wind / city hum) + interaction SFX, no external assets
- 💾 **Local save**: localStorage persistence
- 📱 **Responsive**: desktop drag + mobile pinch-zoom / touch harvesting

## 🎮 Gameplay

Each turn has four phases plus risk resolution:

1. **Lure**: live-streaming / stock-tip groups / wealth courses pull new leeks into the field (lower reputation = higher cost)
2. **Fatten**: hype and community vibes inflate leek wallets (diminishing returns; hotter bubble = faster growth)
3. **Harvest**: swing the scythe; leeks in range convert wallet × conversion rate into cash
4. **Upgrade**: wider blade / sharper blade / crisis PR / identity laundering

**Risk**: harvesting accumulates "regulatory heat" — at max you get "invited for tea" (lose 50% and the run ends). Leeks with full alertness wake up and flee, dragging down your reputation.

## 🚀 Run locally

Pure frontend, no build step, no backend. Because it uses ES Modules, serve it over HTTP (don't open `file://` directly):

```bash
cd leek-harvest

# any of these
python -m http.server 8000     # Python
npx serve .                    # Node
# or use the VS Code Live Server extension
```

Then open `http://127.0.0.1:8000/`.

## 🕹️ Controls

| Action | Input |
|---|---|
| Rotate camera | mouse drag / one-finger drag |
| Zoom | scroll wheel / pinch |
| Harvest | tap "收割" to enter mode, then click the field |
| Next day | "下一天" button at the bottom |

## 🗂️ Project structure

```
leek-harvest/
├── index.html              # Entry + HUD
├── GDD.md                  # Game design document
├── src/
│   ├── main.js             # Bootstrap & main loop
│   ├── scene.js            # Scene / lighting / camera
│   ├── leek.js             # Leek entity & state machine
│   ├── scythe.js           # Scythe & coin particles
│   ├── economy.js          # Economy / numbers
│   ├── events.js           # Random event pool
│   ├── upgrades.js         # Upgrade tree
│   ├── post.js             # Post-processing (Bloom / vignette)
│   ├── audio.js            # WebAudio synth SFX
│   ├── ui.js               # HUD & settlement panel
│   └── state.js            # State + persistence
└── vendor/three/           # Bundled three.js r150 (no CDN)
```

## 📄 Design document

See [`GDD.md`](GDD.md) for the full game design document.

## ⚖️ License

No open-source license specified; all rights reserved.
