import React, { useState, useEffect } from 'react';
import type { HandType, PerformanceScore } from '../types';
import { triggerHaptic } from '../utils/haptics';
import {
  Play,
  Pause,
  RotateCcw,
  FastForward,
  Rewind,
  Mic,
  MicOff,
  Sparkles,
  Zap,
  Repeat,
  Radio,
  Sliders,
  Maximize2,
  Minimize2,
} from 'lucide-react';

interface PracticeBarProps {
  isPlaying: boolean;
  onTogglePlay: () => void;
  onRestart: () => void;
  onSeek: (seconds: number) => void;
  currentTime: number;
  duration: number;
  tempo: number;
  onTempoChange: (tempo: number) => void;
  waitForMe: boolean;
  onToggleWaitForMe: () => void;
  isMicActive: boolean;
  micLevel: number;
  onToggleMic: () => void;
  activeHand: HandType;
  onChangeHand: (hand: HandType) => void;
  loopA: number | null;
  loopB: number | null;
  onSetLoopA: () => void;
  onSetLoopB: () => void;
  onClearLoop: () => void;
  onOpenInstruments?: () => void;
  onOpenIngestion?: () => void;
  isRecording?: boolean;
  recordingTime?: number;
  onToggleRecord?: () => void;
  onOpenMetronomeStudio?: () => void;
  isMetronomeActive?: boolean;
  performanceScore?: PerformanceScore;
  onOpenVirtuosoSummary?: () => void;
  isZenMode?: boolean;
  onToggleZenMode?: () => void;
}

export const PracticeBar: React.FC<PracticeBarProps> = ({
  isPlaying,
  onTogglePlay,
  onRestart,
  onSeek,
  currentTime,
  duration,
  tempo,
  onTempoChange,
  waitForMe,
  onToggleWaitForMe,
  isMicActive,
  micLevel,
  onToggleMic,
  activeHand,
  onChangeHand,
  loopA,
  loopB,
  onSetLoopA,
  onSetLoopB,
  onClearLoop,
  onOpenInstruments,
  isRecording = false,
  recordingTime = 0,
  onToggleRecord,
  onOpenMetronomeStudio,
  isMetronomeActive = false,
  performanceScore,
  onOpenVirtuosoSummary,
  isZenMode = false,
  onToggleZenMode,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [userInteractedRecently, setUserInteractedRecently] = useState(true);

  // Auto-dim / Zen fade during uninterrupted playback
  useEffect(() => {
    if (!isPlaying) {
      return;
    }

    let timer: ReturnType<typeof setTimeout> | null = null;
    const resetInactivity = () => {
      setUserInteractedRecently(true);
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        setUserInteractedRecently(false);
      }, 3000);
    };

    const timerInit = setTimeout(() => {
      setUserInteractedRecently(false);
    }, 3000);

    const onUserActivity = () => resetInactivity();
    window.addEventListener('pointerdown', onUserActivity);
    window.addEventListener('pointermove', onUserActivity);

    return () => {
      if (timer) clearTimeout(timer);
      clearTimeout(timerInit);
      window.removeEventListener('pointerdown', onUserActivity);
      window.removeEventListener('pointermove', onUserActivity);
    };
  }, [isPlaying]);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  // Cycle hand: both -> left -> right -> both
  const cycleHand = () => {
    triggerHaptic('light');
    if (activeHand === 'both') onChangeHand('left');
    else if (activeHand === 'left') onChangeHand('right');
    else onChangeHand('both');
  };

  // Cycle tempo: 1.0x -> 1.25x -> 0.5x -> 0.75x -> 1.0x
  const cycleTempo = () => {
    triggerHaptic('light');
    const speeds = [0.5, 0.75, 1.0, 1.25];
    const currentIndex = speeds.indexOf(tempo);
    const nextSpeed = speeds[(currentIndex + 1) % speeds.length] || 1.0;
    onTempoChange(nextSpeed);
  };

  // Handle loop point cycle
  const handleLoopCycle = () => {
    triggerHaptic('light');
    if (loopA === null) {
      onSetLoopA();
    } else if (loopB === null) {
      onSetLoopB();
    } else {
      onClearLoop();
    }
  };

  const isDimmed = (isZenMode || (!userInteractedRecently && isPlaying)) && !isHovered;

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`fixed bottom-2 left-1/2 -translate-x-1/2 z-40 w-[96%] max-w-4xl transition-all duration-500 select-none ${
        isDimmed ? 'opacity-25 hover:opacity-100 translate-y-1' : 'opacity-100 translate-y-0'
      }`}
      style={{
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      <div className="relative rounded-2xl bg-[#090b14]/85 backdrop-blur-3xl border border-white/15 shadow-[0_16px_40px_rgba(0,0,0,0.8),inset_0_1px_1px_rgba(255,255,255,0.4)] overflow-hidden">
        {/* Continuous Integrated High-Precision Scrubber */}
        <div
          className="relative w-full h-2 bg-white/10 cursor-pointer overflow-hidden group"
          onClick={(e) => {
            triggerHaptic('light');
            const rect = e.currentTarget.getBoundingClientRect();
            const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
            onSeek(ratio * duration);
          }}
        >
          {/* Active Progress Line */}
          <div
            className="h-full bg-gradient-to-r from-purple-500 via-pink-500 to-amber-400 transition-[width] duration-75 ease-linear shadow-[0_0_10px_rgba(168,85,247,0.8)]"
            style={{ width: `${progressPercent}%` }}
          />

          {/* A-B Loop Range Shading */}
          {loopA !== null && loopB !== null && (
            <div
              className="absolute top-0 bottom-0 bg-amber-400/35 border-x-2 border-amber-300 pointer-events-none"
              style={{
                left: `${(loopA / duration) * 100}%`,
                width: `${((loopB - loopA) / duration) * 100}%`,
              }}
            />
          )}
        </div>

        {/* Minimal Control Pill Bar */}
        <div className="px-3.5 py-1.5 flex items-center justify-between gap-2 text-xs">
          {/* Left Group: Restart, Rewind, Time, Hand, Wait-for-Me */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => {
                triggerHaptic('light');
                onRestart();
              }}
              title="Restart"
              className="p-1.5 rounded-full text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => {
                triggerHaptic('light');
                onSeek(Math.max(0, currentTime - 5));
              }}
              title="Rewind 5s"
              className="p-1.5 rounded-full text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <Rewind className="w-3.5 h-3.5" />
            </button>

            {/* Time Indicator */}
            <div className="font-mono text-[11px] text-zinc-400 font-semibold px-1">
              <span className="text-white">{formatTime(currentTime)}</span>
              <span className="text-zinc-600 mx-1">/</span>
              <span>{formatTime(duration)}</span>
            </div>

            {/* Hand Separation Cycle Pill */}
            <button
              onClick={cycleHand}
              title={`Hand: ${activeHand.toUpperCase()} (Tap to switch)`}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border transition-all ${
                activeHand === 'left'
                  ? 'bg-purple-600/30 border-purple-400 text-purple-200 shadow-[0_0_12px_rgba(168,85,247,0.4)]'
                  : activeHand === 'right'
                  ? 'bg-amber-500/30 border-amber-400 text-amber-200 shadow-[0_0_12px_rgba(245,158,11,0.4)]'
                  : 'bg-white/5 border-white/10 text-zinc-300 hover:text-white'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  activeHand === 'left'
                    ? 'bg-purple-400'
                    : activeHand === 'right'
                    ? 'bg-amber-400'
                    : 'bg-white'
                }`}
              />
              <span className="capitalize">{activeHand}</span>
            </button>

            {/* Wait-for-Me Toggle */}
            <button
              onClick={() => {
                triggerHaptic('light');
                onToggleWaitForMe();
              }}
              title="Wait-for-Me Practice Mode"
              className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border transition-all ${
                waitForMe
                  ? 'bg-purple-600/30 border-purple-400 text-purple-200 shadow-[0_0_12px_rgba(168,85,247,0.4)] animate-pulse'
                  : 'bg-white/5 border-white/10 text-zinc-400 hover:text-white'
              }`}
            >
              <Sparkles className="w-3 h-3 text-purple-400" />
              <span className="hidden sm:inline">Wait-for-Me</span>
            </button>
          </div>

          {/* Center Group: Tactile Play / Pause Gem Button */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => {
                triggerHaptic('medium');
                onTogglePlay();
              }}
              className="relative w-10 h-10 rounded-full flex items-center justify-center bg-white text-black hover:bg-zinc-200 active:scale-95 transition-all shadow-[0_0_18px_rgba(255,255,255,0.4),inset_0_1px_2px_rgba(255,255,255,0.9)] cursor-pointer"
            >
              {isPlaying ? (
                <Pause className="w-4 h-4 fill-current text-black" />
              ) : (
                <Play className="w-4 h-4 fill-current text-black ml-0.5" />
              )}
            </button>

            <button
              onClick={() => {
                triggerHaptic('light');
                onSeek(Math.min(duration, currentTime + 5));
              }}
              title="Forward 5s"
              className="p-1.5 rounded-full text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <FastForward className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Right Group: Tempo, Loop, Record, Mic, Score, Studio, Zen */}
          <div className="flex items-center gap-1.5">
            {/* Speed Pill */}
            <button
              onClick={cycleTempo}
              title={`Playback Tempo: ${tempo}x (tap to cycle)`}
              className="px-2 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] font-mono font-bold text-zinc-300 hover:text-white hover:bg-white/10 transition-all"
            >
              {tempo}x
            </button>

            {/* A-B Loop Pill */}
            <button
              onClick={handleLoopCycle}
              title={
                loopA !== null && loopB !== null
                  ? `Loop Active (${formatTime(loopA)} - ${formatTime(loopB)}). Tap to clear.`
                  : loopA !== null
                  ? `Loop Point A set at ${formatTime(loopA)}. Tap to set B.`
                  : 'Tap to set Loop Point A'
              }
              className={`flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-mono font-bold border transition-all ${
                loopA !== null && loopB !== null
                  ? 'bg-amber-500/25 border-amber-400 text-amber-200'
                  : loopA !== null
                  ? 'bg-purple-600/25 border-purple-400 text-purple-200'
                  : 'bg-white/5 border-white/10 text-zinc-400 hover:text-white'
              }`}
            >
              <Repeat className="w-2.5 h-2.5" />
              <span>
                {loopA !== null && loopB !== null
                  ? `${formatTime(loopA)}-${formatTime(loopB)}`
                  : loopA !== null
                  ? 'A...'
                  : 'Loop'}
              </span>
            </button>

            {/* Recording Button */}
            {onToggleRecord && (
              <button
                onClick={() => {
                  triggerHaptic('medium');
                  onToggleRecord();
                }}
                title={isRecording ? 'Stop Recording' : 'Record Performance'}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border transition-all ${
                  isRecording
                    ? 'bg-rose-500/25 border-rose-400 text-rose-200 shadow-[0_0_14px_rgba(244,63,94,0.5)] animate-pulse'
                    : 'bg-white/5 border-white/10 text-zinc-400 hover:text-white hover:bg-white/10'
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    isRecording ? 'bg-rose-400 shadow-[0_0_6px_#f43f5e] animate-ping' : 'bg-rose-500'
                  }`}
                />
                <span>{isRecording ? `REC ${formatTime(recordingTime)}` : 'REC'}</span>
              </button>
            )}

            {/* Acoustic Microphone Pitch Listener */}
            <button
              onClick={() => {
                triggerHaptic('light');
                onToggleMic();
              }}
              title="Acoustic Piano Microphone Listener"
              className={`p-1.5 rounded-full border transition-all ${
                isMicActive
                  ? 'bg-red-500/25 border-red-500/60 text-red-300 shadow-[0_0_12px_rgba(239,68,68,0.4)]'
                  : 'bg-white/5 border-white/10 text-zinc-400 hover:text-white'
              }`}
            >
              {isMicActive ? (
                <div className="relative">
                  <Mic className="w-3.5 h-3.5 text-red-400 animate-pulse" />
                  <span
                    className="absolute -top-1 -right-1 w-1.5 h-1.5 rounded-full bg-red-400 transition-all"
                    style={{ transform: `scale(${Math.max(0.5, micLevel * 2)})` }}
                  />
                </div>
              ) : (
                <MicOff className="w-3.5 h-3.5" />
              )}
            </button>

            {/* Studio FX Drawer Opener */}
            {onOpenInstruments && (
              <button
                onClick={() => {
                  triggerHaptic('light');
                  onOpenInstruments();
                }}
                title="Open Studio & Acoustics FX Engine"
                className="p-1.5 rounded-full bg-white/5 border border-white/10 text-zinc-300 hover:text-white hover:bg-white/10 transition-all"
              >
                <Sliders className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Metronome Studio Button */}
            {onOpenMetronomeStudio && (
              <button
                onClick={() => {
                  triggerHaptic('light');
                  onOpenMetronomeStudio();
                }}
                title="Open Concert Pitch & Metronome Studio"
                className={`p-1.5 rounded-full border transition-all ${
                  isMetronomeActive
                    ? 'bg-purple-600/30 border-purple-400 text-purple-200 shadow-[0_0_8px_rgba(168,85,247,0.4)]'
                    : 'bg-white/5 border-white/10 text-zinc-400 hover:text-white'
                }`}
              >
                <Radio className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Live Performance Scoring Badge */}
            {performanceScore && (performanceScore.totalNotes > 0 || performanceScore.score > 0) && (
              <button
                onClick={() => {
                  triggerHaptic('light');
                  onOpenVirtuosoSummary?.();
                }}
                title="View Virtuoso Score Summary"
                className={`hidden md:flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono border transition-all ${
                  performanceScore.multiplier >= 8
                    ? 'bg-pink-500/20 border-pink-400 text-pink-200 animate-pulse'
                    : performanceScore.multiplier >= 4
                    ? 'bg-amber-500/20 border-amber-400 text-amber-200'
                    : 'bg-white/5 border-white/10 text-zinc-300'
                }`}
              >
                <Zap className="w-2.5 h-2.5 text-amber-400" />
                <span>{performanceScore.streak}x</span>
                <span className="text-zinc-600">|</span>
                <span className="font-bold text-amber-300">{performanceScore.score}</span>
              </button>
            )}

            {/* Zen Mode Toggle */}
            {onToggleZenMode && (
              <button
                onClick={() => {
                  triggerHaptic('light');
                  onToggleZenMode();
                }}
                title={isZenMode ? 'Exit Zen Mode' : 'Enter 100% Immersive Zen Mode'}
                className={`p-1.5 rounded-full border transition-all ${
                  isZenMode
                    ? 'bg-purple-600/30 border-purple-400 text-purple-200'
                    : 'bg-white/5 border-white/10 text-zinc-400 hover:text-white'
                }`}
              >
                {isZenMode ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
