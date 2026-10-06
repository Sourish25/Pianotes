import React, { useState } from 'react';
import type { HandType, PerformanceScore } from '../types';
import { LiquidGlassCard, LiquidGlassButton } from './LiquidGlass';
import {
  Play,
  Pause,
  RotateCcw,
  FastForward,
  Rewind,
  Mic,
  MicOff,
  Clock,
  Sparkles,
  Radio,
  Zap,
  Trophy,
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
  onOpenInstruments: () => void;
  onOpenIngestion: () => void;
  isRecording?: boolean;
  recordingTime?: number;
  onToggleRecord?: () => void;
  onOpenMetronomeStudio?: () => void;
  isMetronomeActive?: boolean;
  performanceScore?: PerformanceScore;
  onOpenVirtuosoSummary?: () => void;
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
  onOpenInstruments: _onOpenInstruments,
  onOpenIngestion: _onOpenIngestion,
  isRecording = false,
  recordingTime = 0,
  onToggleRecord,
  onOpenMetronomeStudio,
  isMetronomeActive = false,
  performanceScore,
  onOpenVirtuosoSummary,
}) => {
  const [showTempoPopup, setShowTempoPopup] = useState(false);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="relative w-full max-w-5xl mx-auto px-4 pb-4 z-30 select-none">
      <LiquidGlassCard className="p-3.5 md:p-4 backdrop-blur-2xl">
        {/* Top Scrubber & A-B Loop Bar */}
        <div className="relative w-full mb-3">
          {/* Progress Timeline Track */}
          <div
            className="relative w-full h-2.5 rounded-full bg-white/10 cursor-pointer overflow-hidden group"
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
              onSeek(ratio * duration);
            }}
          >
            {/* Active Progress Fill */}
            <div
              className="h-full bg-gradient-to-r from-purple-500 via-purple-400 to-amber-400 transition-[width] duration-75 ease-linear"
              style={{ width: `${progressPercent}%` }}
            />

            {/* A-B Loop Range Highlight */}
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

          {/* Time Display, Scoring HUD & Loop Indicators */}
          <div className="flex items-center justify-between mt-1.5 text-[11px] font-mono text-zinc-400">
            <span>{formatTime(currentTime)}</span>

            <div className="flex items-center gap-2">
              {loopA !== null && (
                <span className="px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 text-[10px]">
                  Loop A: {formatTime(loopA)}
                </span>
              )}
              {loopB !== null && (
                <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px]">
                  Loop B: {formatTime(loopB)}
                </span>
              )}

              {/* Live Scoring HUD */}
              {performanceScore && (performanceScore.totalNotes > 0 || performanceScore.score > 0 || duration > 0) && (
                <button
                  onClick={onOpenVirtuosoSummary}
                  title="View Virtuoso Performance Summary"
                  className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] border transition-all ${
                    performanceScore.multiplier >= 8
                      ? 'bg-gradient-to-r from-purple-600/30 via-pink-600/30 to-amber-500/30 border-pink-400 text-white shadow-[0_0_18px_rgba(236,72,153,0.7),0_0_30px_rgba(168,85,247,0.5)] animate-pulse'
                      : performanceScore.multiplier >= 4
                      ? 'bg-amber-500/20 border-amber-400/60 text-amber-200 shadow-[0_0_12px_rgba(245,158,11,0.5)] animate-pulse'
                      : performanceScore.streak >= 10
                      ? 'bg-purple-600/25 border-purple-400/50 text-purple-200'
                      : 'bg-white/5 border-white/10 text-zinc-300 hover:text-white'
                  }`}
                >
                  {performanceScore.multiplier >= 8 ? (
                    <Sparkles className="w-3 h-3 text-pink-300 animate-spin" />
                  ) : (
                    <Zap className={`w-3 h-3 ${performanceScore.multiplier >= 4 ? 'text-amber-400' : 'text-purple-400'}`} />
                  )}
                  <span className="font-bold">{performanceScore.streak}x</span>
                  {performanceScore.multiplier >= 8 ? (
                    <span className="px-1.5 py-0.2 rounded text-[8px] font-black bg-gradient-to-r from-pink-500 via-purple-500 to-amber-400 text-white shadow-[0_0_10px_#ec4899]">
                      8X COSMIC
                    </span>
                  ) : performanceScore.multiplier > 1 ? (
                    <span className="px-1 rounded text-[8px] font-extrabold bg-amber-400 text-black">
                      {performanceScore.multiplier}X
                    </span>
                  ) : null}
                  <span className="text-zinc-500">|</span>
                  <span className="font-bold text-amber-300">{performanceScore.score.toLocaleString()}</span>
                  <span className="text-zinc-500">|</span>
                  <span className="text-emerald-400 font-bold">{performanceScore.accuracy}%</span>
                  <Trophy className="w-2.5 h-2.5 text-amber-400" />
                </button>
              )}
            </div>

            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Main Controls Grid */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Left Section: Hand Separation Toggles */}
          <div className="flex items-center gap-1.5 p-1 rounded-full bg-white/5 border border-white/10">
            <button
              onClick={() => onChangeHand('both')}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                activeHand === 'both'
                  ? 'bg-white/20 text-white shadow-sm border border-white/30'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Both Hands
            </button>
            <button
              onClick={() => onChangeHand('left')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                activeHand === 'left'
                  ? 'lh-badge'
                  : 'text-purple-400 hover:text-purple-200'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-purple-500" />
              Left (Violet)
            </button>
            <button
              onClick={() => onChangeHand('right')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                activeHand === 'right'
                  ? 'rh-badge'
                  : 'text-amber-400 hover:text-amber-200'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              Right (Amber)
            </button>
          </div>

          {/* Center Section: Primary Transport */}
          <div className="flex items-center gap-2">
            <button
              onClick={onRestart}
              title="Restart from beginning"
              className="p-2 rounded-full text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              onClick={() => onSeek(Math.max(0, currentTime - 5))}
              title="Rewind 5s"
              className="p-2 rounded-full text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <Rewind className="w-4 h-4" />
            </button>

            {/* Play / Pause Primary Button */}
            <LiquidGlassButton
              onClick={onTogglePlay}
              className="w-12 h-12 !p-0 rounded-full bg-white text-black hover:bg-white/90 shadow-[0_0_20px_rgba(255,255,255,0.4)] active:scale-95"
            >
              {isPlaying ? (
                <Pause className="w-5 h-5 fill-current text-black" />
              ) : (
                <Play className="w-5 h-5 fill-current text-black ml-0.5" />
              )}
            </LiquidGlassButton>

            <button
              onClick={() => onSeek(Math.min(duration, currentTime + 5))}
              title="Forward 5s"
              className="p-2 rounded-full text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <FastForward className="w-4 h-4" />
            </button>
          </div>

          {/* Right Section: Practice Mode Modifiers */}
          <div className="flex items-center gap-2">
            {/* Wait-for-Me Mode Toggle */}
            <button
              onClick={onToggleWaitForMe}
              title="Wait-for-Me mode pauses until you play correct notes"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all border ${
                waitForMe
                  ? 'bg-purple-600/30 text-purple-200 border-purple-400/60 shadow-[0_0_12px_rgba(168,85,247,0.4)] animate-pulse'
                  : 'bg-white/5 text-zinc-400 border-white/10 hover:text-zinc-200'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              <span>Wait-for-Me</span>
            </button>

            {/* Tempo Modifier Button */}
            <div className="relative">
              <button
                onClick={() => setShowTempoPopup(!showTempoPopup)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-white/5 border border-white/10 text-zinc-300 hover:bg-white/10 transition-all"
              >
                <Clock className="w-3.5 h-3.5 text-zinc-400" />
                <span>{tempo}x</span>
              </button>

              {/* Tempo Slider Popover */}
              {showTempoPopup && (
                <div className="absolute bottom-full mb-3 right-0 p-3 rounded-2xl bg-[#0e101a] border border-white/15 shadow-2xl backdrop-blur-xl w-48 z-50">
                  <div className="flex justify-between items-center text-xs text-zinc-300 font-semibold mb-2">
                    <span>Speed / Tempo</span>
                    <span className="text-amber-400 font-mono">{tempo.toFixed(2)}x</span>
                  </div>
                  <input
                    type="range"
                    min="0.25"
                    max="1.5"
                    step="0.05"
                    value={tempo}
                    onChange={(e) => onTempoChange(parseFloat(e.target.value))}
                    className="w-full glass-slider cursor-pointer"
                  />
                  <div className="flex justify-between gap-1 mt-2 text-[10px] text-zinc-400">
                    {[0.5, 0.75, 1.0, 1.25].map((t) => (
                      <button
                        key={t}
                        onClick={() => onTempoChange(t)}
                        className={`px-1.5 py-0.5 rounded ${
                          tempo === t ? 'bg-amber-400 text-black font-bold' : 'bg-white/5 hover:bg-white/10'
                        }`}
                      >
                        {t}x
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* A-B Loop Controls */}
            <div className="flex items-center gap-1 p-0.5 rounded-full bg-white/5 border border-white/10 text-xs">
              <button
                onClick={onSetLoopA}
                className={`px-2 py-1 rounded-full text-[11px] font-bold ${
                  loopA !== null ? 'bg-purple-600 text-white' : 'text-zinc-400 hover:text-white'
                }`}
                title="Set Loop Point A"
              >
                [A
              </button>
              <button
                onClick={onSetLoopB}
                className={`px-2 py-1 rounded-full text-[11px] font-bold ${
                  loopB !== null ? 'bg-amber-500 text-black' : 'text-zinc-400 hover:text-white'
                }`}
                title="Set Loop Point B"
              >
                B]
              </button>
              {(loopA !== null || loopB !== null) && (
                <button
                  onClick={onClearLoop}
                  className="px-2 py-1 rounded-full text-[10px] text-zinc-500 hover:text-red-400"
                  title="Clear Loop"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Metronome & Pitch Studio Toggle */}
            {onOpenMetronomeStudio && (
              <button
                onClick={onOpenMetronomeStudio}
                title="Metronome & Concert Pitch Studio"
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all border ${
                  isMetronomeActive
                    ? 'bg-purple-600/30 text-purple-200 border-purple-400/80 shadow-[0_0_12px_rgba(168,85,247,0.5)] animate-pulse'
                    : 'bg-white/5 border-white/10 text-zinc-300 hover:text-white hover:bg-white/10'
                }`}
              >
                <Radio className={`w-3.5 h-3.5 ${isMetronomeActive ? 'text-purple-300 animate-spin' : 'text-purple-400'}`} />
                <span className="hidden sm:inline">Metronome</span>
              </button>
            )}

            {/* Live Performance Recording Button */}
            {onToggleRecord && (
              <button
                onClick={onToggleRecord}
                title={isRecording ? 'Stop Recording' : 'Record User Performance'}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all border ${
                  isRecording
                    ? 'bg-rose-500/25 text-rose-200 border-rose-400/80 shadow-[0_0_16px_rgba(244,63,94,0.5)] animate-pulse'
                    : 'bg-white/5 text-zinc-400 border-white/10 hover:text-white hover:bg-white/10'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    isRecording ? 'bg-rose-400 shadow-[0_0_8px_#f43f5e] animate-ping' : 'bg-rose-500'
                  }`}
                />
                <span>{isRecording ? `REC ${formatTime(recordingTime)}` : 'Record'}</span>
              </button>
            )}

            {/* Mic Listening Toggle */}
            <button
              onClick={onToggleMic}
              title="Listen to real acoustic piano via microphone"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all border ${
                isMicActive
                  ? 'bg-red-500/25 text-red-300 border-red-500/60 shadow-[0_0_12px_rgba(239,68,68,0.4)]'
                  : 'bg-white/5 text-zinc-400 border-white/10 hover:text-zinc-200'
              }`}
            >
              {isMicActive ? (
                <>
                  <Mic className="w-3.5 h-3.5 text-red-400 animate-pulse" />
                  <span>Mic On</span>
                  {/* Real-time VU level bar */}
                  <span
                    className="w-1.5 h-3 rounded-full bg-red-400 transition-all"
                    style={{ transform: `scaleY(${Math.max(0.3, micLevel)})` }}
                  />
                </>
              ) : (
                <>
                  <MicOff className="w-3.5 h-3.5 text-zinc-500" />
                  <span>Mic Off</span>
                </>
              )}
            </button>
          </div>
        </div>
      </LiquidGlassCard>
    </div>
  );
};
