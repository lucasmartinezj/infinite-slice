# 🎮 Infinite Slice

Fruit Ninja-style game built for **InfinitePay** in December 2025, where you slice the competitors’ card machines while protecting the InfinitePay logo.

## 🎯 How to Play

1. **Slice** the colorful competitor card machines.
2. **Do NOT slice** the InfinitePay logo (green coin).
3. Each level has a **Boss** (giant machine) that needs multiple hits.
4. Clear all 4 levels to win.

## 🏆 Levels

| Level | Name | Difficulty |
|-------|------|------------|
| 1 | Crescere | ⭐ |
| 2 | Novus | ⭐⭐ |
| 3 | Magnus | ⭐⭐⭐ |
| 4 | Optimus | ⭐⭐⭐⭐ |
| 5 | Infinite Loop | ⭐⭐⭐⭐⭐ |

## 🎮 Controls

- **Mouse/Touch**: Drag to slice

## 🚀 Run Locally

Open `index.html` in any modern browser, or start a simple local server:

```bash
npx serve .
# or
python -m http.server 8000
```

## 🌐 Live Demo

Deployed on Netlify: https://luminous-gelato-8229fb.netlify.app/

## 📁 Structure

```
infinite-slice/
├── index.html          # Entry point
├── css/
│   └── style.css       # Game styles
├── js/
│   ├── game.js         # Core game loop
│   ├── models.js       # 3D models
│   ├── particles.js    # Particle system
│   ├── slice.js        # Slice detection
│   ├── audio.js        # Audio system
│   ├── ui.js           # UI elements
│   └── config.js       # Settings
└── assets/
    └── sounds/         # Sound effects
```

## 🛠️ Tech

- **Three.js** - 3D rendering
- **HTML5 Canvas** - UI
- **Web Audio API** - Audio
- **CSS3** - Animations and styling

## 📝 License

Built for Lucas Martinez © December, 2025