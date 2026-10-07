# Changelog

All notable changes to the **Pianotes** project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [2.5.0] - 2026-10-07

### 🎹 Tactile 3D Piano Engine, Reflective Glass Runway & Feathered Radial Nebula
- **Direct 3D Tactile Piano Touch & 3D Glissando**:
  - Implemented Three.js `Raycaster` camera intersection pipeline on the 88-key 3D piano keys.
  - Multi-touch pointer map (`active3DPointersRef`) supporting chord strikes and sliding across keys for authentic 3D glissando.
  - Vertical touch depth velocity sensitivity: striking near the front white key lip yields forte (`0.90`), while striking near the root yields piano (`0.50`).
  - Pointer interactions discriminate between 3D piano keys (triggering audio, haptics, shockwaves, and key dips) and the background canvas (triggering smooth camera drag rotation).
- **100% Key Clearance in Solo 3D Mode via Docked Transport Pill**:
  - Docked the `CompactTransportPill` into the bottom-left corner of the 3D viewport (above A0/B0 bass keys, with safe area inset margins).
  - Passed `hasPianoKeyboard={true}` across all modes, completely eliminating the floating Practice Bar from occluding Middle C (C4–G4) in 3D mode.
  - Tapping "Tools" expands the full practice control sheet above the keys.
- **Procedural Feathered Radial Celestial Nebula**:
  - Replaced flat rectangular background mesh with a procedural 512x256 radial gradient texture with smooth alpha falloff (`rgba(88,28,135,0.42)` to transparent `rgba(0,0,0,0)`), completely eliminating hard rectangular boundary lines in the starfield.
- **Steinway Front Apron Stretcher Rail & Gold Brass Bevel**:
  - Modeled a polished obsidian front stretcher rail (`BoxGeometry(57.2, 0.75, 0.45)`) below the white key overhang, crowned with an embossed gold brass bevel line (`0xd4af37`), giving the 3D piano solid concert grand mass.
- **Dynamic Key Impact Specular PointLight**:
  - Real-time PointLight tracking the centroid of active notes, dynamically shifting between Electric Violet (`0xa855f7`) for Left Hand and Radiant Amber (`0xf59e0b`) for Right Hand.
  - Pulses specular bounce highlights across the obsidian mirror fallboard, Steinway gold crest, and damper felt during key strikes.
- **Flush Damper Felt Ribbon Alignment**:
  - Repositioned the crimson damper felt ribbon to sit flush against the fallboard base (`Z = STRIKE_Z + 0.12`), preventing felt blocks from overlapping black key roots in POV and Top-Down modes.
- **Extended 5.5s Lookahead Waterfall Vista & Exponential Fog**:
  - Expanded `VISIBLE_WINDOW` from 4.5s to 5.5s (77 units into the distance), streaming notes from deep in the cosmos down to the keybed.
  - Integrated `THREE.FogExp2(0x040407, 0.007)` to seamlessly blend the distant runway into the cosmic starfield.
- **Quality Assurance**:
  - Expanded unit test suite to 67 passing tests (`vitest`).
  - Zero lint errors and zero warnings (`oxlint`).
  - Clean native Android APKs built via Gradle.

---

## [2.4.0] - 2026-10-07

### 🌌 3D Grand Concert Engine, Obsidian Fallboard Mirror & Celestial Atmosphere
- **Mathematical Aspect-Ratio Aware Lower-Third Camera Anchoring**:
  - Implemented dynamic FOV compensation (`requiredDist = 28 / (0.93 * aspect * tanHalfFov)`) ensuring all 88 keys span 92–94% of the viewport width across tablets (16:10, 4:3) and widescreen phones (16:9, 20:9).
  - Anchors the 3D keyboard cleanly in the lower 15–25% of the screen, completely eliminating the previous 48% black void beneath the keys.
- **ResizeObserver WebGL Integration**:
  - Added dedicated `ResizeObserver` on the 3D container, instantly updating camera aspect ratio, projection matrix, and WebGL renderer resolution when switching between Dual View (`h-[50%]`) and Solo 3D Waterfall (`h-full`).
- **Steinway Obsidian Lacquer Fallboard Mirror & Gold Crest**:
  - Modeled high-gloss obsidian fallboard mirror (`Z = STRIKE_Z + 0.1`, `roughness: 0.12`, `metalness: 0.86`) reflecting falling notes and strike flashes directly behind the damper felt.
  - Embossed gold Steinway & Sons style acoustic crest (`0xd4af37`, `emissiveIntensity: 0.45`) crowning the center fallboard.
- **Luminous Crystal Notes & White-Hot Strike Lips**:
  - Re-engineered falling notes into compound crystal geometries with refractive crystal core bodies and white-hot neon front strike lips (`emissiveIntensity: 1.6` on active key strikes).
  - Expanded shockwave rings capped at 24 concurrent pooled instances (`RingGeometry` rotated -90° on X) to prevent garbage collection pauses.
- **Cosmic Starfield & Deep Nebula Atmosphere**:
  - 850 multi-spectral twinkling stars across depth coordinates with sine-wave twinkle pulsation.
  - Deep indigo-violet celestial nebula plane (`0x24124d`) bathing the horizon in ambient luminescence.
- **4 Real-Time Switchable Camera Presets**:
  - **Grand Concert**: Full 88-key concert depth, lower-third anchored.
  - **Pianist POV**: Eye-level performer seat view looking down the keybed.
  - **Top-Down Arcade**: Elevated overhead view with crystal falling lanes.
  - **Orbit**: Lissajous glider view with organic sway and smooth interpolation.
- **Comprehensive Test Suite & Native Builds**:
  - 63 unit tests passing (`vitest`).
  - 0 lint errors (`oxlint`).
  - Clean native Android APKs built via Gradle (`Pianotes-release.apk` and `Pianotes-debug.apk`).

---

## [2.3.0] - 2026-10-07

### 🚀 Docked Transport Rail, Fullscreen 2D Piano Expansion, Camera Horizon & Safe HUD Offsets
- **100% White Key Clearance via Integrated Transport Rail**:
  - Exported `CompactTransportPill` (`[ Play/Pause | Time | Hand | Tools ]`) and docked it directly into the center whitespace gap of `PlayablePiano2D`'s Octave strip on mobile landscape.
  - Suppressed the floating bottom practice pill when a piano keyboard is active (`hasPianoKeyboard && effectiveCompact`), completely eliminating thumb occlusion on Middle C keys (C4, D4, E4).
  - Tapping "Tools" smoothly expands the floating practice sheet above the keyboard when comprehensive controls (Tempo, Count-In, Loop, Recording, Metronome) are requested.
- **Fullscreen Responsive 2D Piano Key Expansion**:
  - Added `.piano-wrapper-full` responsive CSS rules in `src/styles/piano.css`: keys dynamically scale from a fixed 200px to `calc(100% - 14px)` (~340px on flagship phones, ~700px on Android tablets).
  - Eliminated the bottom black dead space void in Piano-Only mode, providing concert grand scale key proportions.
- **Dynamic 3D Waterfall Camera Horizon**:
  - Differentiated camera position and lookAt target when in 3D Waterfall Only vs Dual View (`targetCamY = 14.5`, `targetCamZ = 21.5`, looking at `1.0, -6`).
  - Initialized camera coordinates conditionally on component mount to eliminate slow drift interpolation on startup.
- **Safe HUD & Chord Badge Offsets**:
  - Cleaned `@keyframes floatBadge` to only animate `translateY` and `scale`, preventing CSS transform conflicts.
  - Relocated Floating Chord Badge to `top: isZenMode ? '16px' : '64px'; left: max(16px, env(safe-area-inset-left))`, preventing collisions with the PIANOTES logo and header navigation.
  - Repositioned `Reset 3D` pill to `top: isZenMode ? '12px' : '64px'; right: max(16px, env(safe-area-inset-right))` below top-right header controls.
- **Header & Main Viewport Flow**:
  - Added dynamic padding `pt-[54px]` on `<main>` when `!isZenMode` and `pt-0` during Zen Mode, preventing the Octave ribbon and red felt strip from being obscured under the absolute header.
- **Summary Modal Practice Encouragement**:
  - If `score.score === 0`, switches modal title from "Virtuoso Performance" to "Practice Review", rank badge to "Practice Run (Ready to Play)", and avoids false celebration.
- **Quality Assurance**:
  - Expanded unit test suite to 57 passing tests (`npm test`).
  - Zero lint errors and zero warnings (`npm run lint`).
  - Clean production build and Capacitor sync.

---

## [2.2.0] - 2026-10-07

### 🎹 Audio Engine Hardening, Pre-Roll Count-In & Acoustic Polish
- **Polyphonic Voice Stealing & Audio Thread Protection**:
  - Implemented dynamic polyphonic voice stealing in `PianoEngine.ts` capping concurrent voices to 32 (`MAX_VOICES = 32`).
  - Prioritizes stealing older sustained notes (keys released, held by sustain pedal) before stealing actively held voices.
  - Applies a smooth 50ms exponential release fade (`0.05s`) on stolen voices to eliminate audio thread overload, crackling, pops, and DSP graph degradation on Android devices during complex arpeggios.
  - Added voice engine inspector methods (`getActiveVoiceCount()`, `getMaxVoices()`, `getActivePitches()`) and optional `fadeDuration` support across all 9 synthesizer engines.
- **Vertical Touch Velocity Sensitivity on 2D Keys**:
  - Pure calculation utility `calculateKeyTouchVelocity(clientY, top, height)` in `src/utils/touchVelocity.ts`.
  - Linear velocity interpolation from `0.45` (pianissimo/piano at black key root) to `0.90` (forte at front lip of the white keys).
  - Integrated across pointer down, pointer move (glissando), and pointer enter events in `PlayablePiano2D.tsx`, passing realistic velocity to both synthesizer audio and MIDI performance recording.
- **Pre-Roll Count-In Engine & Interactive HUD Overlay**:
  - Created standalone singleton `CountInEngine.ts` providing metronome-synced count-in (1, 2, 3, 4) with accented audio clicks on beat 1.
  - Interactive Pre-Roll Count-In toggle switch in both the bottom `PracticeBar.tsx` transport bar and `StudioDrawer.tsx` Metronome tab.
  - High-visibility Liquid Glass Count-In visual HUD overlay with pulsing beat digits, progress dot indicators, and automatic countdown before piece playback begins or A-B loops restart.
- **Microphone Acoustic Pitch Detection & Overtone Suppression**:
  - Added acoustic lowpass filter (2400Hz) in `MicrophoneListener.ts` to suppress string hammer transient clicks.
  - Implemented harmonic overtone suppression (`suppressOvertones`) inspecting 2x and 3x candidate periods against a 72% correlation threshold, resolving false 2nd and 3rd harmonic octave-up errors down to true piano fundamentals.
  - Added real-time floating Acoustic Pitch Feedback HUD badge (`"Heard: C4 / 261.6 Hz"`) during microphone practice mode with auto-fade and audio level visualizer.
- **Canvas Gestures & Android Cutout Insets**:
  - Double-tap gesture on 3D Waterfall canvas (<320ms, <25px displacement) with medium haptic feedback to toggle Immersive Zen Mode instantly.
  - Applied camera punch-hole notch safe-area insets (`env(safe-area-inset-left)` and `env(safe-area-inset-right)`) across header navigation bar, 2D piano wrapper (`.piano-wrapper`), right-flyout sheets (`.liquid-sheet`), and bottom practice transport bar.
- **Comprehensive Test Coverage & Quality Assurance**:
  - Expanded test suite to 53 comprehensive unit tests (`npm test` 100% passing) covering touch velocity mapping, count-in beat scheduling, cancellation, voice stealing priority, and overtone suppression.
  - Maintained zero lint errors and zero warnings (`npm run lint` with Oxlint).

---

## [2.1.0] - 2026-10-07

### 💎 Hardcore Design Critique Remediation & Visual Spatial Polish
- **P0 Usability & Ergonomics Fixes**:
  - **Multi-Touch Polyphony Pointer Map**: Replaced the single `isPointerDown` flag with an isolated pointer tracking map (`Map<number, number>`) in `PlayablePiano2D.tsx`. Releasing one finger now only releases that finger's note so triads, multi-finger chords, and legato play cleanly.
  - **White Key Strike Clearance**: In `PracticeBar.tsx`, auto-retracts to an ultra-sleek compact transport pill on mobile landscape, with `pointer-events: none` on transparent container areas restoring 100% thumb clearance on the white key lips.
  - **Dual View Proportions & Decapitation Fix**: Fixed keyboard cropping in `App.tsx` by allocating responsive flex proportions (`min-h-[210px]`) for the 2D piano, preserving Octave Switcher (C1-C7), sustain button, and black key bevels.
  - **0-Note Scoring Logic Fix**: Updated `scoringSystem.ts` to return `0%` accuracy and `0` stars when `total === 0` (or `score === 0`). Guarded confetti bursts so 0 notes never trigger celebration.
  - **Virtuoso Summary Modal 2-Column Layout**: Enhanced `VirtuosoSummaryModal.tsx` with a responsive 2-column landscape grid and `max-h-[92vh] overflow-y-auto` so action buttons (Replay, Library, Export MIDI) are permanently accessible on landscape phones.
- **P1 Visual Hierarchy & Spatial Cohesion**:
  - **HUD Collision & Transform Fix**: Updated `@keyframes floatBadge` in `liquid-glass.css` to preserve `translate(-50%, -50%)`, and relocated the Floating Chord Badge in `Waterfall3D.tsx` to the top-left margin to eliminate collisions with the Strike HUD and falling notes.
  - **Frozen Camera Sway in Dual View**: Added `isDualView` camera lock in `Waterfall3D.tsx` pinning camera X position to `0` in Dual View, keeping falling 3D note bars permanently aligned with 2D piano keys below.
  - **Zen Mode Header Fix**: Positioned `<header>` as `absolute top-0 left-0 right-0 z-40` in `App.tsx`, eliminating phantom purple gutters when header collapses in Zen Mode.
  - **Right-Flyout Studio & Ingestion Panels**: Converted bottom sheets on widescreen landscape into right-side flyout panels (`fixed right-0 top-0 bottom-0 w-[420px] max-w-[90vw]`) without blocking overlays, allowing live piano auditioning while tweaking sounds.
- **P2 Apple Liquid Glass Material Polish**:
  - Refined `.liquid-glass::before` rim highlight to Apple's luxury monochromatic specular gradient (`linear-gradient(135deg, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0.05) 50%, rgba(255,255,255,0.2) 100%)`).
  - Removed unused SVG filter definitions (`#apple-chromatic-prism` and `#apple-liquid-disp`).
  - Replaced `--gel-bounce` with a damped physical spring (`cubic-bezier(0.16, 1, 0.3, 1)`).
  - Expanded touch targets: Octave switcher pills to min 36px, primary practice controls to 40-44px.
- **Dev Server Process Cleanup**: Terminated redundant background Vite server instances; ensured single clean dev server on port 5173.

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
