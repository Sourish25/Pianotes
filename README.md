# Pianotes — Apple Liquid Glass 3D Piano (Web UI Demo)

A 1:1 Apple Liquid Glass aesthetic piano application web prototype built with Vite, React, TypeScript, Three.js, and Web Audio API.

## Features

1. **1:1 Apple Liquid Glass Aesthetic**
   - Multi-pass optical refraction & chromatic aberration (RGB channel dispersion via SVG filters).
   - Interactive gel-bending spring physics: pills and sheets indent and elastically recoil on pointer tap/drag.
   - Dynamic specular highlight sheen responding to cursor light angle.
   - 220% saturation boost on backdrop pixels to eliminate muddy grey.
   - Deep obsidian/midnight palette (`#050508`) with ambient luminescence.

2. **Dual Viewports**
   - **3D Perspective Waterfall view:** Falling note bars with Left Hand in violet/purple (`#a855f7`) and Right Hand in warm amber/gold (`#f59e0b`), 3D physical piano key depressions with spring rebound, cosmic strike spark burst particles, active octave focus, and real-time floating chord badges.
   - **2D Standalone Playable Piano view:** Interactive 88-key keyboard with octave navigator mini-map, glissando dragging, note labels, and sustain pedal latch (Spacebar).
   - **Split Dual View:** Simultaneous 3D waterfall and 2D playable piano.

3. **Core Drawers & Practice Controls**
   - **Share / Ingestion drawer:** Social media reel / TikTok / Short link parser, file upload dropzone (.mp4/.midi), and 5 pre-loaded classical & cinematic masterpieces (Hans Zimmer, Chopin, Debussy, Hisaishi, Satie).
   - **Instrument Switcher:** 6 real-time synthesis engines (Concert Grand, Vintage Upright, Neo-Soul Rhodes, DX7 FM E-Piano, Lo-Fi Tape Piano, Celesta).
   - **Practice Bar:** "Wait-for-Me" mode, tempo slider (0.25x - 1.5x), A-B loop selector, live acoustic piano microphone pitch detection with VU meter, and hand isolation toggles.

## Running Locally

To run the web demo:

```bash
npm run dev
```

Open your browser at `http://localhost:5173`.

To run the test suite:

```bash
npm test
```
