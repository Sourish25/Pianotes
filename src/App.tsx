import React, { useState, useEffect, useRef, useCallback } from 'react';
import type {
  SongData,
  HandType,
  InstrumentType,
  ViewportMode,
  PerformanceScore,
  StrikeFeedback,
  RecordingSession,
  NoteEvent,
} from './types';
import { SAMPLE_SONGS } from './data/songs';
import { pianoEngine } from './audio/PianoEngine';
import { metronomeEngine } from './audio/MetronomeEngine';
import { micListener } from './audio/MicrophoneListener';
import { webMidiManager } from './audio/WebMidiManager';
import { ScoreKeeper } from './utils/scoringSystem';
import { downloadMidiFile } from './utils/midiWriter';
import { LiquidGlassSVGDefs, LiquidGlassButton } from './components/LiquidGlass';
import { Waterfall3D } from './components/Waterfall3D';
import { PlayablePiano2D } from './components/PlayablePiano2D';
import { PracticeBar } from './components/PracticeBar';
import { IngestionDrawer } from './components/IngestionDrawer';
import { InstrumentSelector } from './components/InstrumentSelector';
import { MetronomeStudio } from './components/MetronomeStudio';
import { VirtuosoSummaryModal } from './components/VirtuosoSummaryModal';
import {
  Sparkles,
  Music,
  ChevronDown,
  Info,
  Disc,
  Radio,
  Play,
  UploadCloud,
  X,
} from 'lucide-react';

export const App: React.FC = () => {
  // Application State
  const [currentSong, setCurrentSong] = useState<SongData>(SAMPLE_SONGS[0]);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const isPlayingRef = useRef<boolean>(false);
  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

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

  // Metronome Active State
  const [isMetronomeActive, setIsMetronomeActive] = useState<boolean>(() => metronomeEngine.getIsRunning());
  useEffect(() => {
    const iv = setInterval(() => {
      setIsMetronomeActive(metronomeEngine.getIsRunning());
    }, 300);
    return () => clearInterval(iv);
  }, []);

  // Drawers & Modals
  const [isIngestionOpen, setIsIngestionOpen] = useState<boolean>(false);
  const [isInstrumentOpen, setIsInstrumentOpen] = useState<boolean>(false);
  const [showInfoModal, setShowInfoModal] = useState<boolean>(false);
  const [showMetronomeStudio, setShowMetronomeStudio] = useState<boolean>(false);
  const [showVirtuosoSummary, setShowVirtuosoSummary] = useState<boolean>(false);

  // Performance Scoring & Gamification
  const scoreKeeperRef = useRef<ScoreKeeper>(new ScoreKeeper(SAMPLE_SONGS[0].notes.length));
  const [performanceScore, setPerformanceScore] = useState<PerformanceScore>({
    score: 0,
    streak: 0,
    maxStreak: 0,
    multiplier: 1,
    perfectCount: 0,
    greatCount: 0,
    earlyCount: 0,
    lateCount: 0,
    missCount: 0,
    totalNotes: SAMPLE_SONGS[0].notes.length,
    accuracy: 100,
  });
  const [latestStrike, setLatestStrike] = useState<StrikeFeedback | null>(null);
  const scoredNoteIdsRef = useRef<Set<string>>(new Set());

  // Performance Recorder State
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordingTime, setRecordingTime] = useState<number>(0);
  const [recordedSession, setRecordedSession] = useState<RecordingSession | null>(null);
  const [showRecordModal, setShowRecordModal] = useState<boolean>(false);
  const recordingStartTimeRef = useRef<number | null>(null);
  const recordedNotesRef = useRef<NoteEvent[]>([]);
  const activeRecordedPitchesRef = useRef<Map<number, { pitch: number; velocity: number; startTime: number }>>(
    new Map()
  );

  // Active Keys tracking (currently ringing notes with hand separation)
  interface ActiveNoteInfo {
    pitch: number;
    hand: 'left' | 'right' | 'user';
  }
  const [activeNotes, setActiveNotes] = useState<ActiveNoteInfo[]>([]);
  const [userPlayedPitches, setUserPlayedPitches] = useState<number[]>([]);
  const [waitingForPitch, setWaitingForPitch] = useState<{ pitch: number; hand: 'left' | 'right'; name: string } | null>(null);
  const [connectedMidiDevice, setConnectedMidiDevice] = useState<string | null>(null);

  const userPlayedKeysRef = useRef<Set<number>>(new Set());
  const satisfiedNoteIdsRef = useRef<Set<string>>(new Set());

  // Animation frame ref for high-precision audio/waterfall clock
  const animFrameRef = useRef<number | null>(null);
  const lastTimestampRef = useRef<number | null>(null);
  const playedNoteIdsRef = useRef<Set<string>>(new Set());
  const stoppedNoteIdsRef = useRef<Set<string>>(new Set());

  // Recording Timer Effect
  useEffect(() => {
    if (!isRecording) return;
    const interval = setInterval(() => {
      if (recordingStartTimeRef.current !== null) {
        const elapsed = (performance.now() - recordingStartTimeRef.current) / 1000;
        setRecordingTime(elapsed);
      }
    }, 100);
    return () => {
      clearInterval(interval);
    };
  }, [isRecording]);

  // Fade out latest strike feedback badge
  useEffect(() => {
    if (latestStrike) {
      const timer = setTimeout(() => {
        setLatestStrike((prev) => (prev?.id === latestStrike.id ? null : prev));
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, [latestStrike]);

  // Stop all active synthesizer voices cleanly
  const stopAudioNotes = useCallback(() => {
    for (let m = 21; m <= 108; m++) {
      pianoEngine.stopNote(m);
    }
    playedNoteIdsRef.current.clear();
    stoppedNoteIdsRef.current.clear();
  }, []);

  const stopAllVoices = useCallback(() => {
    stopAudioNotes();
    setActiveNotes([]);
    setWaitingForPitch(null);
  }, [stopAudioNotes]);

  // Toggle Sustain Pedal
  const handleToggleSustain = useCallback(() => {
    setSustainPedal((prev) => {
      const next = !prev;
      pianoEngine.setSustainPedal(next);
      return next;
    });
  }, []);

  // Handle Note Release by User
  const handleUserReleaseKey = useCallback((midi: number) => {
    userPlayedKeysRef.current.delete(midi);
    setUserPlayedPitches(Array.from(userPlayedKeysRef.current));
    setActiveNotes((prev) => prev.filter((n) => n.pitch !== midi || n.hand !== 'user'));
    pianoEngine.stopNote(midi);

    // Finalize note in recorder if active
    if (recordingStartTimeRef.current !== null && activeRecordedPitchesRef.current.has(midi)) {
      const item = activeRecordedPitchesRef.current.get(midi)!;
      const noteEndSec = (performance.now() - recordingStartTimeRef.current) / 1000;
      const noteDur = Math.max(0.08, noteEndSec - item.startTime);
      recordedNotesRef.current.push({
        id: `rec-${recordedNotesRef.current.length + 1}`,
        pitch: item.pitch,
        startTime: item.startTime,
        duration: noteDur,
        hand: item.pitch < 60 ? 'left' : 'right',
        velocity: item.velocity,
      });
      activeRecordedPitchesRef.current.delete(midi);
    }
  }, []);

  // Handle Note Trigger by User (from on-screen keyboard, computer keyboard, mic, or MIDI)
  const handleUserPlayKey = useCallback(
    (midi: number, fromMic: boolean = false, velocity: number = 0.85) => {
      userPlayedKeysRef.current.add(midi);
      setUserPlayedPitches(Array.from(userPlayedKeysRef.current));

      setActiveNotes((prev) => {
        const filtered = prev.filter((n) => n.pitch !== midi);
        return [...filtered, { pitch: midi, hand: 'user' }];
      });

      // Capture note in recorder if active
      if (recordingStartTimeRef.current !== null) {
        const noteStartSec = (performance.now() - recordingStartTimeRef.current) / 1000;
        // If the same key is already being recorded without release, finalize previous note first
        if (activeRecordedPitchesRef.current.has(midi)) {
          const prev = activeRecordedPitchesRef.current.get(midi)!;
          const prevDur = Math.max(0.08, noteStartSec - prev.startTime);
          recordedNotesRef.current.push({
            id: `rec-${recordedNotesRef.current.length + 1}`,
            pitch: prev.pitch,
            startTime: prev.startTime,
            duration: prevDur,
            hand: prev.pitch < 60 ? 'left' : 'right',
            velocity: prev.velocity,
          });
        }
        activeRecordedPitchesRef.current.set(midi, {
          pitch: midi,
          velocity,
          startTime: noteStartSec,
        });
      }

      // Real-time Strike Evaluation against active piece (only when piece is actively playing)
      if (isPlayingRef.current) {
        const unscoredMatches = currentSong.notes.filter(
          (n) =>
            n.pitch === midi &&
            !scoredNoteIdsRef.current.has(n.id) &&
            Math.abs(n.startTime - currentTime) <= 0.25
        );

        if (unscoredMatches.length > 0) {
          unscoredMatches.sort(
            (a, b) => Math.abs(a.startTime - currentTime) - Math.abs(b.startTime - currentTime)
          );
          const hitNote = unscoredMatches[0];
          const offsetMs = (currentTime - hitNote.startTime) * 1000;
          const feedback = scoreKeeperRef.current.registerHit(midi, offsetMs);
          scoredNoteIdsRef.current.add(hitNote.id);
          setPerformanceScore(scoreKeeperRef.current.getState());
          setLatestStrike(feedback);
        }
      }

      // Mark any matching upcoming or current notes as satisfied for Wait-for-Me mode
      currentSong.notes.forEach((note) => {
        if (note.pitch === midi && Math.abs(note.startTime - currentTime) <= 1.0) {
          satisfiedNoteIdsRef.current.add(note.id);
        }
      });

      setWaitingForPitch((cur) => (cur && cur.pitch === midi ? null : cur));

      // For microphone detection, auto-release after short acoustic decay (260ms)
      if (fromMic) {
        setTimeout(() => {
          handleUserReleaseKey(midi);
        }, 260);
      }
    },
    [currentTime, currentSong, handleUserReleaseKey]
  );

  // Toggle Live Performance Recording
  const handleToggleRecord = useCallback(() => {
    if (isRecording) {
      // Stop recording
      setIsRecording(false);
      const endTime = performance.now();
      const startTime = recordingStartTimeRef.current || endTime;
      const totalDuration = Math.max(1, (endTime - startTime) / 1000);

      // Finalize any currently held notes
      activeRecordedPitchesRef.current.forEach((val) => {
        const dur = Math.max(0.1, totalDuration - val.startTime);
        recordedNotesRef.current.push({
          id: `rec-${recordedNotesRef.current.length + 1}`,
          pitch: val.pitch,
          startTime: val.startTime,
          duration: dur,
          hand: val.pitch < 60 ? 'left' : 'right',
          velocity: val.velocity,
        });
      });
      activeRecordedPitchesRef.current.clear();

      // Chronologically order recorded notes for perfect 3D waterfall playback and MIDI export
      recordedNotesRef.current.sort((a, b) => a.startTime - b.startTime || a.pitch - b.pitch);

      if (recordedNotesRef.current.length > 0) {
        const session: RecordingSession = {
          id: `rec-${Date.now()}`,
          title: `Performance Take ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`,
          createdAt: Date.now(),
          notes: [...recordedNotesRef.current],
          duration: totalDuration,
          bpm: currentSong.bpm || 120,
        };
        setRecordedSession(session);
        setShowRecordModal(true);
      }
    } else {
      // Start recording
      recordedNotesRef.current = [];
      activeRecordedPitchesRef.current.clear();
      recordingStartTimeRef.current = performance.now();
      setRecordingTime(0);
      setIsRecording(true);
    }
  }, [isRecording, currentSong.bpm]);

  // Toggle Microphone Pitch Detection
  const handleToggleMic = async () => {
    if (isMicActive) {
      micListener.stop();
      setIsMicActive(false);
      setMicLevel(0);
    } else {
      const started = await micListener.start(
        (midi) => {
          pianoEngine.playNote(midi, 0.8);
          handleUserPlayKey(midi, true);
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

  // Connect Web MIDI API for USB / Bluetooth Keyboards
  useEffect(() => {
    webMidiManager.init(
      (pitch, velocity) => {
        pianoEngine.playNote(pitch, velocity);
        handleUserPlayKey(pitch, false, velocity);
      },
      (pitch) => {
        handleUserReleaseKey(pitch);
      },
      (isDown) => {
        setSustainPedal(isDown);
        pianoEngine.setSustainPedal(isDown);
      },
      (device) => {
        setConnectedMidiDevice(device);
      }
    );
  }, [handleUserPlayKey, handleUserReleaseKey]);

  // Main Playback Clock Loop
  useEffect(() => {
    if (!isPlaying) {
      lastTimestampRef.current = null;
      stopAudioNotes();
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
            stopAudioNotes();
          }
        } else if (nextTime >= currentSong.duration) {
          setIsPlaying(false);
          stopAudioNotes();
          // Finalize all remaining un-scored notes as MISS so final accuracy covers the full piece
          if (!waitForMe) {
            currentSong.notes.forEach((n) => {
              if (activeHand !== 'both' && n.hand !== activeHand) return;
              if (!scoredNoteIdsRef.current.has(n.id)) {
                scoredNoteIdsRef.current.add(n.id);
                scoreKeeperRef.current.registerMiss(n.pitch);
              }
            });
            setPerformanceScore(scoreKeeperRef.current.getState());
          }
          setShowVirtuosoSummary(true);
          return currentSong.duration;
        }

        // Wait-for-Me Mode Check:
        if (waitForMe) {
          const eligibleNotes = currentSong.notes.filter(
            (n) =>
              (activeHand === 'both' || n.hand === activeHand) &&
              n.startTime <= nextTime &&
              !satisfiedNoteIdsRef.current.has(n.id)
          );

          eligibleNotes.forEach((n) => {
            if (userPlayedKeysRef.current.has(n.pitch)) {
              satisfiedNoteIdsRef.current.add(n.id);
            }
          });

          const remainingUnsatisfied = eligibleNotes.filter(
            (n) => !satisfiedNoteIdsRef.current.has(n.id)
          );

          if (remainingUnsatisfied.length > 0) {
            remainingUnsatisfied.sort((a, b) => a.startTime - b.startTime);
            const unplayed = remainingUnsatisfied[0];
            const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
            const name = `${noteNames[unplayed.pitch % 12]}${Math.floor(unplayed.pitch / 12) - 1}`;
            setWaitingForPitch({
              pitch: unplayed.pitch,
              hand: unplayed.hand,
              name,
            });
            return Math.min(prevTime, unplayed.startTime);
          } else {
            setWaitingForPitch(null);
          }
        } else {
          setWaitingForPitch(null);
        }

        // Missed note check for Performance Scoring
        if (!waitForMe) {
          currentSong.notes.forEach((n) => {
            if (activeHand !== 'both' && n.hand !== activeHand) return;
            if (nextTime > n.startTime + 0.22 && !scoredNoteIdsRef.current.has(n.id)) {
              scoredNoteIdsRef.current.add(n.id);
              const fb = scoreKeeperRef.current.registerMiss(n.pitch);
              setPerformanceScore(scoreKeeperRef.current.getState());
              setLatestStrike(fb);
            }
          });
        }

        // Play newly struck notes and handle note releases
        const curActive: ActiveNoteInfo[] = [];

        currentSong.notes.forEach((note) => {
          if (activeHand !== 'both' && note.hand !== activeHand) return;

          // Note is actively striking the line
          if (note.startTime <= nextTime && note.startTime + note.duration >= nextTime) {
            curActive.push({ pitch: note.pitch, hand: note.hand });

            if (!playedNoteIdsRef.current.has(note.id)) {
              playedNoteIdsRef.current.add(note.id);
              pianoEngine.playNote(note.pitch, note.velocity);
            }
          }

          // Note has ended
          if (
            nextTime > note.startTime + note.duration &&
            playedNoteIdsRef.current.has(note.id) &&
            !stoppedNoteIdsRef.current.has(note.id)
          ) {
            stoppedNoteIdsRef.current.add(note.id);

            const hasOtherActive = currentSong.notes.some(
              (n) =>
                n.id !== note.id &&
                (activeHand === 'both' || n.hand === activeHand) &&
                n.pitch === note.pitch &&
                n.startTime <= nextTime &&
                n.startTime + n.duration >= nextTime
            );

            if (!hasOtherActive) {
              pianoEngine.stopNote(note.pitch);
            }
          }
        });

        // Merge user pressed keys
        userPlayedKeysRef.current.forEach((pitch) => {
          if (!curActive.some((a) => a.pitch === pitch)) {
            curActive.push({ pitch, hand: 'user' });
          }
        });

        setActiveNotes(curActive);
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
  }, [isPlaying, tempo, waitForMe, activeHand, currentSong, loopA, loopB, stopAudioNotes]);

  // Restart Song
  const handleRestart = useCallback((overrideTotalNotes?: number) => {
    setCurrentTime(0);
    satisfiedNoteIdsRef.current.clear();
    scoredNoteIdsRef.current.clear();
    const count = overrideTotalNotes ?? currentSong.notes.length;
    scoreKeeperRef.current.reset(count);
    setPerformanceScore(scoreKeeperRef.current.getState());
    setLatestStrike(null);
    stopAllVoices();
  }, [currentSong.notes.length, stopAllVoices]);

  // Seek Timeline
  const handleSeek = (seconds: number) => {
    setCurrentTime(seconds);
    stopAllVoices();
    satisfiedNoteIdsRef.current.clear();
    scoredNoteIdsRef.current.clear();
    currentSong.notes.forEach((n) => {
      if (n.startTime < seconds) {
        satisfiedNoteIdsRef.current.add(n.id);
        scoredNoteIdsRef.current.add(n.id);
      }
    });
  };

  // Switch Song
  const handleSelectSong = (song: SongData) => {
    setCurrentSong(song);
    handleRestart(song.notes.length);
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
        handleUserReleaseKey(midi);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [handleUserPlayKey, handleUserReleaseKey]);

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
          {/* Connected Web MIDI device badge */}
          {connectedMidiDevice && (
            <div className="hidden lg:flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs font-mono shadow-[0_0_12px_rgba(16,185,129,0.3)]">
              <Disc className="w-3.5 h-3.5 text-emerald-400 animate-spin" />
              <span>MIDI: {connectedMidiDevice}</span>
            </div>
          )}

          {/* Metronome Studio Button */}
          <button
            onClick={() => setShowMetronomeStudio(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-white/5 border border-white/10 text-zinc-300 hover:text-white hover:bg-white/10 transition-all"
            title="Concert Pitch & Metronome Studio"
          >
            <Radio className="w-3.5 h-3.5 text-purple-400" />
            <span className="hidden sm:inline">Pitch & Metronome</span>
          </button>

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
        {/* Real-time Strike Evaluation Floating HUD Banner */}
        {latestStrike && (
          <div
            key={latestStrike.id}
            className="absolute top-16 left-1/2 -translate-x-1/2 z-50 pointer-events-none animate-in fade-in zoom-in-75 duration-150"
          >
            <div
              className={`px-5 py-2 rounded-2xl border shadow-2xl flex flex-col items-center justify-center backdrop-blur-xl ${
                latestStrike.rating === 'PERFECT'
                  ? 'bg-cyan-950/85 border-cyan-400 text-cyan-200 shadow-[0_0_30px_rgba(6,182,212,0.7)]'
                  : latestStrike.rating === 'GREAT'
                  ? 'bg-emerald-950/85 border-emerald-400 text-emerald-200 shadow-[0_0_24px_rgba(16,185,129,0.6)]'
                  : latestStrike.rating === 'EARLY'
                  ? 'bg-amber-950/85 border-amber-400 text-amber-200 shadow-[0_0_20px_rgba(245,158,11,0.5)]'
                  : latestStrike.rating === 'LATE'
                  ? 'bg-orange-950/85 border-orange-400 text-orange-200 shadow-[0_0_20px_rgba(249,115,22,0.5)]'
                  : 'bg-red-950/85 border-red-500 text-red-200 shadow-[0_0_20px_rgba(239,68,68,0.5)]'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-sm font-black tracking-widest uppercase">
                  {latestStrike.rating === 'PERFECT' ? '★ PERFECT ★' : latestStrike.rating}
                </span>
                {latestStrike.points > 0 && (
                  <span className="font-mono text-xs font-bold text-amber-300">
                    +{latestStrike.points}
                  </span>
                )}
              </div>
              {latestStrike.combo >= 2 && (
                <div className="text-[10px] font-extrabold tracking-wider text-white flex items-center gap-1 mt-0.5">
                  <span>COMBO {latestStrike.combo}x</span>
                  {latestStrike.multiplier >= 8 ? (
                    <span className="px-1.5 py-0.5 rounded-full bg-gradient-to-r from-purple-500 via-pink-500 to-amber-400 text-white text-[9px] font-black shadow-[0_0_15px_rgba(236,72,153,0.9)] animate-pulse">
                      ★ 8X COSMIC AURA ★
                    </span>
                  ) : latestStrike.multiplier > 1 ? (
                    <span className="px-1 rounded bg-amber-400 text-black text-[9px] font-black">
                      {latestStrike.multiplier}X MULTIPLIER
                    </span>
                  ) : null}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Wait-for-Me Prompt Pill */}
        {waitingForPitch && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 animate-bounce">
            <div
              className={`flex items-center gap-2.5 px-4 py-2 rounded-full border shadow-2xl backdrop-blur-xl ${
                waitingForPitch.hand === 'left'
                  ? 'bg-purple-950/85 border-purple-400 text-purple-200 shadow-[0_0_24px_rgba(168,85,247,0.6)]'
                  : 'bg-amber-950/85 border-amber-400 text-amber-200 shadow-[0_0_24px_rgba(245,158,11,0.6)]'
              }`}
            >
              <div
                className={`w-3 h-3 rounded-full animate-ping ${
                  waitingForPitch.hand === 'left' ? 'bg-purple-400' : 'bg-amber-400'
                }`}
              />
              <span className="text-xs font-bold tracking-wide">
                WAITING FOR KEY:
              </span>
              <span className="px-2 py-0.5 rounded-md bg-white/20 font-mono font-extrabold text-white text-sm">
                {waitingForPitch.name}
              </span>
              <span className="text-[11px] opacity-80">
                ({waitingForPitch.hand === 'left' ? 'Left Hand Violet' : 'Right Hand Amber'})
              </span>
            </div>
          </div>
        )}

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
              userPlayedKeys={userPlayedPitches}
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
              activeKeys={activeNotes}
              onUserPlayKey={handleUserPlayKey}
              onUserReleaseKey={handleUserReleaseKey}
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
        isRecording={isRecording}
        recordingTime={recordingTime}
        onToggleRecord={handleToggleRecord}
        onOpenMetronomeStudio={() => setShowMetronomeStudio(true)}
        isMetronomeActive={isMetronomeActive}
        performanceScore={performanceScore}
        onOpenVirtuosoSummary={() => setShowVirtuosoSummary(true)}
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

      {/* Concert Pitch & Metronome Studio */}
      {showMetronomeStudio && (
        <MetronomeStudio
          isOpen={showMetronomeStudio}
          onClose={() => setShowMetronomeStudio(false)}
          currentSongBpm={currentSong.bpm}
        />
      )}

      {/* Virtuoso Performance Summary Modal */}
      <VirtuosoSummaryModal
        isOpen={showVirtuosoSummary}
        onClose={() => setShowVirtuosoSummary(false)}
        score={performanceScore}
        songTitle={currentSong.title}
        composer={currentSong.composer}
        onReplay={() => {
          handleRestart();
          setIsPlaying(true);
        }}
        onOpenLibrary={() => setIsIngestionOpen(true)}
        onExportMidi={() => downloadMidiFile(currentSong.notes, currentSong.bpm, currentSong.title)}
      />

      {/* Recorded Take Summary & MIDI Export Modal */}
      {showRecordModal && recordedSession && (
        <div
          className="liquid-sheet-overlay !z-50"
          onClick={() => setShowRecordModal(false)}
        >
          <div
            className="liquid-sheet"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '520px' }}
          >
            <div className="sheet-handle" onClick={() => setShowRecordModal(false)} />
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-rose-500/20 border border-rose-400/40 flex items-center justify-center text-rose-300">
                  <Disc className="w-4 h-4 animate-spin" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white tracking-tight">Performance Recorded</h2>
                  <p className="text-[11px] text-zinc-400">Captured with microsecond timestamp fidelity</p>
                </div>
              </div>
              <button
                onClick={() => setShowRecordModal(false)}
                className="p-1.5 rounded-full text-zinc-400 hover:text-white bg-white/5 border border-white/10 hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-5">
              <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-center">
                <span className="text-[10px] text-zinc-400 uppercase font-semibold block">Notes</span>
                <span className="text-xl font-bold font-mono text-white">{recordedSession.notes.length}</span>
              </div>
              <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-center">
                <span className="text-[10px] text-zinc-400 uppercase font-semibold block">Duration</span>
                <span className="text-xl font-bold font-mono text-purple-300">{Math.round(recordedSession.duration)}s</span>
              </div>
              <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-center">
                <span className="text-[10px] text-zinc-400 uppercase font-semibold block">Tempo</span>
                <span className="text-xl font-bold font-mono text-amber-300">{recordedSession.bpm} BPM</span>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <LiquidGlassButton
                onClick={() => {
                  const recordedSong: SongData = {
                    id: recordedSession.id,
                    title: recordedSession.title,
                    composer: 'Live User Recording',
                    bpm: recordedSession.bpm,
                    duration: recordedSession.duration,
                    keySignature: 'User Session',
                    difficulty: 'Intermediate',
                    category: 'Cinematic',
                    description: `Live recorded piano take with ${recordedSession.notes.length} notes.`,
                    notes: recordedSession.notes,
                  };
                  handleSelectSong(recordedSong);
                  setIsPlaying(true);
                  setShowRecordModal(false);
                }}
                className="w-full flex items-center justify-center gap-2 !py-2.5 text-xs text-white"
              >
                <Play className="w-4 h-4 fill-current ml-0.5" />
                <span>Play in 3D Waterfall & 2D Piano</span>
              </LiquidGlassButton>

              <button
                onClick={() => {
                  downloadMidiFile(recordedSession.notes, recordedSession.bpm, recordedSession.title);
                }}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-purple-600/30 hover:bg-purple-600/40 border border-purple-400/50 text-purple-200 text-xs font-semibold shadow-sm transition-all"
              >
                <UploadCloud className="w-4 h-4 rotate-180" />
                <span>Download Standard MIDI (.mid)</span>
              </button>
            </div>
          </div>
        </div>
      )}

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
              <span>Apple Liquid Glass Piano Architecture (v1.3.0)</span>
            </h3>
            <p className="text-xs text-zinc-300 leading-relaxed">
              This high-performance web demo delivers the 1:1 Apple Liquid Glass design language and Android piano experience:
            </p>
            <ul className="mt-3 space-y-2 text-xs text-zinc-300">
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400 mt-1.5 shrink-0" />
                <span>
                  <strong>Interactive Performance Scoring:</strong> Real-time note strike evaluation (PERFECT ±30ms, GREAT ±70ms, EARLY, LATE, MISS), streak combo multipliers up to 8x with cosmic aura, and Virtuoso Performance Summary modal.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0" />
                <span>
                  <strong>Live Performance Recorder & Standard MIDI Export:</strong> One-tap recording capturing microsecond note timing and velocity, instantaneous playback in 3D/2D views, and direct SMF binary .mid download.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400 mt-1.5 shrink-0" />
                <span>
                  <strong>Concert Pitch & Metronome Studio:</strong> Micro-tuning master selector (A440Hz standard, A432Hz healing, A442Hz orchestral, A415Hz baroque) with acoustic pendulum click generator and time signature accents (4/4, 3/4, 6/8).
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0" />
                <span>
                  <strong>Expanded Repertoire & Search Studio:</strong> Built-in masterpieces across Classical, Cinematic, Neo-Soul, Lo-Fi, and Anime with real-time text query and category filtering.
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
