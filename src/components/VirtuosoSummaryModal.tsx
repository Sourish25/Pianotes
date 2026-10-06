import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import type { PerformanceScore } from '../types';
import { calculateStarRating } from '../utils/scoringSystem';
import { LiquidGlassCard, LiquidGlassButton } from './LiquidGlass';
import {
  Trophy,
  RotateCcw,
  Music,
  Share2,
  X,
  Target,
  Zap,
} from 'lucide-react';

interface VirtuosoSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  score: PerformanceScore;
  songTitle: string;
  composer: string;
  onReplay: () => void;
  onOpenLibrary: () => void;
  onExportMidi?: () => void;
}

export const VirtuosoSummaryModal: React.FC<VirtuosoSummaryModalProps> = ({
  isOpen,
  onClose,
  score,
  songTitle,
  composer,
  onReplay,
  onOpenLibrary,
  onExportMidi,
}) => {
  const { stars, rank, label } = calculateStarRating(score.accuracy);

  useEffect(() => {
    if (isOpen && stars >= 4) {
      // Fire celebratory cosmic confetti bursts
      const count = 200;
      const defaults = {
        origin: { y: 0.7 },
        zIndex: 9999,
      };

      const fire = (particleRatio: number, opts: confetti.Options) => {
        confetti({
          ...defaults,
          ...opts,
          particleCount: Math.floor(count * particleRatio),
        });
      };

      fire(0.25, {
        spread: 26,
        startVelocity: 55,
        colors: ['#a855f7', '#f59e0b', '#ec4899', '#38bdf8'],
      });
      fire(0.2, {
        spread: 60,
        colors: ['#fbbf24', '#f43f5e', '#a855f7'],
      });
      fire(0.35, {
        spread: 100,
        decay: 0.91,
        scalar: 0.8,
      });
      fire(0.1, {
        spread: 120,
        startVelocity: 25,
        decay: 0.92,
        scalar: 1.2,
      });
      fire(0.1, {
        spread: 120,
        startVelocity: 45,
      });
    }
  }, [isOpen, stars]);

  if (!isOpen) return null;

  return (
    <div className="liquid-sheet-overlay !z-50" onClick={onClose}>
      <div
        className="relative w-full max-w-xl mx-4 my-auto p-0 rounded-3xl overflow-hidden border border-white/20 shadow-[0_0_50px_rgba(168,85,247,0.35)] animate-in fade-in zoom-in-95 duration-300"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'linear-gradient(135deg, rgba(20, 15, 38, 0.92) 0%, rgba(12, 10, 24, 0.95) 100%)',
          backdropFilter: 'blur(32px) saturate(220%)',
        }}
      >
        {/* Top ambient glow light streak */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 via-amber-400 to-pink-500 shadow-[0_0_20px_rgba(245,158,11,0.8)]" />

        <div className="p-6 md:p-8">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-amber-500 p-0.5 shadow-[0_0_24px_rgba(168,85,247,0.5)]">
                <div className="w-full h-full rounded-[14px] bg-[#0c0a18] flex items-center justify-center">
                  <Trophy className="w-6 h-6 text-amber-400" />
                </div>
              </div>
              <div>
                <h3 className="text-xl md:text-2xl font-black tracking-tight text-white">
                  Virtuoso Performance
                </h3>
                <p className="text-xs text-zinc-400 font-medium truncate max-w-[280px]">
                  {songTitle} &bull; <span className="text-zinc-500">{composer}</span>
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-full text-zinc-400 hover:text-white bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Star Rating Section */}
          <div className="my-6 text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              {[1, 2, 3, 4, 5].map((index) => {
                const isLit = index <= stars;
                return (
                  <svg
                    key={index}
                    viewBox="0 0 24 24"
                    fill={isLit ? '#f59e0b' : 'none'}
                    stroke={isLit ? '#fbbf24' : '#4b5563'}
                    strokeWidth="1.5"
                    className={`w-9 h-9 transition-all duration-500 ${
                      isLit
                        ? 'scale-110 drop-shadow-[0_0_12px_rgba(245,158,11,0.9)] animate-pulse'
                        : 'opacity-40'
                    }`}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"
                    />
                  </svg>
                );
              })}
            </div>

            <div className="inline-block px-4 py-1 rounded-full text-xs font-extrabold uppercase tracking-widest bg-gradient-to-r from-purple-500/20 via-amber-500/20 to-pink-500/20 border border-white/20 text-white shadow-inner">
              {label} ({rank})
            </div>
          </div>

          {/* Primary Statistics Grid */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            <LiquidGlassCard className="p-3 text-center !rounded-2xl">
              <span className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wider block">
                Final Score
              </span>
              <span className="text-xl md:text-2xl font-black font-mono text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-amber-500">
                {score.score.toLocaleString()}
              </span>
            </LiquidGlassCard>

            <LiquidGlassCard className="p-3 text-center !rounded-2xl">
              <span className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wider block">
                Accuracy
              </span>
              <span className="text-xl md:text-2xl font-black font-mono text-purple-300">
                {score.accuracy}%
              </span>
            </LiquidGlassCard>

            <LiquidGlassCard className="p-3 text-center !rounded-2xl">
              <span className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wider block">
                Max Streak
              </span>
              <span className="text-xl md:text-2xl font-black font-mono text-emerald-400 flex items-center justify-center gap-1">
                <Zap className="w-4 h-4" />
                {score.maxStreak}x
              </span>
            </LiquidGlassCard>
          </div>

          {/* Detailed Strike Timing Breakdown */}
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 mb-6">
            <h4 className="text-xs font-bold text-zinc-300 mb-3 flex items-center gap-1.5 uppercase tracking-wider">
              <Target className="w-3.5 h-3.5 text-purple-400" />
              <span>Strike Timing Precision</span>
            </h4>

            <div className="grid grid-cols-5 gap-2 text-center text-xs">
              <div className="p-2 rounded-xl bg-cyan-950/40 border border-cyan-500/30">
                <span className="text-[10px] text-cyan-400 font-bold block">PERFECT</span>
                <span className="text-sm font-extrabold text-white font-mono">{score.perfectCount}</span>
                <span className="text-[9px] text-zinc-500 block">±30ms</span>
              </div>

              <div className="p-2 rounded-xl bg-emerald-950/40 border border-emerald-500/30">
                <span className="text-[10px] text-emerald-400 font-bold block">GREAT</span>
                <span className="text-sm font-extrabold text-white font-mono">{score.greatCount}</span>
                <span className="text-[9px] text-zinc-500 block">±70ms</span>
              </div>

              <div className="p-2 rounded-xl bg-amber-950/40 border border-amber-500/30">
                <span className="text-[10px] text-amber-400 font-bold block">EARLY</span>
                <span className="text-sm font-extrabold text-white font-mono">{score.earlyCount}</span>
                <span className="text-[9px] text-zinc-500 block">&gt;-150ms</span>
              </div>

              <div className="p-2 rounded-xl bg-orange-950/40 border border-orange-500/30">
                <span className="text-[10px] text-orange-400 font-bold block">LATE</span>
                <span className="text-sm font-extrabold text-white font-mono">{score.lateCount}</span>
                <span className="text-[9px] text-zinc-500 block">&lt;+200ms</span>
              </div>

              <div className="p-2 rounded-xl bg-red-950/40 border border-red-500/30">
                <span className="text-[10px] text-red-400 font-bold block">MISS</span>
                <span className="text-sm font-extrabold text-white font-mono">{score.missCount}</span>
                <span className="text-[9px] text-zinc-500 block">&gt;200ms</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <LiquidGlassButton
                onClick={() => {
                  onClose();
                  onReplay();
                }}
                className="flex items-center gap-2 !px-4 !py-2 text-xs text-white"
              >
                <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                <span>Replay Piece</span>
              </LiquidGlassButton>

              <LiquidGlassButton
                onClick={() => {
                  onClose();
                  onOpenLibrary();
                }}
                variant="amber"
                className="flex items-center gap-2 !px-4 !py-2 text-xs font-semibold"
              >
                <Music className="w-3.5 h-3.5" />
                <span>Song Library</span>
              </LiquidGlassButton>
            </div>

            {onExportMidi && (
              <button
                onClick={onExportMidi}
                className="flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-semibold text-purple-300 hover:text-white bg-purple-500/15 border border-purple-500/30 hover:bg-purple-500/25 transition-all shadow-sm"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Export MIDI</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
