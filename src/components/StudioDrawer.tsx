import React, { useState, useEffect, useRef } from 'react';
import type { InstrumentType, DSPSettings, MetronomeTimeSignature, ConcertPitch } from '../types';
import { pianoEngine } from '../audio/PianoEngine';
import { metronomeEngine } from '../audio/MetronomeEngine';
import { triggerHaptic } from '../utils/haptics';
import { LiquidGlassButton } from './LiquidGlass';
import {
  Music,
  Radio,
  Sparkles,
  Sliders,
  Waves,
  Disc,
  Zap,
  Volume2,
  VolumeX,
  Activity,
  Layers,
  X,
  Play,
  Pause,
  Minus,
  Plus,
} from 'lucide-react';

interface StudioDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  currentInstrument: InstrumentType;
  onSelectInstrument: (inst: InstrumentType) => void;
  currentSongBpm?: number;
  initialTab?: 'instruments' | 'dsp' | 'metronome';
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
    description: 'Ultra-soft hammer felt dampening with subdued harmonics and warm low-pass acoustic proximity.',
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
    description: 'Iconic struck steel reed with dynamic tube bark when played hard, warm mechanical vibrato, and vintage warmth.',
    tags: ['Vibrant Reed', 'Tube Bark', 'Vintage Rock'],
  },
  {
    id: 'dx7-ep',
    name: 'DX7 FM E-Piano',
    category: '1980s Digital FM Legend',
    icon: Sliders,
    description: 'Crisp, crystal-bright FM metallic bell tine with instant attack and shimmering glassy digital presence.',
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
    description: 'Lush dual detuned sawtooth oscillators through a resonant lowpass filter sweep with sub-bass depth.',
    tags: ['Analog Lead', 'Filter Sweep', 'Synthwave'],
  },
];

export const StudioDrawer: React.FC<StudioDrawerProps> = ({
  isOpen,
  onClose,
  currentInstrument,
  onSelectInstrument,
  currentSongBpm = 100,
  initialTab = 'instruments',
}) => {
  const [activeTab, setActiveTab] = useState<'instruments' | 'dsp' | 'metronome'>(initialTab);
  const [dspSettings, setDspSettings] = useState<DSPSettings>(() => pianoEngine.getDSPSettings());

  // Metronome State
  const [bpm, setBpm] = useState<number>(() => metronomeEngine.getBpm() || currentSongBpm || 100);
  const [timeSignature, setTimeSignature] = useState<MetronomeTimeSignature>(() => metronomeEngine.getTimeSignature());
  const [volume, setVolume] = useState<number>(() => metronomeEngine.getVolume());
  const [isRunning, setIsRunning] = useState<boolean>(() => metronomeEngine.getIsRunning());
  const [currentBeat, setCurrentBeat] = useState<number>(0);
  const [isAccented, setIsAccented] = useState<boolean>(false);
  const [concertPitch, setConcertPitch] = useState<ConcertPitch>(
    (pianoEngine.getConcertPitch() as ConcertPitch) || 440
  );
  const [pendulumAngle, setPendulumAngle] = useState<number>(0);
  const swingDirectionRef = useRef<number>(1);

  // Sync Metronome settings
  useEffect(() => {
    metronomeEngine.setBpm(bpm);
  }, [bpm]);

  useEffect(() => {
    metronomeEngine.setTimeSignature(timeSignature);
  }, [timeSignature]);

  useEffect(() => {
    metronomeEngine.setVolume(volume);
  }, [volume]);

  useEffect(() => {
    metronomeEngine.setCallback((beat, _total, accented) => {
      setCurrentBeat(beat);
      setIsAccented(accented);
      swingDirectionRef.current = swingDirectionRef.current * -1;
      setPendulumAngle(swingDirectionRef.current * 26);
    });
    return () => {
      metronomeEngine.setCallback(null);
    };
  }, []);

  if (!isOpen) return null;

  const handleSelectInstrument = (inst: InstrumentType) => {
    triggerHaptic('light');
    onSelectInstrument(inst);
    pianoEngine.setInstrument(inst);
    // Play subtle preview chord (C4, E4, G4)
    pianoEngine.playNote(60, 0.75);
    setTimeout(() => pianoEngine.playNote(64, 0.75), 100);
    setTimeout(() => pianoEngine.playNote(67, 0.8), 200);
    setTimeout(() => {
      pianoEngine.stopNote(60);
      pianoEngine.stopNote(64);
      pianoEngine.stopNote(67);
    }, 900);
  };

  const handleDSPChange = (updates: Partial<DSPSettings>) => {
    const updated = { ...dspSettings, ...updates };
    setDspSettings(updated);
    pianoEngine.updateDSPSettings(updated);
  };

  const handleToggleMetronome = () => {
    triggerHaptic('medium');
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
    triggerHaptic('light');
    setConcertPitch(pitch);
    pianoEngine.setConcertPitch(pitch);
    pianoEngine.playNote(69, 0.7);
    setTimeout(() => pianoEngine.stopNote(69), 450);
  };

  const totalBeats = timeSignature === '3/4' ? 3 : timeSignature === '6/8' ? 6 : 4;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 pointer-events-none flex justify-end">
      {/* Mobile portrait backdrop dismiss */}
      <div
        className="block md:hidden absolute inset-0 bg-black/60 backdrop-blur-md pointer-events-auto"
        onClick={onClose}
      />

      {/* Right-Flyout Studio Panel: Audition sounds live while tweaking! */}
      <div
        className="relative pointer-events-auto w-full md:w-[420px] max-w-[90vw] h-full bg-[#0e101a]/95 backdrop-blur-3xl border-l border-white/20 shadow-[-20px_0_50px_rgba(0,0,0,0.8),inset_0_1px_1px_rgba(255,255,255,0.4)] flex flex-col p-5 overflow-y-auto animate-in slide-in-from-right duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sheet-handle block md:hidden" onClick={onClose} />

        {/* Header Bar */}
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-purple-600/20 border border-purple-400/40 flex items-center justify-center text-purple-300">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">Studio & Acoustics Engine</h2>
              <p className="text-[11px] text-zinc-400">9 Luxury Timbres • 4-Stage DSP Rack • Concert Micro-Tuning</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-zinc-400 hover:text-white bg-white/5 border border-white/10 hover:bg-white/10"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex p-1 rounded-2xl bg-white/5 border border-white/10 mb-5">
          <button
            onClick={() => {
              triggerHaptic('light');
              setActiveTab('instruments');
            }}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'instruments'
                ? 'bg-purple-600 text-white shadow-[0_0_14px_rgba(168,85,247,0.4)]'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Music className="w-3.5 h-3.5" />
            <span>Timbres ({INSTRUMENTS.length})</span>
          </button>
          <button
            onClick={() => {
              triggerHaptic('light');
              setActiveTab('dsp');
            }}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'dsp'
                ? 'bg-amber-500 text-black shadow-[0_0_14px_rgba(245,158,11,0.4)]'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Waves className="w-3.5 h-3.5" />
            <span>DSP Effects</span>
          </button>
          <button
            onClick={() => {
              triggerHaptic('light');
              setActiveTab('metronome');
            }}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'metronome'
                ? 'bg-cyan-500 text-black shadow-[0_0_14px_rgba(6,182,212,0.4)]'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            <span>Pitch & Metronome</span>
          </button>
        </div>

        {/* Tab 1: Instruments & Timbres */}
        {activeTab === 'instruments' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto pr-1">
            {INSTRUMENTS.map((inst) => {
              const Icon = inst.icon;
              const isSelected = currentInstrument === inst.id;
              return (
                <div
                  key={inst.id}
                  onClick={() => handleSelectInstrument(inst.id)}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer select-none flex flex-col justify-between ${
                    isSelected
                      ? 'bg-gradient-to-br from-purple-900/40 to-[#120f24] border-purple-400/80 shadow-[0_0_20px_rgba(168,85,247,0.3)] ring-1 ring-purple-400/50'
                      : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                            isSelected ? 'bg-purple-500 text-white shadow-md' : 'bg-white/10 text-zinc-300'
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                        </div>
                        <span className="text-sm font-bold text-white">{inst.name}</span>
                      </div>
                      {isSelected && (
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-purple-500/30 text-purple-200 border border-purple-400/50">
                          ACTIVE
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-zinc-400 mb-2 leading-relaxed">{inst.description}</p>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {inst.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-white/5 border border-white/5 text-zinc-400"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Tab 2: Studio DSP Effects Rack */}
        {activeTab === 'dsp' && (
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
            {/* Reverb Module */}
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-purple-500/20 text-purple-300 flex items-center justify-center">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider">Acoustic Concert Reverb</h4>
                    <p className="text-[10px] text-zinc-400">Algorithmic Freeverb simulation with decay reflection</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={dspSettings.reverb}
                  onChange={(e) => handleDSPChange({ reverb: e.target.checked })}
                  className="w-4 h-4 accent-purple-500 rounded cursor-pointer"
                />
              </div>
              {dspSettings.reverb && (
                <div className="grid grid-cols-2 gap-4 pt-2 border-t border-white/5">
                  <div>
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="text-zinc-400">Hall Size / Decay</span>
                      <span className="text-purple-300 font-mono">{((dspSettings.reverbDecay ?? 0.7) * 100).toFixed(0)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0.1"
                      max="0.95"
                      step="0.05"
                      value={dspSettings.reverbDecay ?? 0.7}
                      onChange={(e) => handleDSPChange({ reverbDecay: parseFloat(e.target.value) })}
                      className="w-full glass-slider"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="text-zinc-400">HF Dampening</span>
                      <span className="text-purple-300 font-mono">{((dspSettings.reverbDampening ?? 0.3) * 100).toFixed(0)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0.05"
                      max="0.9"
                      step="0.05"
                      value={dspSettings.reverbDampening ?? 0.3}
                      onChange={(e) => handleDSPChange({ reverbDampening: parseFloat(e.target.value) })}
                      className="w-full glass-slider"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Stereo Analog Chorus */}
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-300 flex items-center justify-center">
                    <Waves className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider">Analog Stereo Chorus</h4>
                    <p className="text-[10px] text-zinc-400">Dual modulated delay line for lush acoustic dimension</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={dspSettings.chorus}
                  onChange={(e) => handleDSPChange({ chorus: e.target.checked })}
                  className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                />
              </div>
              {dspSettings.chorus && (
                <div className="grid grid-cols-2 gap-4 pt-2 border-t border-white/5">
                  <div>
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="text-zinc-400">Chorus Rate</span>
                      <span className="text-amber-300 font-mono">{(dspSettings.chorusRate ?? 1.5).toFixed(1)} Hz</span>
                    </div>
                    <input
                      type="range"
                      min="0.2"
                      max="5.0"
                      step="0.2"
                      value={dspSettings.chorusRate ?? 1.5}
                      onChange={(e) => handleDSPChange({ chorusRate: parseFloat(e.target.value) })}
                      className="w-full glass-slider"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="text-zinc-400">Chorus Depth</span>
                      <span className="text-amber-300 font-mono">{(dspSettings.chorusDepth * 100).toFixed(0)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0.1"
                      max="1.0"
                      step="0.05"
                      value={dspSettings.chorusDepth}
                      onChange={(e) => handleDSPChange({ chorusDepth: parseFloat(e.target.value) })}
                      className="w-full glass-slider"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Tape Saturation & Drive */}
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-rose-500/20 text-rose-300 flex items-center justify-center">
                    <Activity className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider">Tape Drive & Saturation</h4>
                    <p className="text-[10px] text-zinc-400">Non-linear soft-clipping analog warmth & harmonics</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={dspSettings.tapeDrive}
                  onChange={(e) => handleDSPChange({ tapeDrive: e.target.checked })}
                  className="w-4 h-4 accent-rose-500 rounded cursor-pointer"
                />
              </div>
              {dspSettings.tapeDrive && (
                <div className="pt-2 border-t border-white/5">
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-zinc-400">Warmth Saturation Amount</span>
                    <span className="text-rose-300 font-mono">{(dspSettings.driveAmount * 100).toFixed(0)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.05"
                    max="0.85"
                    step="0.05"
                    value={dspSettings.driveAmount}
                    onChange={(e) => handleDSPChange({ driveAmount: parseFloat(e.target.value) })}
                    className="w-full glass-slider"
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 3: Concert Pitch & Metronome Studio */}
        {activeTab === 'metronome' && (
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
            {/* Master Concert Pitch Micro-Tuner */}
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-1 flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                <span>Master Concert Pitch Tuning</span>
              </h4>
              <p className="text-[10px] text-zinc-400 mb-3">
                Calculates real-time 12-TET equal temperament reference frequency across all 88 keys.
              </p>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { hz: 440 as ConcertPitch, label: 'A440', sub: 'Standard' },
                  { hz: 432 as ConcertPitch, label: 'A432', sub: 'Verdi / Healing' },
                  { hz: 442 as ConcertPitch, label: 'A442', sub: 'Orchestral' },
                  { hz: 415 as ConcertPitch, label: 'A415', sub: 'Baroque' },
                ].map((item) => (
                  <button
                    key={item.hz}
                    onClick={() => handlePitchChange(item.hz)}
                    className={`p-2.5 rounded-xl border text-center transition-all ${
                      concertPitch === item.hz
                        ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200 shadow-[0_0_15px_rgba(6,182,212,0.35)]'
                        : 'bg-white/5 border-white/10 text-zinc-400 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    <span className="block text-sm font-black font-mono">{item.label}</span>
                    <span className="block text-[9px] text-zinc-500 font-semibold">{item.sub}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Metronome Engine & Pendulum */}
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">Acoustic Pendulum Metronome</h4>
                  <p className="text-[10px] text-zinc-400">Micro-precision Web Audio clock with time signature accents</p>
                </div>
                <LiquidGlassButton
                  onClick={handleToggleMetronome}
                  variant={isRunning ? 'amber' : 'default'}
                  className="!px-3.5 !py-1 text-xs"
                >
                  {isRunning ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current ml-0.5" />}
                  <span>{isRunning ? 'Stop' : 'Start'}</span>
                </LiquidGlassButton>
              </div>

              {/* Pendulum Visual Box */}
              <div className="relative h-20 w-full rounded-xl bg-black/40 border border-white/5 flex items-center justify-center overflow-hidden mb-3">
                <div
                  className="w-1 h-14 bg-gradient-to-t from-cyan-400 to-transparent rounded-full origin-top transition-transform duration-100 ease-out"
                  style={{
                    transform: `rotate(${pendulumAngle}deg)`,
                  }}
                >
                  <div
                    className={`w-3.5 h-3.5 -ml-1.5 mt-10 rounded-full border border-white/40 shadow-lg ${
                      isAccented ? 'bg-amber-400 shadow-[0_0_12px_#f59e0b]' : 'bg-cyan-400 shadow-[0_0_8px_#06b6d4]'
                    }`}
                  />
                </div>

                {/* Beat dots */}
                <div className="absolute bottom-2 flex gap-2">
                  {Array.from({ length: totalBeats }).map((_, i) => (
                    <div
                      key={i}
                      className={`w-2 h-2 rounded-full transition-all ${
                        currentBeat === i && isRunning
                          ? i === 0
                            ? 'bg-amber-400 scale-125 shadow-[0_0_8px_#f59e0b]'
                            : 'bg-cyan-400 scale-125 shadow-[0_0_8px_#06b6d4]'
                          : 'bg-white/20'
                      }`}
                    />
                  ))}
                </div>
              </div>

              {/* BPM Slider & Stepper */}
              <div className="flex items-center gap-3 mb-3">
                <button
                  onClick={() => setBpm((b) => Math.max(30, b - 5))}
                  className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-300"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <div className="flex-1">
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-zinc-400">Tempo (BPM)</span>
                    <span className="text-amber-300 font-mono font-bold text-xs">{bpm} BPM</span>
                  </div>
                  <input
                    type="range"
                    min="40"
                    max="240"
                    step="1"
                    value={bpm}
                    onChange={(e) => setBpm(parseInt(e.target.value, 10))}
                    className="w-full glass-slider"
                  />
                </div>
                <button
                  onClick={() => setBpm((b) => Math.min(240, b + 5))}
                  className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-300"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Time Signatures */}
              <div className="flex items-center justify-between pt-2 border-t border-white/5 text-xs">
                <span className="text-zinc-400 text-[11px]">Time Signature</span>
                <div className="flex gap-1.5">
                  {(['4/4', '3/4', '6/8'] as MetronomeTimeSignature[]).map((sig) => (
                    <button
                      key={sig}
                      onClick={() => setTimeSignature(sig)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all ${
                        timeSignature === sig
                          ? 'bg-cyan-500/25 border border-cyan-400 text-cyan-200'
                          : 'bg-white/5 text-zinc-400 hover:text-white'
                      }`}
                    >
                      {sig}
                    </button>
                  ))}
                </div>
              </div>

              {/* Metronome Volume */}
              <div className="flex items-center gap-2 pt-2 border-t border-white/5 text-xs">
                <button
                  onClick={() => setVolume((v) => (v > 0 ? 0 : 0.8))}
                  className="text-zinc-400 hover:text-white p-1 rounded"
                  title="Toggle Metronome Mute"
                >
                  {volume > 0 ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5 text-zinc-500" />}
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={volume}
                  onChange={(e) => setVolume(parseFloat(e.target.value))}
                  className="flex-1 glass-slider"
                />
                <span className="text-[10px] font-mono text-zinc-400 w-8 text-right">
                  {Math.round(volume * 100)}%
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
