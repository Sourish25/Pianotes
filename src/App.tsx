import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { SongData, HandType, InstrumentType, ViewportMode } from './types';
import { SAMPLE_SONGS } from './data/songs';
import { pianoEngine } from './audio/PianoEngine';
import { micListener } from './audio/MicrophoneListener';
import { LiquidGlassSVGDefs, LiquidGlassButton } from './components/LiquidGlass';
import { Waterfall3D } from './components/Waterfall3D';
import { PlayablePiano2D } from './components/PlayablePiano2D';
import { PracticeBar } from './components/PracticeBar';
import { IngestionDrawer } from './components/IngestionDrawer';
import { InstrumentSelector } from './components/InstrumentSelector';
import {
  Sparkles,
  Music,
  ChevronDown,
  Info,
} from 'lucide-react';

export const App: React.FC = () => {
  // Application State
  const [currentSong, setCurrentSong] = useState<SongData>(SAMPLE_SONGS[0]);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [tempo, setTempo] = useState<number>(1.0);
  const [activeHand, setActiveHand] = useState<HandType>('both');
  const [instrument, setInstrument] = useState<InstrumentType>('concert-grand');
  const [viewportMode, setViewportMode] = useState<ViewportMode>('dual');
  const [sustainPedal, setSustainPedal] = useState<boolean>(false);

  // Practice Modes
  const [waitForMe, setWaitForMe] = useState<boolean>(false);
  const [loopA, setLoopA] = useState<number | null>(null);
  const [loopB, setLoopB] = useState<number | null>(null);

  // Microphone Listener State
  const [isMicActive, setIsMicActive] = useState<boolean>(false);
  const [micLevel, setMicLevel] = useState<number>(0);

  // Drawers
  const [isIngestionOpen, setIsIngestionOpen] = useState<boolean>(false);
  const [isInstrumentOpen, setIsInstrumentOpen] = useState<boolean>(false);
  const [showInfoModal, setShowInfoModal] = useState<boolean>(false);

  // Active Keys tracking (currently ringing notes)
  const [activeMidiKeys, setActiveMidiKeys] = useState<number[]>([]);
  const userPlayedKeysRef = useRef<Set<number>>(new Set());

  // Animation frame ref for high-precision audio/waterfall clock
  const animFrameRef = useRef<number | null>(null);
  const lastTimestampRef = useRef<number | null>(null);
  const playedNoteIdsRef = useRef<Set<string>>(new Set());

  // Toggle Sustain Pedal
  const handleToggleSustain = useCallback(() => {
    setSustainPedal((prev) => {
      const next = !prev;
      pianoEngine.setSustainPedal(next);
      return next;
    });
  }, []);

  // Handle Note Trigger by User (from on-screen keyboard or mic)
  const handleUserPlayKey = useCallback((midi: number) => {
    userPlayedKeysRef.current.add(midi);
    setActiveMidiKeys((prev) => Array.from(new Set([...prev, midi])));

    // Remove from user played list after brief release
    setTimeout(() => {
      userPlayedKeysRef.current.delete(midi);
    }, 450);
  }, []);

  // Toggle Microphone Pitch Detection
  const handleToggleMic = async () => {
    if (isMicActive) {
      micListener.stop();
      setIsMicActive(false);
      setMicLevel(0);
    } else {
      const started = await micListener.start(
        (midi) => {
          handleUserPlayKey(midi);
        },
        (level) => {
          setMicLevel(level);
        }
      );
      if (started) {
        setIsMicActive(true);
      }
    }
  };

  // Main Playback Clock Loop
  useEffect(() => {
    if (!isPlaying) {
      lastTimestampRef.current = null;
      return;
    }

    const loop = (timestamp: number) => {
      if (lastTimestampRef.current === null) {
        lastTimestampRef.current = timestamp;
      }
      const deltaSec = (timestamp - lastTimestampRef.current) / 1000;
      lastTimestampRef.current = timestamp;

      setCurrentTime((prevTime) => {
        let nextTime = prevTime + deltaSec * tempo;

        // Check A-B Loop boundaries
        if (loopA !== null && loopB !== null && loopB > loopA) {
          if (nextTime >= loopB) {
            nextTime = loopA;
            playedNoteIdsRef.current.clear();
          }
        } else if (nextTime >= currentSong.duration) {
          setIsPlaying(false);
          return currentSong.duration;
        }

        // Wait-for-Me Mode Check:
        // If there are notes reaching the strike line that haven't been pressed by the user, pause clock!
        if (waitForMe) {
          const currentStrikingNotes = currentSong.notes.filter(
            (n) =>
              (activeHand === 'both' || n.hand === activeHand) &&
              n.startTime <= nextTime &&
              n.startTime >= nextTime - 0.15
          );

          if (currentStrikingNotes.length > 0) {
            const hasUnplayed = currentStrikingNotes.some(
              (n) => !userPlayedKeysRef.current.has(n.pitch)
            );
            if (hasUnplayed) {
              // Pause right here waiting for user!
              return prevTime;
            }
          }
        }

        // Play newly struck notes
        const currentlyActivePitches: number[] = [];
        currentSong.notes.forEach((note) => {
          if (activeHand !== 'both' && note.hand !== activeHand) return;

          // Note has struck the line
          if (note.startTime <= nextTime && note.startTime + note.duration >= nextTime) {
            currentlyActivePitches.push(note.pitch);

            if (!playedNoteIdsRef.current.has(note.id)) {
              playedNoteIdsRef.current.add(note.id);
              // Synthesize piano audio
              pianoEngine.playNote(note.pitch, note.velocity);
            }
          }

          // Note has ended
          if (nextTime > note.startTime + note.duration && playedNoteIdsRef.current.has(note.id)) {
            // Note release handled by engine's natural decay and stopNote
            pianoEngine.stopNote(note.pitch);
          }
        });

        // Merge user pressed keys
        userPlayedKeysRef.current.forEach((p) => currentlyActivePitches.push(p));
        setActiveMidiKeys(Array.from(new Set(currentlyActivePitches)));

        return nextTime;
      });

      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [isPlaying, tempo, waitForMe, activeHand, currentSong, loopA, loopB]);

  // Restart Song
  const handleRestart = () => {
    setCurrentTime(0);
    playedNoteIdsRef.current.clear();
    setActiveMidiKeys([]);
  };

  // Seek Timeline
  const handleSeek = (seconds: number) => {
    setCurrentTime(seconds);
    playedNoteIdsRef.current.clear();
  };

  // Switch Song
  const handleSelectSong = (song: SongData) => {
    setCurrentSong(song);
    handleRestart();
  };

  // Computer Keyboard Piano Support (ASDFGHJKL...)
  useEffect(() => {
    const KEY_MAP: Record<string, number> = {
      KeyA: 60, // C4
      KeyW: 61, // C#4
      KeyS: 62, // D4
      KeyE: 63, // D#4
      KeyD: 64, // E4
      KeyF: 65, // F4
      KeyT: 66, // F#4
      KeyG: 67, // G4
      KeyY: 68, // G#4
      KeyH: 69, // A4
      KeyU: 70, // A#4
      KeyJ: 71, // B4
      KeyK: 72, // C5
      KeyO: 73, // C#5
      KeyL: 74, // D5
      KeyP: 75, // D#5
      Semicolon: 76, // E5
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'INPUT') return;
      const midi = KEY_MAP[e.code];
      if (midi && !e.repeat) {
        pianoEngine.playNote(midi, 0.85);
        handleUserPlayKey(midi);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'INPUT') return;
      const midi = KEY_MAP[e.code];
      if (midi) {
        pianoEngine.stopNote(midi);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [handleUserPlayKey]);

  return (
    <div className="relative w-screen h-screen flex flex-col obsidian-backdrop overflow-hidden select-none">
      {/* Optical SVG Definitions for Liquid Glass Dispersion & Gel Spring */}
      <LiquidGlassSVGDefs />

      {/* Top Glass Navigation Bar */}
      <header className="relative w-full z-40 px-6 py-3 flex items-center justify-between border-b border-white/10 bg-[#07080e]/60 backdrop-blur-2xl">
        {/* Brand / Logo */}
        <div className="flex items-center gap-3">
          <div className="relative w-9 h-9 rounded-2xl flex items-center justify-center bg-gradient-to-br from-purple-600 to-amber-500 shadow-[0_0_18px_rgba(168,85,247,0.5)] border border-white/30">
            <Music className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-extrabold tracking-tight text-white">
                PIANOTES
              </span>
              <span className="px-1.5 py-0.5 rounded-full text-[9px] font-mono font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                PRO DEMO
              </span>
            </div>
            <p className="text-[10px] text-zinc-400 font-medium">
              Apple Liquid Glass 1:1 Engine
            </p>
          </div>
        </div>

        {/* Center: Viewport Switcher Pills */}
        <div className="flex items-center gap-1 p-1 rounded-full bg-white/5 border border-white/10 shadow-inner">
          <button
            onClick={() => setViewportMode('waterfall3d')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
              viewportMode === 'waterfall3d'
                ? 'bg-purple-600/40 text-purple-200 border border-purple-400/40 shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            3D Waterfall
          </button>
          <button
            onClick={() => setViewportMode('dual')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
              viewportMode === 'dual'
                ? 'bg-white/20 text-white border border-white/30 shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Dual View (3D + 2D)
          </button>
          <button
            onClick={() => setViewportMode('piano2d')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
              viewportMode === 'piano2d'
                ? 'bg-amber-500/30 text-amber-200 border border-amber-400/40 shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Playable Piano 2D
          </button>
        </div>

        {/* Right Section: Song Library & Instrument Pills */}
        <div className="flex items-center gap-3">
          {/* Active Song Selector Pill */}
          <LiquidGlassButton
            onClick={() => setIsIngestionOpen(true)}
            className="flex items-center gap-2 !px-3.5 !py-1.5 text-xs text-zinc-200"
          >
            <Music className="w-3.5 h-3.5 text-purple-400" />
            <span className="font-semibold max-w-[140px] truncate">{currentSong.title}</span>
            <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
          </LiquidGlassButton>

          {/* Active Instrument Pill */}
          <LiquidGlassButton
            onClick={() => setIsInstrumentOpen(true)}
            variant="amber"
            className="flex items-center gap-2 !px-3.5 !py-1.5 text-xs font-medium"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span className="capitalize">{instrument.replace('-', ' ')}</span>
            <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
          </LiquidGlassButton>

          {/* Info Modal Trigger */}
          <button
            onClick={() => setShowInfoModal(true)}
            className="p-2 rounded-full text-zinc-400 hover:text-white bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
            title="Aesthetic & Technology Specs"
          >
            <Info className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Viewport Container */}
      <main className="relative flex-1 w-full overflow-hidden flex flex-col">
        {/* Waterfall 3D Viewport */}
        {(viewportMode === 'waterfall3d' || viewportMode === 'dual') && (
          <div
            className={`relative w-full ${
              viewportMode === 'dual' ? 'h-[58%]' : 'h-full'
            } transition-all duration-300`}
          >
            <Waterfall3D
              notes={currentSong.notes}
              currentTime={currentTime}
              isPlaying={isPlaying}
              activeHand={activeHand}
              onKeyTrigger={handleUserPlayKey}
            />
          </div>
        )}

        {/* Playable Piano 2D Viewport */}
        {(viewportMode === 'piano2d' || viewportMode === 'dual') && (
          <div
            className={`relative w-full ${
              viewportMode === 'dual' ? 'h-[42%]' : 'h-full'
            } transition-all duration-300 overflow-hidden flex flex-col justify-end`}
          >
            <PlayablePiano2D
              activeKeys={activeMidiKeys}
              onUserPlayKey={handleUserPlayKey}
              sustainPedal={sustainPedal}
              onToggleSustain={handleToggleSustain}
            />
          </div>
        )}
      </main>

      {/* Floating Bottom Practice & Transport Bar */}
      <PracticeBar
        isPlaying={isPlaying}
        onTogglePlay={() => setIsPlaying(!isPlaying)}
        onRestart={handleRestart}
        onSeek={handleSeek}
        currentTime={currentTime}
        duration={currentSong.duration}
        tempo={tempo}
        onTempoChange={setTempo}
        waitForMe={waitForMe}
        onToggleWaitForMe={() => setWaitForMe(!waitForMe)}
        isMicActive={isMicActive}
        micLevel={micLevel}
        onToggleMic={handleToggleMic}
        activeHand={activeHand}
        onChangeHand={setActiveHand}
        loopA={loopA}
        loopB={loopB}
        onSetLoopA={() => setLoopA(currentTime)}
        onSetLoopB={() => setLoopB(currentTime)}
        onClearLoop={() => {
          setLoopA(null);
          setLoopB(null);
        }}
        onOpenInstruments={() => setIsInstrumentOpen(true)}
        onOpenIngestion={() => setIsIngestionOpen(true)}
      />

      {/* Ingestion & Song Library Drawer */}
      <IngestionDrawer
        isOpen={isIngestionOpen}
        onClose={() => setIsIngestionOpen(false)}
        onSelectSong={handleSelectSong}
        currentSongId={currentSong.id}
      />

      {/* Instrument Sound Profile Switcher Drawer */}
      <InstrumentSelector
        isOpen={isInstrumentOpen}
        onClose={() => setIsInstrumentOpen(false)}
        currentInstrument={instrument}
        onSelectInstrument={setInstrument}
      />

      {/* Architectural & Feature Info Modal */}
      {showInfoModal && (
        <div
          className="liquid-sheet-overlay"
          onClick={() => setShowInfoModal(false)}
        >
          <div
            className="liquid-sheet"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '600px' }}
          >
            <div className="sheet-handle" onClick={() => setShowInfoModal(false)} />
            <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-400" />
              <span>Apple Liquid Glass Piano Architecture</span>
            </h3>
            <p className="text-xs text-zinc-300 leading-relaxed">
              This high-performance web demo delivers the 1:1 Apple Liquid Glass design language and Android piano experience:
            </p>
            <ul className="mt-3 space-y-2 text-xs text-zinc-300">
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400 mt-1.5 shrink-0" />
                <span>
                  <strong>Multi-pass Refraction & Chromatic Aberration:</strong> SVG feDisplacementMap + RGB channel offset matrices generating genuine rainbow prism dispersion along beveled glass borders.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0" />
                <span>
                  <strong>Interactive Gel-Bending Physics:</strong> Buttons and sheets indent and recoil elastically using Hooke's law spring dynamics on pointer tap or drag.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400 mt-1.5 shrink-0" />
                <span>
                  <strong>Specular Sheen & Saturation Boost:</strong> 220% saturation backdrop filter + dynamic incident pointer light angle tracking.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0" />
                <span>
                  <strong>Dual Viewports & 3D Waterfall:</strong> Left hand (Violet) and Right Hand (Amber) separation, 3D key depressions, cosmic strike sparks, active octave focus, and floating chord badges.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400 mt-1.5 shrink-0" />
                <span>
                  <strong>6 Sound Engines:</strong> Concert Grand, Vintage Upright, Neo-Soul Rhodes, DX7 FM, Lo-Fi Tape Piano, Celesta.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0" />
                <span>
                  <strong>Real Acoustic Mic Pitch Detection:</strong> Autocorrelation pitch detector allows playing an actual piano in front of your device!
                </span>
              </li>
            </ul>
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowInfoModal(false)}
                className="px-4 py-1.5 rounded-full text-xs font-semibold bg-white text-black hover:bg-zinc-200 transition-colors"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
