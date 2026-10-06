import React, { useState, useEffect, useRef, useCallback } from 'react';
import { pianoEngine } from '../audio/PianoEngine';
import { isBlackKey, midiToNoteName } from '../utils/chordDetector';
import { Music, Disc } from 'lucide-react';

export interface ActiveKeyInfo {
  pitch: number;
  hand?: 'left' | 'right' | 'user';
}

interface PlayablePiano2DProps {
  activeKeys?: number[] | ActiveKeyInfo[];
  onUserPlayKey?: (midi: number) => void;
  sustainPedal: boolean;
  onToggleSustain: () => void;
}

export const PlayablePiano2D: React.FC<PlayablePiano2DProps> = ({
  activeKeys = [],
  onUserPlayKey,
  sustainPedal,
  onToggleSustain,
}) => {
  const keyboardViewportRef = useRef<HTMLDivElement>(null);
  const miniViewportRef = useRef<HTMLDivElement>(null);
  const [pressedKeys, setPressedKeys] = useState<Set<number>>(new Set());
  const [isPointerDown, setIsPointerDown] = useState(false);
  const [showNoteLabels, setShowNoteLabels] = useState(true);

  // Map activeKeys into a lookup map: midi -> hand
  const activeKeysMap = React.useMemo(() => {
    const map = new Map<number, 'left' | 'right' | 'user'>();
    if (Array.isArray(activeKeys)) {
      activeKeys.forEach((item) => {
        if (typeof item === 'number') {
          map.set(item, item < 60 ? 'left' : 'right');
        } else if (item && typeof item === 'object') {
          map.set(item.pitch, item.hand || (item.pitch < 60 ? 'left' : 'right'));
        }
      });
    }
    return map;
  }, [activeKeys]);

  // 88 Piano keys: MIDI 21 (A0) to 108 (C8)
  const MIN_MIDI = 21;
  const MAX_MIDI = 108;

  // Split into white keys and black keys positions
  const keysData = React.useMemo(() => {
    const list: { midi: number; isBlack: boolean; name: string }[] = [];
    for (let m = MIN_MIDI; m <= MAX_MIDI; m++) {
      list.push({
        midi: m,
        isBlack: isBlackKey(m),
        name: midiToNoteName(m),
      });
    }
    return list;
  }, []);

  const whiteKeys = React.useMemo(() => keysData.filter((k) => !k.isBlack), [keysData]);

  // Center keyboard view initially around Middle C (C4 = 60)
  useEffect(() => {
    if (keyboardViewportRef.current) {
      const el = keyboardViewportRef.current;
      const scrollTarget = (el.scrollWidth - el.clientWidth) * 0.44;
      el.scrollLeft = scrollTarget;
    }
  }, []);

  // Sync Mini-map viewport box position with main keyboard scroll
  const handleScroll = useCallback(() => {
    if (!keyboardViewportRef.current || !miniViewportRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = keyboardViewportRef.current;
    const ratio = scrollWidth > clientWidth ? scrollLeft / (scrollWidth - clientWidth) : 0;
    const visibleWidthRatio = clientWidth / scrollWidth;

    const miniBox = miniViewportRef.current;
    const boxWidth = Math.max(12, visibleWidthRatio * 100);
    const boxLeft = ratio * (100 - boxWidth);

    miniBox.style.width = `${boxWidth}%`;
    miniBox.style.left = `${boxLeft}%`;
  }, []);

  useEffect(() => {
    const vp = keyboardViewportRef.current;
    if (!vp) return;
    vp.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => vp.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  // Handle Note Trigger & Release
  const handleNoteStart = useCallback((midi: number) => {
    pianoEngine.playNote(midi, 0.85);
    setPressedKeys((prev) => new Set(prev).add(midi));
    if (onUserPlayKey) onUserPlayKey(midi);
  }, [onUserPlayKey]);

  const handleNoteEnd = useCallback((midi: number) => {
    pianoEngine.stopNote(midi);
    setPressedKeys((prev) => {
      const next = new Set(prev);
      next.delete(midi);
      return next;
    });
  }, []);

  // Keyboard shortcut for sustain pedal (Spacebar)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat && document.activeElement?.tagName !== 'INPUT') {
        e.preventDefault();
        onToggleSustain();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onToggleSustain]);

  // Mini-map drag navigation
  const handleMiniMapClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!keyboardViewportRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickRatio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const vp = keyboardViewportRef.current;
    vp.scrollLeft = (vp.scrollWidth - vp.clientWidth) * clickRatio;
  };

  // Helper for determining key hand color
  const getKeyHandClass = (midi: number, isActive: boolean) => {
    if (!isActive) return '';
    const hand = activeKeysMap.get(midi);
    if (hand === 'left') return 'lh-active';
    if (hand === 'right') return 'rh-active';
    return midi < 60 ? 'lh-active' : 'rh-active';
  };

  return (
    <div className="piano-wrapper">
      {/* Top Header Control Ribbon */}
      <div className="flex items-center justify-between px-6 py-2.5 bg-[#090a10] border-b border-white/10 text-xs">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-zinc-300 font-semibold tracking-wide uppercase text-[11px]">
            <Music className="w-3.5 h-3.5 text-purple-400" />
            <span>Interactive 88-Key Concert Keyboard</span>
          </div>
          <span className="text-zinc-500">|</span>
          <span className="text-zinc-400">Click & Drag Glissando Enabled</span>
        </div>

        <div className="flex items-center gap-3">
          {/* Note Labels Toggle */}
          <button
            onClick={() => setShowNoteLabels(!showNoteLabels)}
            className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-all ${
              showNoteLabels
                ? 'bg-purple-600/30 text-purple-300 border border-purple-500/40'
                : 'bg-white/5 text-zinc-400 border border-white/10'
            }`}
          >
            Labels: {showNoteLabels ? 'On' : 'Off'}
          </button>

          {/* Sustain Pedal Button */}
          <button
            onClick={onToggleSustain}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold tracking-wider uppercase transition-all shadow-md ${
              sustainPedal
                ? 'bg-amber-500 text-black border border-amber-300 shadow-[0_0_14px_rgba(245,158,11,0.6)] animate-pulse'
                : 'bg-zinc-800 text-zinc-400 border border-zinc-700 hover:text-white'
            }`}
          >
            <Disc className={`w-3 h-3 ${sustainPedal ? 'rotate-90 text-black' : 'text-zinc-500'}`} />
            <span>Sustain Pedal: {sustainPedal ? 'DOWN [Space]' : 'UP'}</span>
          </button>
        </div>
      </div>

      {/* Red Damper Strip */}
      <div className="piano-felt-strip" />

      {/* Octave Navigator Mini-map */}
      <div className="octave-navigator">
        <div
          className="mini-keyboard-preview cursor-pointer"
          onClick={handleMiniMapClick}
        >
          {keysData.map((k) => {
            const isActive = activeKeysMap.has(k.midi) || pressedKeys.has(k.midi);
            const hand = activeKeysMap.get(k.midi) || (k.midi < 60 ? 'left' : 'right');
            return (
              <div
                key={k.midi}
                className={`flex-1 h-full ${
                  k.isBlack ? 'bg-zinc-800' : 'bg-zinc-200'
                } ${
                  isActive
                    ? hand === 'left'
                      ? 'bg-purple-500 !opacity-100 shadow-[0_0_6px_#a855f7]'
                      : 'bg-amber-400 !opacity-100 shadow-[0_0_6px_#f59e0b]'
                    : 'opacity-70'
                }`}
              />
            );
          })}
          {/* Draggable Viewport Focus Box */}
          <div ref={miniViewportRef} className="mini-viewport-box" />
        </div>
      </div>

      {/* Main 2D Scrollable Playable Keyboard */}
      <div
        ref={keyboardViewportRef}
        className="keyboard-viewport"
        onPointerDown={() => setIsPointerDown(true)}
        onPointerUp={() => {
          setIsPointerDown(false);
          pressedKeys.forEach((m) => handleNoteEnd(m));
        }}
        onPointerLeave={() => {
          setIsPointerDown(false);
          pressedKeys.forEach((m) => handleNoteEnd(m));
        }}
      >
        <div className="keyboard-keys-container">
          {whiteKeys.map((wk) => {
            const isWhiteActive = activeKeysMap.has(wk.midi) || pressedKeys.has(wk.midi);
            const whiteHandClass = getKeyHandClass(wk.midi, isWhiteActive);

            // Find if there is a black key directly following this white key
            const nextKey = keysData.find((k) => k.midi === wk.midi + 1);
            const hasBlackKey = Boolean(nextKey && nextKey.isBlack);
            const isBlackActive = Boolean(hasBlackKey && nextKey && (activeKeysMap.has(nextKey.midi) || pressedKeys.has(nextKey.midi)));
            const blackHandClass = hasBlackKey && nextKey ? getKeyHandClass(nextKey.midi, isBlackActive) : '';

            return (
              <div key={wk.midi} className="relative flex">
                {/* White Key */}
                <div
                  data-midi={wk.midi}
                  onPointerDown={(e) => {
                    e.preventDefault();
                    (e.target as HTMLElement)?.releasePointerCapture?.(e.pointerId);
                    handleNoteStart(wk.midi);
                  }}
                  onPointerUp={(e) => {
                    e.preventDefault();
                    handleNoteEnd(wk.midi);
                  }}
                  onPointerEnter={(e) => {
                    if (isPointerDown) {
                      e.preventDefault();
                      handleNoteStart(wk.midi);
                    }
                  }}
                  onPointerLeave={(e) => {
                    if (isPointerDown) {
                      e.preventDefault();
                      handleNoteEnd(wk.midi);
                    }
                  }}
                  className={`white-key ${isWhiteActive ? 'active-key' : ''} ${whiteHandClass}`}
                >
                  <div className="key-led-indicator" />
                  {showNoteLabels && (
                    <span className="select-none tracking-tight">
                      {wk.name}
                    </span>
                  )}
                </div>

                {/* Overlaid Black Key */}
                {hasBlackKey && nextKey && (
                  <div
                    data-midi={nextKey.midi}
                    style={{ left: 30 }}
                    onPointerDown={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      (e.target as HTMLElement)?.releasePointerCapture?.(e.pointerId);
                      handleNoteStart(nextKey.midi);
                    }}
                    onPointerUp={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      handleNoteEnd(nextKey.midi);
                    }}
                    onPointerEnter={(e) => {
                      if (isPointerDown) {
                        e.stopPropagation();
                        e.preventDefault();
                        handleNoteStart(nextKey.midi);
                      }
                    }}
                    onPointerLeave={(e) => {
                      if (isPointerDown) {
                        e.stopPropagation();
                        e.preventDefault();
                        handleNoteEnd(nextKey.midi);
                      }
                    }}
                    className={`black-key ${isBlackActive ? 'active-key' : ''} ${blackHandClass}`}
                  >
                    <div className="key-led-indicator" />
                    {showNoteLabels && (
                      <span className="text-[9px] text-zinc-400 select-none">
                        {nextKey.name.replace(/\d/, '')}
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
