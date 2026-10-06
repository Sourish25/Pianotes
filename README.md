# Pianotes 🎹✨

<div align="center">

![License: MIT](https://img.shields.io/badge/License-MIT-purple.svg?style=for-the-badge)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![React 19](https://img.shields.io/badge/React_19-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Three.js](https://img.shields.io/badge/Three.js-000000?style=for-the-badge&logo=three.dot.js&logoColor=white)
![Web Audio](https://img.shields.io/badge/Web_Audio_API-f59e0b?style=for-the-badge&logo=audio&logoColor=white)
![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=for-the-badge)

<p align="center">
  <b>A 1:1 Apple Liquid Glass 3D Piano & Falling Note Synthesizer for the Web and Mobile.</b><br>
  Dual viewports, real-time IRL acoustic microphone pitch detection, 9-voice sound engine, 4-stage DSP effects rack, and social reel transcription pipeline.
</p>

</div>

---

<div align="center">
  <img src="docs/screenshots/hero-waterfall.jpg" alt="Pianotes 3D Waterfall Viewport" width="100%" style="border-radius: 16px; box-shadow: 0 20px 50px rgba(0,0,0,0.8);" />
</div>

---

## 🌟 Overview

**Pianotes** is an open-source piano application built to redefine music learning and performance on modern screens. Inspired by classic falling-note synthesizers and infused with Apple’s state-of-the-art **Liquid Glass** aesthetic, Pianotes combines 3D perspective graphics, tactile physical spring dynamics, studio-grade Web Audio synthesis, and intelligent practice modes.

Whether you want to learn classical masterpieces with the intelligent **"Wait-for-Me"** mode, jam on the **88-key touch keyboard**, listen to your **real acoustic piano** via your microphone, or transcribe piano pieces from **Instagram Reels, TikToks, and YouTube Shorts**, Pianotes delivers an uncompromised experience.

---

## 💎 Core Highlights

### 1. 1:1 Apple Liquid Glass Aesthetic
- **Multi-pass Optical Refraction & Dispersion**: Real-time chromatic aberration along beveled glass borders using SVG `feDisplacementMap` and RGB channel separation matrices.
- **Hooke's Spring Gel Physics**: Buttons, pills, and bottom sheets dynamically indent when pressed and elastically recoil on release with true spring physics.
- **Dynamic Specular Sheen**: Pointer tracking calculates incident light angles to sweep specular radial highlights across glass panels in real time.
- **220% Saturation Boost**: Backdrop filters amplify color vibrancy through glass elements, eliminating muddy greys and giving rich, luminous presence.
- **Obsidian Dark Palette (`#050508`)**: Ambient luminescence contrasts cleanly against midnight obsidian black.
- **Hand Isolation Colorway**: Left Hand in Electric Violet (`#a855f7`) and Right Hand in Radiant Warm Amber (`#f59e0b`).

---

### 2. Dual Viewport Architecture
<div align="center">
  <img src="docs/screenshots/dual-viewport.jpg" alt="Pianotes Dual Viewport and Practice Bar" width="100%" style="border-radius: 16px; margin: 16px 0;" />
</div>

- **3D Perspective Waterfall Viewport**:
  - WebGL rendered with Three.js.
  - Left Hand violet and Right Hand amber cascading note bars.
  - Physical 3D keys with spring-loaded rebound physics upon note strike.
  - Neon strike line with active particle burst cosmic sparks.
  - Camera orbit navigation (click and drag to rotate viewing angles in 3D space).
  - Floating chord badge displaying real-time harmonic analysis (`Fm`, `C`, `Ab`, `Bb`, etc.).
- **2D Standalone Playable Piano**:
  - Full 88-key keyboard (MIDI 21 $A_0$ to MIDI 108 $C_8$) with white and black key physics.
  - Touch-sensitive glissando sliding across keys without missing a note.
  - Dynamic octave navigator mini-map ribbon for rapid viewport repositioning.
  - Real-time LED key illumination reflecting both computer playback and user interaction.
- **Split Dual View**:
  - Simultaneous top 3D waterfall and bottom 2D playable piano with real-time bidirectional synchronization.

---

### 3. Diverse 9-Engine Sound Synthesizer & 4-Stage DSP Rack
<div align="center">
  <img src="docs/screenshots/dsp-studio.jpg" alt="Pianotes DSP Effects Rack and Sound Studio" width="100%" style="border-radius: 16px; margin: 16px 0;" />
</div>

Pianotes features an extensive Web Audio API synthesizer library with **9 distinct sound profiles** and a **4-stage studio DSP effects rack**:

| Instrument | Engine Type | Acoustic Signature |
| :--- | :--- | :--- |
| **Concert Grand** | Multi-Harmonic Additive | 9-foot Steinway Model D with hammer transient click and hall resonance |
| **Vintage Upright** | Studio Felted | Warm hammer intimacy, woody double-string detune honky-tonk warmth |
| **Muted Felt Piano** | Intimate Neoclassical | Soft felt dampers, 1100 Hz lowpass filter, gentle hammer thud |
| **Neo-Soul Rhodes** | Electric Tine Mark I | 4th harmonic bell tine, warm body harmonics, 4.8 Hz gentle soul tremolo |
| **Classic Wurlitzer**| Vintage Reed 200A | Struck steel reed, dynamic tube bark, 6.0 Hz authentic mechanical vibrato |
| **DX7 FM E-Piano** | 2-Operator FM | Bright, crystal metallic bell chime with instant transient attack |
| **Lo-Fi Tape Piano**| Cassette Deck Emulation | Analog wow & flutter pitch drift, warm bandpass tape head cutoff |
| **Celesta Bell** | Orchestral Bell Plates | High-harmonic crystalline chime struck with felt hammers on steel |
| **Neon Synth Keys** | Analog Polysynth | Dual detuned saw waves, resonant lowpass filter sweep, sub-bass octave |

#### 🎛 4-Stage Studio DSP Effects Rack
1. **Algorithmic Convolver Reverb**: Room impulse response convolution simulating concert hall acoustic space with customizable decay time and wet mix.
2. **Stereo Analog Chorus**: LFO-modulated delay line producing lush stereo width, detuned shimmer, and warmth.
3. **Tempo Rhythm Delay**: Rhythmic echo feedback loop with adjustable regeneration and stereo spread.
4. **Analog Tape Drive / Tube Saturation**: Hyperbolic tangent (`tanh`) waveshaper adding warm analog harmonic coloration and soft clipping.

---

### 4. Interactive Practice & "Wait-for-Me" Mode
- **"Wait-for-Me" Mode**: When enabled, song playback automatically pauses at the strike line whenever a note is reached until you press the correct piano key on screen or play it on your physical piano!
- **Real-time Acoustic Microphone Pitch Detection**:
  - Uses the Web Audio API with autocorrelation pitch extraction.
  - Play an actual acoustic piano in your room, and Pianotes hears the note IRL and presses the corresponding key on screen with live VU metering.
- **Hand Isolation Practice**:
  - Isolate Left Hand only (Violet), Right Hand only (Amber), or practice Both Hands simultaneously.
- **A-B Loop Practice**: Set loop start and loop end markers to practice difficult passages repetitively.
- **Variable Tempo Scaler**: Slow down complex pieces to `0.25x` or speed up to `1.5x` without pitch alteration.

---

### 5. Social Reel Ingestion & Transcription Pipeline
- **Social Media Parser**: Paste links from **Instagram Reels**, **TikTok**, or **YouTube Shorts**.
- **Media File Dropzone**: Drag and drop `.mp4`, `.mov`, `.midi`, or `.mp3` files directly into Pianotes.
- **Transcription Architecture**:
  ```
  [Social Reel / Video] ──► [Audio Demux] ──► [Demucs Stem Separator]
                                                    │
                                             (Piano Stem)
                                                    ▼
  [Interactive Waterfall] ◄── [MIDI JSON] ◄── [ByteDance AMT Onset/Frame Model]
  ```
- **Masterpiece Library Pre-loaded**:
  - *Interstellar Main Theme* — Hans Zimmer (Virtuoso)
  - *Nocturne Op. 9 No. 2* — Frédéric Chopin (Intermediate)
  - *Clair de Lune* — Claude Debussy (Intermediate)
  - *One Summer's Day (Spirited Away)* — Joe Hisaishi (Intermediate)
  - *Gymnopédie No. 1* — Erik Satie (Beginner)

---

## ⌨ Keyboard Shortcuts

| Shortcut | Action |
| :--- | :--- |
| `Space` | Sustain Pedal (Hold or Latch) / Play-Pause |
| `A`, `W`, `S`, `E`, `D`, `F`, `T`, `G`, `Y`, `H`, `U`, `J`, `K` | Playable Piano Keys ($C_4$ to $C_5$) |
| `Left Click + Drag` in 3D Viewport | Orbit 3D Camera Angle |
| `Click & Drag` on 2D Piano Keys | Smooth Glissando Piano Slide |
| `Click` on Mini-map Ribbon | Fast Scroll Octave Viewport |

---

## 🛠 Technology Stack

- **Framework**: [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- **Bundler & Tooling**: [Vite](https://vitejs.dev/) + [Oxlint](https://oxc-project.github.io/)
- **3D Graphics Engine**: [Three.js](https://threejs.org/) (WebGL Canvas, Shader Materials, Particle Systems)
- **Audio Synthesis**: Native [Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API) (ConvolverNode, WaveShaperNode, BiquadFilterNode, StereoPannerNode, DelayNode)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/) + Custom Apple Liquid Glass CSS Shaders
- **Testing**: [Vitest](https://vitest.dev/)

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18 or later
- npm 9 or later

### Installation

```bash
# Clone the repository
git clone https://github.com/Sourish25/Pianotes.git
cd Pianotes

# Install dependencies
npm install

# Start development server
npm run dev
```

Open your browser at `http://localhost:5173`.

### Production Build

```bash
# Build production bundle
npm run build

# Preview production build locally
npm run preview
```

### Running Test Suite

```bash
# Run unit and musical theory tests
npm test

# Run Oxlint
npm run lint
```

---

## 🗺 Roadmap

- [x] Apple Liquid Glass UI & Gel-bending spring mechanics.
- [x] 3D Waterfall viewport with cosmic strike sparks and key rebound.
- [x] Standalone 88-key playable piano with glissando and mini-map ribbon.
- [x] 9-Instrument synthesis engine library.
- [x] 4-Stage DSP effects rack (Reverb, Chorus, Delay, Tape Drive).
- [x] "Wait-for-Me" interactive learning mode.
- [x] Real-time IRL acoustic microphone pitch detector.
- [x] Social reel ingestion modal & Demucs / ByteDance AMT pipeline.
- [ ] WebAssembly-accelerated ONNX runtime for on-device reel transcription.
- [ ] WebMIDI API hardware keyboard input connection.
- [ ] Multiplayer collaborative piano duet room via WebRTC.

---

## 🤝 Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct and development workflow.

---

## 📄 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.
