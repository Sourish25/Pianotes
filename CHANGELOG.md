# Changelog

All notable changes to the **Pianotes** project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.1.0] - 2026-10-06

### Fixed & Resolved
- **Wait-for-Me Deadlock & Note Satisfaction**:
  - Replaced transient key state polling with persistent `satisfiedNoteIdsRef` tracking.
  - Fixed freeze bug where releasing a key or timeout expiration caused the lookback filter to re-pause time indefinitely on the same note.
  - Synchronized user-struck keys from 2D piano, computer keyboard, Web MIDI, and microphone directly to note satisfaction.
- **Web Audio Zero-Gain Ramp Exceptions**:
  - Clamped release envelope gain values to `Math.max(0.0001, ...)` across all 9 synthesizer profiles, preventing Web Audio `exponentialRampToValueAtTime` zero-value runtime crashes.
- **Missing Key Release Notification**:
  - Wired `onUserReleaseKey` throughout `PlayablePiano2D`, computer keyboard `keyup`, and `WebMidiManager`, eliminating artificial key release delays.

### Added & Improved
- **Physical 3D Key Tilting**:
  - Added true mechanical lever rotation (`rotation.x`) around piano balance pin fulcrums in `Waterfall3D`, creating authentic downward key pitch tilt during note strikes.
- **3D Camera Wheel Zoom & View Reset**:
  - Implemented mouse wheel and pinch zoom scaling (`0.65x` to `1.8x`) in 3D waterfall.
  - Added dedicated "Reset 3D View" glass pill button and canvas double-click gesture to return to default orbit.
- **2D Octave Quick-Switcher**:
  - Built dedicated octave navigation ribbon (`C1` through `C7` and `[◀ Oct]` / `[Oct ▶]`) in `PlayablePiano2D` with active octave indicator and smooth viewport centering.
- **Native Standard MIDI Binary Parser (`src/utils/midiParser.ts`)**:
  - Pure TypeScript zero-dependency binary SMF parser reading `MThd` and `MTrk` chunks.
  - Automatically calculates real-world seconds from variable-length delta ticks and tempo meta-events (0x51).
  - Automatically clusters notes into Left Hand Violet (`pitch < 60`) and Right Hand Amber (`pitch >= 60`).
- **Interactive Demucs v4 + ByteDance AMT Architecture Studio**:
  - Added dedicated "Demucs & AMT Pipeline" tab in `IngestionDrawer` with 4-stage pipeline visualization, model selector (`htdemucs_ft` vs `demucs_v4_extra`), and interactive Onset / Frame threshold controls.
- **Hardware Web MIDI API Integration (`src/audio/WebMidiManager.ts`)**:
  - Plug-and-play support for USB and Bluetooth digital pianos (Yamaha, Roland, Casio, Kawai, Korg).
  - Listens to real-time `noteon`, `noteoff`, and sustain pedal (`CC 64`) events with zero latency.
  - Displays active connected device badge in header navigation.
- **Expanded Test Coverage**:
  - Added 4 new test suites for binary MIDI parsing, Wait-for-Me progression without deadlock, and octave conversions (19 passing unit tests total).

---

## [1.0.0] - 2026-10-06

### Added
- **1:1 Apple Liquid Glass Aesthetic Engine**:
  - Optical multi-pass refraction and chromatic dispersion using SVG `feDisplacementMap` and RGB channel separation.
  - Interactive gel-bending physics implementing Hooke's law spring recoil on pointer click and drag.
  - Dynamic specular highlight sheen responsive to incident cursor lighting angles.
  - 220% saturation boost backdrop filter over deep obsidian dark palette (`#050508`).
  - Strict hand illumination color coding: Left Hand Electric Violet (`#a855f7`) and Right Hand Warm Amber (`#f59e0b`).
- **Dual Viewports**:
  - **3D Perspective Waterfall**: Three.js WebGL canvas with 3D tilting keyboard, physical key depressions, active octave tracking, neon strike line, cosmic spark bursts, and drag orbit camera rotation.
  - **2D Standalone Playable Piano**: Interactive 88-key touch and mouse keyboard with smooth glissando sliding, octave navigator mini-map, key LED indicators, and sustain pedal latch (Spacebar).
  - **Split Dual View**: Simultaneous synchronized 3D waterfall visualization and 2D playable piano.
- **Audio Synthesizer & 4-Stage DSP Rack**:
  - 9 distinct real-time synthesis engines:
    1. *Steinway Concert Grand* (9-foot hall resonance, hammer click transient, multi-harmonic overtones).
    2. *Vintage Upright* (felted hammer intimacy, woody double-string detune).
    3. *Muted Felt Piano* (warm lowpass proximity, muted felt dampening).
    4. *Neo-Soul Rhodes* (metallic bell tine, warm body, 4.8 Hz soul tremolo).
    5. *Classic Wurlitzer* (struck steel reed, dynamic tube bark, 6.0 Hz vibrato).
    6. *DX7 FM E-Piano* (bright 80s 2-operator FM metallic bell tine).
    7. *Lo-Fi Tape Piano* (analog wow & flutter pitch drift, warm cassette bandpass).
    8. *Celesta Bell* (crystalline high harmonic chime struck with felt on steel).
    9. *Neon Synth Keys* (analog polysynth dual saw, resonant filter sweep, sub-bass).
  - 4-Stage Studio DSP Effects Rack with real-time bypass toggles and parameter sliders:
    - *Algorithmic Convolver Reverb* (decay & wet mix).
    - *Stereo Analog Chorus* (LFO modulation depth).
    - *Tempo Rhythm Delay* (regenerative feedback).
    - *Analog Tape Drive* (hyperbolic tangent saturation waveshaper).
- **Practice & Interactive Learning Engine**:
  - *"Wait-for-Me" Mode*: Dynamically freezes playback at strike line until the correct MIDI note is struck by the learner, displaying a floating responsive guidance pill.
  - *Real-time IRL Microphone Pitch Detection*: Web Audio API autocorrelation frequency detector allowing acoustic piano practice directly in front of the device.
  - *Dynamic Chord Badge Detector*: Identifies major, minor, 7th, 9th, sus2, sus4, and dyads/power chords (including flat symbols `Fm`, `Ab`, `Bb`, `Eb`, `C`).
  - *Practice Bar*: Tempo scaler (0.25x - 1.5x), loop selector (A-B markers), hand isolation toggles (Left, Right, Both), and keyboard shortcuts.
- **Social Reel Ingestion & Transcription Architecture**:
  - Social media URL link parser (Instagram Reels, YouTube Shorts, TikTok).
  - Audio and video file dropzone (`.mp4`, `.mov`, `.midi`, `.mp3`).
  - Dual-model transcription pipeline documentation based on Demucs stem isolation & ByteDance AMT architecture.
  - 5 pre-loaded masterpiece compositions (Hans Zimmer's *Interstellar*, Chopin's *Nocturne Op. 9 No. 2*, Debussy's *Clair de Lune*, Joe Hisaishi's *One Summer's Day*, Erik Satie's *Gymnopédie No. 1*).
- **Open Source Repository Infrastructure**:
  - MIT License.
  - Full contributing guide (`CONTRIBUTING.md`).
  - Comprehensive unit test suite covering chord theory, note mapping, audio frequencies, and DSP configurations.
