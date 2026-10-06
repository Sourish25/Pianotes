import React, { useState, useEffect, useRef } from 'react';
import type { MetronomeTimeSignature, ConcertPitch } from '../types';
import { metronomeEngine } from '../audio/MetronomeEngine';
import { pianoEngine } from '../audio/PianoEngine';
import { LiquidGlassButton } from './LiquidGlass';
import {
  Volume2,
  VolumeX,
  Play,
  Pause,
  Minus,
  Plus,
  Radio,
  Sliders,
  Sparkles,
  X,
} from 'lucide-react';

interface MetronomeStudioProps {
  isOpen: boolean;
  onClose: () => void;
  currentSongBpm?: number;
}

export const MetronomeStudio: React.FC<MetronomeStudioProps> = ({
  isOpen,
  onClose,
  currentSongBpm = 100,
}) => {
  const [bpm, setBpm] = useState<number>(() => metronomeEngine.getBpm() || currentSongBpm || 100);
  const [timeSignature, setTimeSignature] = useState<MetronomeTimeSignature>(() => metronomeEngine.getTimeSignature());
  const [volume, setVolume] = useState<number>(() => metronomeEngine.getVolume());
  const [isRunning, setIsRunning] = useState<boolean>(() => metronomeEngine.getIsRunning());
  const [currentBeat, setCurrentBeat] = useState<number>(0);
  const [isAccented, setIsAccented] = useState<boolean>(false);
  const [concertPitch, setConcertPitch] = useState<ConcertPitch>(
    (pianoEngine.getConcertPitch() as ConcertPitch) || 440
  );

  const totalBeats = timeSignature === '3/4' ? 3 : timeSignature === '6/8' ? 6 : 4;

  // Pendulum swing angle state (-28deg to +28deg)
  const [pendulumAngle, setPendulumAngle] = useState<number>(0);
  const swingDirectionRef = useRef<number>(1);

  // Keep BPM in sync with engine
  useEffect(() => {
    metronomeEngine.setBpm(bpm);
  }, [bpm]);

  useEffect(() => {
    metronomeEngine.setTimeSignature(timeSignature);
  }, [timeSignature]);

  useEffect(() => {
    metronomeEngine.setVolume(volume);
  }, [volume]);

  // Metronome tick callback
  useEffect(() => {
    metronomeEngine.setCallback((beat, _total, accented) => {
      setCurrentBeat(beat);
      setIsAccented(accented);

      // Swing pendulum to opposite extreme on each beat
      swingDirectionRef.current = swingDirectionRef.current * -1;
      setPendulumAngle(swingDirectionRef.current * 28);
    });

    return () => {
      metronomeEngine.setCallback(null);
    };
  }, []);

  const handleTogglePlay = () => {
    if (isRunning) {
      metronomeEngine.stop();
      setIsRunning(false);
      setPendulumAngle(0);
    } else {
      metronomeEngine.start();
      setIsRunning(true);
    }
  };

  const handlePitchChange = (pitch: ConcertPitch) => {
    setConcertPitch(pitch);
    pianoEngine.setConcertPitch(pitch);
    // Play a gentle preview A4 note to hear the tuning
    pianoEngine.playNote(69, 0.7);
    setTimeout(() => {
      pianoEngine.stopNote(69);
    }, 450);
  };

  if (!isOpen) return null;

  return (
    <div className="liquid-sheet-overlay !z-50" onClick={onClose}>
      <div
        className="liquid-sheet"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '640px' }}
      >
        <div className="sheet-handle" onClick={onClose} />

        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-purple-500/20 border border-purple-400/40 flex items-center justify-center text-purple-300">
              <Radio className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">
                Concert Pitch & Metronome Studio
              </h2>
              <p className="text-[11px] text-zinc-400">
                Precision pendulum click generator & micro-tuning master frequencies
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-zinc-400 hover:text-white bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Section 1: Concert Pitch Master Micro-Tuning Selector */}
        <div className="mb-6 p-4 rounded-2xl bg-white/5 border border-white/10">
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-xs font-bold text-zinc-200 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Concert Pitch Tuning (A4)</span>
            </span>
            <span className="text-xs font-mono font-bold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-full border border-amber-400/30">
              {concertPitch} Hz
            </span>
          </div>

          <p className="text-[11px] text-zinc-400 mb-3 leading-relaxed">
            Instantly shift all 88 keys to sacred, historical, or orchestral temperaments:
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              {
                freq: 440 as ConcertPitch,
                name: 'A440 Standard',
                subtitle: 'Modern ISO 16',
                color: 'purple',
              },
              {
                freq: 432 as ConcertPitch,
                name: 'A432 Healing',
                subtitle: 'Verdi / Sacred',
                color: 'emerald',
              },
              {
                freq: 442 as ConcertPitch,
                name: 'A442 Orchestral',
                subtitle: 'Symphony Pitch',
                color: 'cyan',
              },
              {
                freq: 415 as ConcertPitch,
                name: 'A415 Baroque',
                subtitle: 'Chamber Pitch (-1st)',
                color: 'amber',
              },
            ].map((item) => {
              const active = concertPitch === item.freq;
              return (
                <button
                  key={item.freq}
                  onClick={() => handlePitchChange(item.freq)}
                  className={`p-2.5 rounded-xl text-left border transition-all ${
                    active
                      ? 'bg-purple-600/30 border-purple-400/80 shadow-[0_0_16px_rgba(168,85,247,0.4)] text-white'
                      : 'bg-white/5 border-white/10 hover:border-white/20 text-zinc-400 hover:text-white'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold font-mono">{item.freq} Hz</span>
                    {active && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shadow-[0_0_6px_#f59e0b]" />}
                  </div>
                  <div className="text-[11px] font-semibold text-zinc-200 mt-0.5">
                    {item.name.replace(`A${item.freq} `, '')}
                  </div>
                  <div className="text-[9px] text-zinc-500">{item.subtitle}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Section 2: Visual Glass Pendulum & Metronome */}
        <div className="p-4 rounded-2xl bg-white/5 border border-white/10 mb-4">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold text-zinc-200 uppercase tracking-wider flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-purple-400" />
              <span>Acoustic Metronome & Glass Pendulum</span>
            </span>

            {/* Time signature pills */}
            <div className="flex items-center gap-1 p-0.5 rounded-full bg-white/10 border border-white/10 text-xs">
              {(['4/4', '3/4', '6/8'] as MetronomeTimeSignature[]).map((ts) => (
                <button
                  key={ts}
                  onClick={() => setTimeSignature(ts)}
                  className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold transition-all ${
                    timeSignature === ts
                      ? 'bg-purple-600 text-white shadow-sm'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  {ts}
                </button>
              ))}
            </div>
          </div>

          {/* Visual Glass Pendulum Display */}
          <div className="relative w-full h-32 rounded-2xl bg-[#090b14]/80 border border-white/10 flex flex-col items-center justify-between p-3 overflow-hidden shadow-inner">
            {/* Beat indicators across top */}
            <div className="flex items-center gap-2 z-10">
              {Array.from({ length: totalBeats }).map((_, idx) => {
                const isActive = isRunning && currentBeat === idx;
                const isFirst = idx === 0 || (timeSignature === '6/8' && idx === 3);
                return (
                  <div
                    key={idx}
                    className={`w-3 h-3 rounded-full transition-all duration-100 ${
                      isActive
                        ? isFirst
                          ? 'bg-amber-400 scale-125 shadow-[0_0_12px_rgba(245,158,11,1)]'
                          : 'bg-purple-400 scale-110 shadow-[0_0_10px_rgba(168,85,247,0.9)]'
                        : isFirst
                        ? 'bg-amber-500/20 border border-amber-500/40'
                        : 'bg-white/10'
                    }`}
                  />
                );
              })}
            </div>

            {/* Glass Pendulum Stem & Bob */}
            <div className="relative w-full flex-1 flex items-center justify-center">
              <div
                className="absolute top-0 w-1 bg-gradient-to-b from-white/40 via-purple-400/60 to-amber-400/80 rounded-full origin-top transition-transform duration-150 ease-out"
                style={{
                  height: '74px',
                  transform: `rotate(${isRunning ? pendulumAngle : 0}deg)`,
                }}
              >
                {/* Pendulum Weight / Bob in liquid glass */}
                <div className="absolute -bottom-3 -left-3 w-7 h-7 rounded-full bg-gradient-to-br from-purple-400 to-amber-400 p-0.5 shadow-[0_0_16px_rgba(245,158,11,0.7)]">
                  <div className="w-full h-full rounded-full bg-[#18122c] flex items-center justify-center border border-white/40">
                    <div
                      className={`w-2 h-2 rounded-full transition-colors ${
                        isAccented ? 'bg-amber-400 shadow-[0_0_6px_#f59e0b]' : 'bg-purple-400'
                      }`}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Pendulum Scale markings */}
            <div className="w-48 h-1 rounded-full bg-white/10 flex justify-between px-1 items-center">
              <span className="w-1 h-2 bg-white/30 rounded" />
              <span className="w-1 h-3 bg-white/50 rounded" />
              <span className="w-1 h-2 bg-white/30 rounded" />
            </div>
          </div>

          {/* BPM & Transport Controls */}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            {/* Play/Stop Button */}
            <LiquidGlassButton
              onClick={handleTogglePlay}
              className={`flex items-center gap-2 !px-4 !py-2 text-xs font-bold ${
                isRunning ? '!bg-red-500/30 !border-red-400 text-red-200' : 'text-white'
              }`}
            >
              {isRunning ? (
                <>
                  <Pause className="w-4 h-4" />
                  <span>Stop Metronome</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current ml-0.5" />
                  <span>Start Metronome</span>
                </>
              )}
            </LiquidGlassButton>

            {/* Tempo stepper & display */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setBpm((b) => Math.max(30, b - 5))}
                className="p-2 rounded-full bg-white/5 border border-white/10 text-zinc-300 hover:text-white hover:bg-white/10"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>

              <div className="px-4 py-1.5 rounded-xl bg-white/10 border border-white/15 text-center min-w-[90px]">
                <span className="text-base font-black font-mono text-amber-400 block">{bpm}</span>
                <span className="text-[9px] uppercase tracking-wider text-zinc-400 font-semibold block">BPM</span>
              </div>

              <button
                onClick={() => setBpm((b) => Math.min(280, b + 5))}
                className="p-2 rounded-full bg-white/5 border border-white/10 text-zinc-300 hover:text-white hover:bg-white/10"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Volume slider */}
            <div className="flex items-center gap-2 min-w-[130px]">
              {volume > 0 ? (
                <Volume2 className="w-4 h-4 text-zinc-400 shrink-0" />
              ) : (
                <VolumeX className="w-4 h-4 text-zinc-500 shrink-0" />
              )}
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={volume}
                onChange={(e) => setVolume(parseFloat(e.target.value))}
                className="glass-slider w-24 cursor-pointer"
              />
              <span className="text-[10px] font-mono text-zinc-400 w-7">
                {Math.round(volume * 100)}%
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-full text-xs font-semibold bg-white text-black hover:bg-zinc-200 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
