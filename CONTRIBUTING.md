# Contributing to Pianotes

Thank you for your interest in contributing to **Pianotes**! Whether you are adding a new instrument synthesis engine, refining the Apple Liquid Glass shaders, improving chord detection, or optimizing WebGL performance, we welcome your contributions.

---

## 🛠 Code of Conduct & Principles

1. **Aesthetic First**: All UI components must conform to the **Apple Liquid Glass** design system:
   - Chromatic edge dispersion (`.liquid-glass::before`, `.liquid-prism-edge`).
   - Hooke's spring dynamics on interaction (`.liquid-glass-btn`, `.liquid-gel-active`).
   - Deep obsidian background palette (`#050508`).
   - Strict hand color distinction: Left Hand (`#a855f7`) vs Right Hand (`#f59e0b`).
2. **Audio Performance**: Audio synthesis runs in Web Audio API. Never block the audio render thread with heavy DOM manipulations.
3. **Zero Test Regressions**: All tests must pass before submitting a pull request (`npm test`).

---

## 💻 Development Setup

### Prerequisites
- Node.js (v18+)
- npm (v9+)

### Installation
```bash
# Clone the repository
git clone https://github.com/Sourish25/Pianotes.git
cd Pianotes

# Install dependencies
npm install

# Start Vite development server
npm run dev
```

The application will be live at `http://localhost:5173`.

---

## 🧪 Testing & Code Quality

Always ensure clean verification before opening a pull request:

```bash
# Run Vitest test suite
npm test

# Run Oxlint for fast linting
npm run lint

# Compile TypeScript and build production bundle
npm run build
```

---

## 📁 Repository Structure

```
Pianotes/
├── docs/                      # Screenshots, diagrams, and architecture guides
│   └── screenshots/
├── src/
│   ├── audio/                 # Web Audio API synthesizers & 4-stage DSP rack
│   │   ├── PianoEngine.ts
│   │   └── MicrophoneListener.ts
│   ├── components/            # React & Three.js UI components
│   │   ├── LiquidGlass.tsx    # Liquid Glass shaders & spring physics
│   │   ├── Waterfall3D.tsx    # Three.js 3D falling note waterfall
│   │   ├── PlayablePiano2D.tsx# 88-key touch/glissando keyboard
│   │   ├── PracticeBar.tsx    # Tempo, Wait-for-Me, looping, mic pitch
│   │   ├── IngestionDrawer.tsx# Social reel parser & song library
│   │   └── InstrumentSelector.tsx # 9-instrument switcher & DSP studio
│   ├── data/                  # Song database & MIDI mappings
│   ├── styles/                # Liquid Glass CSS & piano key styles
│   ├── tests/                 # Vitest test suite
│   ├── types/                 # TypeScript interfaces
│   └── utils/                 # Chord detector & pitch math
├── public/                    # Static assets
└── package.json
```

---

## 🚀 Pull Request Workflow

1. Fork the repository and create your branch from `master`:
   ```bash
   git checkout -b feat/my-new-feature
   ```
2. Commit your changes using conventional commit messages:
   ```bash
   git commit -m "feat: add tape wow flutter depth slider"
   ```
3. Push to your fork and submit a Pull Request against `master`.
4. Ensure CI checks pass (build, tests, and lint).

---

## 📄 License

By contributing to Pianotes, you agree that your contributions will be licensed under the [MIT License](LICENSE).
