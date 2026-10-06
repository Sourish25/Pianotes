import React, { useState } from 'react';
import type { InstrumentType, DSPSettings } from '../types';
import { pianoEngine } from '../audio/PianoEngine';
import { LiquidGlassCard } from './LiquidGlass';
import {
  Music,
  Radio,
  Sparkles,
  Sliders,
  Waves,
  Disc,
  Zap,
  Volume2,
  Activity,
  Layers,
} from 'lucide-react';

interface InstrumentSelectorProps {
  currentInstrument: InstrumentType;
  onSelectInstrument: (inst: InstrumentType) => void;
  isOpen: boolean;
  onClose: () => void;
}

interface InstrumentMeta {
  id: InstrumentType;
  name: string;
  category: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  tags: string[];
}

const INSTRUMENTS: InstrumentMeta[] = [
  {
    id: 'concert-grand',
    name: 'Concert Grand',
    category: 'Steinway Model D 9-foot',
    icon: Music,
    description: 'Breathtaking 9-foot concert grand with multi-harmonic overtones, hammer transient click, and hall acoustic reverb.',
    tags: ['Acoustic', 'Rich Resonance', 'Concert Hall'],
  },
  {
    id: 'upright',
    name: 'Vintage Upright',
    category: 'Studio Felted Piano',
    icon: Disc,
    description: 'Warm, felted hammer attack with close intimate damping, subtle double-string chorus, and woody cabinet resonance.',
    tags: ['Felted', 'Intimate', 'Warm Wood'],
  },
  {
    id: 'felt',
    name: 'Muted Felt Piano',
    category: 'Intimate Neoclassical',
    icon: Layers,
    description: 'Ultra-soft hammer felt dampening with subdued harmonics and warm low-pass acoustic proximity. Perfect for cinematic & ambient melodies.',
    tags: ['Soft Felt', 'Cinematic', 'Subdued'],
  },
  {
    id: 'neo-rhodes',
    name: 'Neo-Soul Rhodes',
    category: 'Electric Tine Mark I',
    icon: Waves,
    description: 'Signature metallic chime tine with warm body harmonics, gentle stereo tremolo vibrato, and vintage soul saturation.',
    tags: ['Electric Tine', 'Tremolo', 'R&B / Soul'],
  },
  {
    id: 'wurlitzer',
    name: 'Classic Wurlitzer',
    category: 'Vintage Reed 200A',
    icon: Zap,
    description: 'Iconic struck steel reed with dynamic tube bark when played hard, warm mechanical vibrato, and unmistakable vintage warmth.',
    tags: ['Vibrant Reed', 'Tube Bark', '60s / 70s Rock'],
  },
  {
    id: 'dx7-ep',
    name: 'DX7 FM E-Piano',
    category: '1980s Digital FM Legend',
    icon: Sliders,
    description: 'Crisp, crystal-bright FM metallic bell tine with instant attack and shimmering glassy 80s digital presence.',
    tags: ['FM Synthesis', 'Glassy Tine', '80s Classic'],
  },
  {
    id: 'lofi-tape',
    name: 'Lo-Fi Tape Piano',
    category: 'Vintage Cassette Deck',
    icon: Radio,
    description: 'Warm bandpass warmth with analog wow & flutter pitch drift, gentle vinyl noise floor, and nostalgic tape saturation.',
    tags: ['Tape Flutter', 'Bandpass', 'Nostalgic'],
  },
  {
    id: 'celesta',
    name: 'Celesta Bell',
    category: 'Orchestral Struck Bell Plates',
    icon: Sparkles,
    description: 'Magical crystalline chime struck with felt hammers on steel plates. Pure celestial ringing high harmonics.',
    tags: ['Crystalline', 'Chime', 'Celestial'],
  },
  {
    id: 'neon-synth',
    name: 'Neon Synth Keys',
    category: 'Analog Polysynth Lead',
    icon: Activity,
    description: 'Lush dual detuned sawtooth oscillators through a resonant lowpass filter sweep with sub-bass depth and analog chorus space.',
    tags: ['Analog Lead', 'Filter Sweep', 'Synthwave'],
  },
];

export const InstrumentSelector: React.FC<InstrumentSelectorProps> = ({
  currentInstrument,
  onSelectInstrument,
  isOpen,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'instruments' | 'dsp'>('instruments');
  const [dspSettings, setDspSettings] = useState<DSPSettings>(() => pianoEngine.getDSPSettings());

  if (!isOpen) return null;

  const handleSelect = (inst: InstrumentType) => {
    pianoEngine.setInstrument(inst);
    onSelectInstrument(inst);
    // Audition chime note (C5 = 72)
    pianoEngine.playNote(72, 0.9);
    setTimeout(() => pianoEngine.stopNote(72), 600);
  };

  const handleUpdateDSP = (updates: Partial<DSPSettings>) => {
    const updated = { ...dspSettings, ...updates };
    setDspSettings(updated);
    pianoEngine.updateDSPSettings(updates);
  };

  return (
    <div className="liquid-sheet-overlay" onClick={onClose}>
      <div
        className="liquid-sheet"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '720px', maxHeight: '88vh' }}
      >
        <div className="sheet-handle" onClick={onClose} />

        <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/10">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-400" />
              <span>Sound & Audio Engine</span>
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              9 synthesized multi-voice instruments & 4-stage DSP effects rack.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Tab Switcher */}
            <div className="flex bg-white/5 rounded-full p-0.5 border border-white/10 text-xs">
              <button
                onClick={() => setActiveTab('instruments')}
                className={`px-3 py-1 rounded-full transition-all ${
                  activeTab === 'instruments'
                    ? 'bg-amber-400 text-black font-semibold shadow-sm'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Instruments (9)
              </button>
              <button
                onClick={() => setActiveTab('dsp')}
                className={`px-3 py-1 rounded-full transition-all flex items-center gap-1.5 ${
                  activeTab === 'dsp'
                    ? 'bg-amber-400 text-black font-semibold shadow-sm'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>DSP Rack</span>
              </button>
            </div>

            <button
              onClick={onClose}
              className="px-3 py-1 rounded-full text-xs font-medium text-zinc-400 hover:text-white bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
            >
              Done
            </button>
          </div>
        </div>

        {/* Tab 1: Instruments Grid */}
        {activeTab === 'instruments' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 overflow-y-auto max-h-[64vh] pr-1 pb-4">
            {INSTRUMENTS.map((inst) => {
              const isSelected = currentInstrument === inst.id;
              const Icon = inst.icon;

              return (
                <LiquidGlassCard
                  key={inst.id}
                  onClick={() => handleSelect(inst.id)}
                  className={`p-3.5 cursor-pointer transition-all border flex flex-col justify-between ${
                    isSelected
                      ? 'border-amber-400/80 bg-amber-500/10 shadow-[0_0_24px_rgba(245,158,11,0.25)]'
                      : 'border-white/10 hover:border-white/25 hover:bg-white/5'
                  }`}
                >
                  <div>
                    <div className="flex items-start gap-2.5">
                      <div
                        className={`p-2 rounded-xl border flex-shrink-0 ${
                          isSelected
                            ? 'bg-amber-400 text-black border-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.5)]'
                            : 'bg-white/10 text-white border-white/15'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h3 className="text-sm font-semibold text-white tracking-tight truncate">
                            {inst.name}
                          </h3>
                          {isSelected && (
                            <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-amber-400 text-black">
                              ACTIVE
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-zinc-400 font-medium truncate">
                          {inst.category}
                        </p>
                      </div>
                    </div>

                    <p className="text-xs text-zinc-300/80 mt-2 line-clamp-2 leading-relaxed">
                      {inst.description}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-1 mt-2.5">
                    {inst.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-1.5 py-0.5 rounded text-[9px] bg-white/5 border border-white/10 text-zinc-300"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </LiquidGlassCard>
              );
            })}
          </div>
        )}

        {/* Tab 2: DSP Effects Rack */}
        {activeTab === 'dsp' && (
          <div className="space-y-3.5 overflow-y-auto max-h-[64vh] pr-1 pb-4">
            {/* 1. Algorithmic Reverb */}
            <LiquidGlassCard className="p-4 border border-white/15">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/30">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-white">
                      Algorithmic Convolver Reverb
                    </h4>
                    <p className="text-xs text-zinc-400">
                      Concert hall acoustic space with natural exponential decay.
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => handleUpdateDSP({ reverb: !dspSettings.reverb })}
                  className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all ${
                    dspSettings.reverb
                      ? 'bg-purple-500 text-white border-purple-400 shadow-[0_0_12px_rgba(168,85,247,0.5)]'
                      : 'bg-white/5 text-zinc-400 border-white/10'
                  }`}
                >
                  {dspSettings.reverb ? 'ENABLED' : 'BYPASS'}
                </button>
              </div>

              {dspSettings.reverb && (
                <div className="mt-3.5 pt-3 border-t border-white/10 flex items-center gap-4">
                  <span className="text-xs text-zinc-400 min-w-16">
                    Wet Mix: {Math.round(dspSettings.reverbWet * 100)}%
                  </span>
                  <input
                    type="range"
                    min="0"
                    max="0.8"
                    step="0.02"
                    value={dspSettings.reverbWet}
                    onChange={(e) =>
                      handleUpdateDSP({ reverbWet: parseFloat(e.target.value) })
                    }
                    className="flex-1 accent-purple-400 cursor-pointer"
                  />
                </div>
              )}
            </LiquidGlassCard>

            {/* 2. Stereo Chorus */}
            <LiquidGlassCard className="p-4 border border-white/15">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                    <Waves className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-white">
                      Stereo Analog Chorus
                    </h4>
                    <p className="text-xs text-zinc-400">
                      Dual modulated delay line creating lush width and pitch shimmer.
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => handleUpdateDSP({ chorus: !dspSettings.chorus })}
                  className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all ${
                    dspSettings.chorus
                      ? 'bg-cyan-500 text-black border-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.5)]'
                      : 'bg-white/5 text-zinc-400 border-white/10'
                  }`}
                >
                  {dspSettings.chorus ? 'ENABLED' : 'BYPASS'}
                </button>
              </div>

              {dspSettings.chorus && (
                <div className="mt-3.5 pt-3 border-t border-white/10 flex items-center gap-4">
                  <span className="text-xs text-zinc-400 min-w-16">
                    Depth: {Math.round(dspSettings.chorusDepth * 100)}%
                  </span>
                  <input
                    type="range"
                    min="0.1"
                    max="1.0"
                    step="0.05"
                    value={dspSettings.chorusDepth}
                    onChange={(e) =>
                      handleUpdateDSP({ chorusDepth: parseFloat(e.target.value) })
                    }
                    className="flex-1 accent-cyan-400 cursor-pointer"
                  />
                </div>
              )}
            </LiquidGlassCard>

            {/* 3. Stereo Ping-Pong Delay */}
            <LiquidGlassCard className="p-4 border border-white/15">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    <Volume2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-white">
                      Tempo Rhythm Delay
                    </h4>
                    <p className="text-xs text-zinc-400">
                      Rhythmic echo repeats with adjustable regenerative feedback.
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => handleUpdateDSP({ delay: !dspSettings.delay })}
                  className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all ${
                    dspSettings.delay
                      ? 'bg-amber-400 text-black border-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.5)]'
                      : 'bg-white/5 text-zinc-400 border-white/10'
                  }`}
                >
                  {dspSettings.delay ? 'ENABLED' : 'BYPASS'}
                </button>
              </div>

              {dspSettings.delay && (
                <div className="mt-3.5 pt-3 border-t border-white/10 flex items-center gap-4">
                  <span className="text-xs text-zinc-400 min-w-16">
                    Feedback: {Math.round(dspSettings.delayFeedback * 100)}%
                  </span>
                  <input
                    type="range"
                    min="0.1"
                    max="0.75"
                    step="0.05"
                    value={dspSettings.delayFeedback}
                    onChange={(e) =>
                      handleUpdateDSP({ delayFeedback: parseFloat(e.target.value) })
                    }
                    className="flex-1 accent-amber-400 cursor-pointer"
                  />
                </div>
              )}
            </LiquidGlassCard>

            {/* 4. Tape Drive Saturation */}
            <LiquidGlassCard className="p-4 border border-white/15">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-rose-500/20 text-rose-300 border border-rose-500/30">
                    <Radio className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-white">
                      Analog Tape Drive / Tube Saturation
                    </h4>
                    <p className="text-xs text-zinc-400">
                      Hyperbolic tangent waveshaper adding warm analog harmonic coloration.
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => handleUpdateDSP({ tapeDrive: !dspSettings.tapeDrive })}
                  className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all ${
                    dspSettings.tapeDrive
                      ? 'bg-rose-500 text-white border-rose-400 shadow-[0_0_12px_rgba(244,63,94,0.5)]'
                      : 'bg-white/5 text-zinc-400 border-white/10'
                  }`}
                >
                  {dspSettings.tapeDrive ? 'ENABLED' : 'BYPASS'}
                </button>
              </div>

              {dspSettings.tapeDrive && (
                <div className="mt-3.5 pt-3 border-t border-white/10 flex items-center gap-4">
                  <span className="text-xs text-zinc-400 min-w-16">
                    Drive: {Math.round(dspSettings.driveAmount * 100)}%
                  </span>
                  <input
                    type="range"
                    min="0.1"
                    max="1.0"
                    step="0.05"
                    value={dspSettings.driveAmount}
                    onChange={(e) =>
                      handleUpdateDSP({ driveAmount: parseFloat(e.target.value) })
                    }
                    className="flex-1 accent-rose-400 cursor-pointer"
                  />
                </div>
              )}
            </LiquidGlassCard>
          </div>
        )}
      </div>
    </div>
  );
};
