import React from 'react';
import type { InstrumentType } from '../types';
import { pianoEngine } from '../audio/PianoEngine';
import { LiquidGlassCard } from './LiquidGlass';
import { Music, Radio, Sparkles, Sliders, Waves, Disc } from 'lucide-react';

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
    category: 'Acoustic Steinway Model D',
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
    id: 'neo-rhodes',
    name: 'Neo-Soul Rhodes',
    category: 'Electric Tine Mark I',
    icon: Waves,
    description: 'Signature metallic chime tine with warm body harmonics, gentle stereo tremolo vibrato, and vintage soul saturation.',
    tags: ['Electric Tine', 'Tremolo', 'R&B / Soul'],
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
];

export const InstrumentSelector: React.FC<InstrumentSelectorProps> = ({
  currentInstrument,
  onSelectInstrument,
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  const handleSelect = (inst: InstrumentType) => {
    pianoEngine.setInstrument(inst);
    onSelectInstrument(inst);
    // Audition chime note (C5 = 72)
    pianoEngine.playNote(72, 0.9);
    setTimeout(() => pianoEngine.stopNote(72), 600);
  };

  return (
    <div className="liquid-sheet-overlay" onClick={onClose}>
      <div
        className="liquid-sheet"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '640px' }}
      >
        <div className="sheet-handle" onClick={onClose} />

        <div className="flex items-center justify-between pb-4 mb-4 border-b border-white/10">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-400" />
              <span>Acoustic & Electric Instruments</span>
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Select synthesis engine profile. Changes apply instantly in real time.
            </p>
          </div>
          <button
            onClick={onClose}
            className="px-3 py-1 rounded-full text-xs font-medium text-zinc-400 hover:text-white bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
          >
            Done
          </button>
        </div>

        {/* Instruments Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 mt-2">
          {INSTRUMENTS.map((inst) => {
            const isSelected = currentInstrument === inst.id;
            const Icon = inst.icon;

            return (
              <LiquidGlassCard
                key={inst.id}
                onClick={() => handleSelect(inst.id)}
                className={`p-4 cursor-pointer transition-all border ${
                  isSelected
                    ? 'border-amber-400/80 bg-amber-500/10 shadow-[0_0_24px_rgba(245,158,11,0.25)]'
                    : 'border-white/10 hover:border-white/25 hover:bg-white/5'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`p-2.5 rounded-xl border ${
                      isSelected
                        ? 'bg-amber-400 text-black border-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.5)]'
                        : 'bg-white/10 text-white border-white/15'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-white tracking-tight truncate">
                        {inst.name}
                      </h3>
                      {isSelected && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-400 text-black">
                          ACTIVE
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-zinc-400 font-medium">
                      {inst.category}
                    </p>
                    <p className="text-xs text-zinc-300/80 mt-1 line-clamp-2 leading-relaxed">
                      {inst.description}
                    </p>

                    <div className="flex flex-wrap gap-1.5 mt-2.5">
                      {inst.tags.map((tag) => (
                        <span
                          key={tag}
                          className="px-2 py-0.5 rounded-md text-[10px] bg-white/5 border border-white/10 text-zinc-300"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </LiquidGlassCard>
            );
          })}
        </div>
      </div>
    </div>
  );
};
