# Changelog

All notable changes to the **Pianotes** project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [2.0.0] - 2026-10-07

### 🚀 Production Redesign & UI Debloating (Android-First)
- **Complete UI Transformation & Debloating**:
  - Replaced multiple cluttered floating bars and disjointed modals with a unified, content-first Apple Liquid Glass **Studio Sheet** (`StudioDrawer.tsx`).
  - Seamless tabbed interface grouping **Instruments (9 engines)**, **Studio DSP FX Rack (Reverb, Chorus, Delay, Drive)**, and **Metronome & Micro-Tuning Studio**.
  - Cleaned up obsolete standalone components (`InstrumentSelector.tsx` and `MetronomeStudio.tsx`).
- **Immersive Zen Mode & Smart Chrome Auto-Fade**:
  - Added dedicated **Zen Mode** (`Maximize2` / `Minimize2` toggle in header and practice bar).
  - During playback, non-essential interface chrome smoothly fades into the background (`opacity-0 pointer-events-none -translate-y-full`), dedicating 100% full-screen visual real estate to the 3D waterfall and 2D playable piano.
  - Interactive touches or pointer movements gently wake the chrome with zero jerkiness.
- **Android Native Haptics & Performance Polish**:
  - Integrated Capacitor native haptic feedback (`triggerHaptic`) providing tactile physical tick response on button taps and key strikes.
  - Locked widescreen landscape framing (`sensorLandscape`) with edge-to-edge safe area glass padding (`viewport-fit=cover`).
  - Recompiled production Android APK binaries (`Pianotes-release.apk` 3.42MB and `Pianotes-debug.apk` 4.42MB).

---

## [1.3.0] - 2026-10-07

### Added & Improved
- **Interactive Performance Scoring & Gamification Engine**:
  - Real-time note strike precision evaluation engine comparing user key strikes against piece timestamps:
    - `PERFECT` within ±30ms (100 base points * multiplier)
    - `GREAT` within ±70ms (75 base points * multiplier)
    - `EARLY` between -150ms and -71ms (40 base points)
    - `LATE` between +71ms and +200ms (40 base points)
    - `MISS` beyond +200ms or unplayed notes (breaks streak back to 1x)
  - Live streak combo multiplier with cosmic particle aura at 1x (0–9 hits), 2x (10–24 hits), 4x (25–49 hits), and 8x (50+ hits).
  - Real-time score points accumulator, streak counter, and weighted accuracy % counter in the practice bar.
  - Floating transient strike evaluation toast with neon glow (`PERFECT` cyan/gold, `GREAT` emerald, `EARLY` amber, `LATE` orange, `MISS` crimson).
  - End-of-song **Virtuoso Performance Summary** modal rendered in liquid glass with animated 5-star rating (Virtuoso 5★, Maestro 4★, Pianist 3★, Apprentice 2★, Novice 1★), timing precision breakdown, celebratory canvas-confetti bursts on 4+ stars, and replay / MIDI export options.
- **Live Performance Recorder & Standard MIDI (.mid) Binary Export**:
  - One-tap recording button on practice bar with glowing pulsed recording indicator and elapsed time counter.
  - Captures all user-played keys (via touch, computer keyboard, Web MIDI, and mic) with microsecond timestamp fidelity.
  - Instantaneous session playback: loads directly into the 3D perspective waterfall and 2D playable piano.
  - Direct browser download of recorded performances as valid Standard MIDI (`.mid`) binary files (SMF Format 0, 480 PPQ, tempo meta-events, variable-length delta ticks).
- **Concert Pitch & Metronome Studio**:
  - Micro-tuning frequency selector: standard A440Hz modern, healing A432Hz sacred Verdi, orchestral A442Hz European, and Baroque A415Hz chamber temperament with instant 88-key real-time audio retuning.
  - Audio metronome with high-precision Web Audio lookahead scheduling, visual glass pendulum that physically sways with beat phase, beat accenting (4/4, 3/4, 6/8), and volume control.
- **Expanded Song Repertoire with Search & Category Filtering**:
  - Expanded built-in library with 9 pieces:
    - Chopin's Nocturne Op. 9 No. 2 (Eb Major, Virtuoso, Classical)
    - Beethoven's Für Elise (A minor, Intermediate, Classical)
    - Debussy's Clair de Lune (Db Major, Intermediate, Classical)
    - Pachelbel's Canon in D (D Major, Beginner, Classical)
    - Yiruma's River Flows In You (A Major, Intermediate, Neo-Soul)
    - Hans Zimmer's Interstellar Theme / Cornfield Chase (A minor, Intermediate, Cinematic)
    - Joe Hisaishi's Merry-Go-Round of Life (G minor, Intermediate, Anime)
    - Erik Satie's Gymnopédie No. 1 (D Major, Beginner, Classical)
    - Midnight Cassette Groove (C minor, Beginner, Lo-Fi)
  - Dynamic search bar filtering by piece, composer, key signature, difficulty, or tags.
  - Category filter pills: All, Classical, Cinematic, Anime, Neo-Soul, Lo-Fi.
- **Automated Verification & Unit Tests**:
  - Expanded unit test specifications in `src/tests/pianotes.test.ts` (37 passing tests total) covering strike evaluation windows, streak multipliers, MIDI binary generation & round-trip decoding, concert pitch micro-tuning, repertoire integrity, metronome beat accents, rapid repeated keystroke recorder buffers, and Uint8Array MIDI parsing.

---

## [1.2.0] - 2026-10-06

### Added & Improved
- **Native Android APK Architecture & Capacitor 8 Integration**:
  - Configured `@capacitor/core`, `@capacitor/cli`, and `@capacitor/android` with app ID `com.pianotes.app` and app name `Pianotes`.
  - Configured `capacitor.config.ts` with Android hardware acceleration, secure origin scheme, SystemBars edge-to-edge insets handling, and orientation settings.
  - Set `viewport-fit=cover` and Capacitor `SystemBars` plugin to eliminate letterboxing around camera cutouts and gesture bars.
  - Initialized native Android workspace with Gradle 8.14 and Android SDK 36.
- **Android Manifest & Device Permissions**:
  - Added `android.permission.RECORD_AUDIO` for real-time acoustic piano microphone listening.
  - Added `android.permission.INTERNET` for social reels and cloud sheet synchronization.
  - Added `android.permission.MODIFY_AUDIO_SETTINGS` for low-latency native audio buffer optimization.
  - Configured `android.software.midi` and `android.hardware.microphone` hardware features for USB/Bluetooth MIDI keyboards.
  - Enabled hardware acceleration (`android:hardwareAccelerated="true"`) for 60 FPS Three.js 3D waterfall rendering.
  - Configured `android:screenOrientation="sensorLandscape"` to ensure the app launches automatically in widescreen piano performance mode.
- **Production-Grade GitHub Actions CI/CD Pipeline (`.github/workflows/build-apk.yml`)**:
  - Automated workflow building both `Pianotes-release.apk` and `Pianotes-debug.apk` using `android-actions/setup-android@v3`.
  - Added `.gitattributes` to guarantee Gradle wrapper LF line endings across operating systems.
  - Automated APK artifact upload (30-day retention) on push and pull requests to `master`.
  - Automated GitHub Releases publishing on tag releases (`v*`).
- **Local APK Compilation Verified**:
  - Verified local build pipeline: `app-debug.apk` (4.4 MB) and signed `app-release.apk` (3.4 MB) compile cleanly via `./gradlew assembleDebug assembleRelease`.
  - Added `npm run cap:sync` and `npm run cap:open` scripts to `package.json`.

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
