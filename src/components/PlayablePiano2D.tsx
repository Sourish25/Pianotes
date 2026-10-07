import React, { useState, useEffect, useRef, useCallback } from 'react';
import { pianoEngine } from '../audio/PianoEngine';
import { isBlackKey, midiToNoteName } from '../utils/chordDetector';
import { triggerHaptic } from '../utils/haptics';
import { calculateKeyTouchVelocity } from '../utils/touchVelocity';
import { Disc, ChevronLeft, ChevronRight, Tag } from 'lucide-react';

export interface ActiveKeyInfo {
  pitch: number;
  hand?: 'left' | 'right' | 'user';
}

export interface PlayablePiano2DProps {
  activeKeys?: number[] | ActiveKeyInfo[];
  onUserPlayKey?: (midi: number, velocity?: number) => void;
  onUserReleaseKey?: (midi: number) => void;
  sustainPedal: boolean;
  onToggleSustain: () => void;
  isFullPiano?: boolean;
  centerControls?: React.ReactNode;
}

export const PlayablePiano2D: React.FC<PlayablePiano2DProps> = ({
  activeKeys = [],
  onUserPlayKey,
  onUserReleaseKey,
  sustainPedal,
  onToggleSustain,
  isFullPiano = false,
  centerControls,
}) => {
  const keyboardViewportRef = useRef<HTMLDivElement>(null);
  const miniViewportRef = useRef<HTMLDivElement>(null);
  const [pressedKeys, setPressedKeys] = useState<Set<number>>(new Set());
  const [showNoteLabels, setShowNoteLabels] = useState(true);

  // Multi-Touch Polyphony Pointer Map: pointerId -> midiPitch
  const pointerMapRef = useRef<Map<number, number>>(new Map());

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

  const [currentOctave, setCurrentOctave] = useState<number>(4);

  // Handle Note Trigger & Release with Touch Velocity Sensitivity
  const handleNoteStart = useCallback(
    (midi: number, velocity: number = 0.85) => {
      triggerHaptic('key');
      pianoEngine.playNote(midi, velocity);
      setPressedKeys((prev) => new Set(prev).add(midi));
      if (onUserPlayKey) onUserPlayKey(midi, velocity);
    },
    [onUserPlayKey]
  );

  const handleNoteEnd = useCallback(
    (midi: number) => {
      pianoEngine.stopNote(midi);
      setPressedKeys((prev) => {
        const next = new Set(prev);
        next.delete(midi);
        return next;
      });
      if (onUserReleaseKey) onUserReleaseKey(midi);
    },
    [onUserReleaseKey]
  );

  // Global window pointer listeners to guarantee zero stuck notes if finger lifts off-screen
  useEffect(() => {
    const handleGlobalPointerUp = (e: PointerEvent) => {
      if (pointerMapRef.current.has(e.pointerId)) {
        const pitch = pointerMapRef.current.get(e.pointerId);
        pointerMapRef.current.delete(e.pointerId);
        if (pitch !== undefined && pitch !== -1) {
          const stillHeld = Array.from(pointerMapRef.current.values()).includes(pitch);
          if (!stillHeld) {
            handleNoteEnd(pitch);
          }
        }
      }
    };
    window.addEventListener('pointerup', handleGlobalPointerUp);
    window.addEventListener('pointercancel', handleGlobalPointerUp);
    return () => {
      window.removeEventListener('pointerup', handleGlobalPointerUp);
      window.removeEventListener('pointercancel', handleGlobalPointerUp);
    };
  }, [handleNoteEnd]);

  // Per-finger pointer event handlers with vertical velocity sensitivity
  const handleKeyPointerDown = useCallback(
    (e: React.PointerEvent, midi: number) => {
      e.preventDefault();
      try {
        const el = e.currentTarget as HTMLElement;
        if (el?.hasPointerCapture?.(e.pointerId)) {
          el.releasePointerCapture(e.pointerId);
        }
      } catch {
        // Ignore releasePointerCapture errors
      }

      const prevPitch = pointerMapRef.current.get(e.pointerId);
      if (prevPitch !== undefined && prevPitch !== midi && prevPitch !== -1) {
        const stillHeld = Array.from(pointerMapRef.current.entries()).some(
          ([id, p]) => id !== e.pointerId && p === prevPitch
        );
        if (!stillHeld) {
          handleNoteEnd(prevPitch);
        }
      }

      const targetEl = e.currentTarget as HTMLElement;
      const rect = targetEl.getBoundingClientRect();
      const velocity = calculateKeyTouchVelocity(e.clientY, rect.top, rect.height);

      pointerMapRef.current.set(e.pointerId, midi);
      handleNoteStart(midi, velocity);
    },
    [handleNoteStart, handleNoteEnd]
  );

  const handleKeyPointerUp = useCallback(
    (e: React.PointerEvent, midi: number) => {
      e.preventDefault();
      const currentPitch = pointerMapRef.current.get(e.pointerId) ?? midi;
      pointerMapRef.current.delete(e.pointerId);

      if (currentPitch !== -1) {
        const stillHeld = Array.from(pointerMapRef.current.values()).includes(currentPitch);
        if (!stillHeld) {
          handleNoteEnd(currentPitch);
        }
      }
    },
    [handleNoteEnd]
  );

  const handleKeyPointerEnter = useCallback(
    (e: React.PointerEvent, midi: number) => {
      if (pointerMapRef.current.has(e.pointerId)) {
        e.preventDefault();
        const prevPitch = pointerMapRef.current.get(e.pointerId);
        if (prevPitch !== midi) {
          pointerMapRef.current.set(e.pointerId, midi);
          if (prevPitch !== undefined && prevPitch !== -1) {
            const stillHeld = Array.from(pointerMapRef.current.values()).includes(prevPitch);
            if (!stillHeld) {
              handleNoteEnd(prevPitch);
            }
          }
          const targetEl = e.currentTarget as HTMLElement;
          const rect = targetEl.getBoundingClientRect();
          const velocity = calculateKeyTouchVelocity(e.clientY, rect.top, rect.height);
          handleNoteStart(midi, velocity);
        }
      }
    },
    [handleNoteStart, handleNoteEnd]
  );

  // Touch & Pointer glissando tracker for smooth sliding across piano keys
  const handleViewportPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!pointerMapRef.current.has(e.pointerId)) return;
      const el = document.elementFromPoint(e.clientX, e.clientY);
      const keyEl = el?.closest('[data-midi]');
      const midiAttr = keyEl?.getAttribute('data-midi');
      if (midiAttr) {
        const targetMidi = parseInt(midiAttr, 10);
        const prevPitch = pointerMapRef.current.get(e.pointerId);
        if (prevPitch !== undefined && prevPitch !== targetMidi) {
          pointerMapRef.current.set(e.pointerId, targetMidi);
          if (prevPitch !== -1) {
            const stillHeld = Array.from(pointerMapRef.current.values()).includes(prevPitch);
            if (!stillHeld) {
              handleNoteEnd(prevPitch);
            }
          }
          const rect = (keyEl as HTMLElement).getBoundingClientRect();
          const velocity = calculateKeyTouchVelocity(e.clientY, rect.top, rect.height);
          handleNoteStart(targetMidi, velocity);
        }
      }
    },
    [handleNoteStart, handleNoteEnd]
  );

  // Jump smoothly to a specific octave (C1 to C7)
  const scrollToOctave = useCallback((octave: number) => {
    triggerHaptic('light');
    const clamped = Math.max(1, Math.min(7, octave));
    setCurrentOctave(clamped);
    const targetMidi = 12 + clamped * 12; // C1=24, C2=36, C3=48, C4=60, C5=72, C6=84, C7=96
    const el = keyboardViewportRef.current;
    if (!el) return;
    const keyEl = el.querySelector(`[data-midi="${targetMidi}"]`) as HTMLElement;
    if (keyEl) {
      const targetScroll = keyEl.offsetLeft - el.clientWidth / 2 + keyEl.clientWidth / 2;
      el.scrollTo({ left: Math.max(0, targetScroll), behavior: 'smooth' });
    }
  }, []);

  // Keyboard shortcut for sustain pedal (Spacebar)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat && document.activeElement?.tagName !== 'INPUT') {
        e.preventDefault();
        triggerHaptic('medium');
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
    <div className={`piano-wrapper ${isFullPiano ? 'piano-wrapper-full' : ''}`}>
      {/* Sleek Minimal Octave & Sustain Ribbon with 36px+ Touch Targets & Safe Area Insets */}
      <div
        className="flex items-center justify-between px-3 py-1 bg-[#080910] border-b border-white/10 text-xs select-none"
        style={{
          paddingLeft: 'max(12px, env(safe-area-inset-left, 12px))',
          paddingRight: 'max(12px, env(safe-area-inset-right, 12px))',
        }}
      >
        {/* Expanded Octave Switcher (min 36px touch targets) */}
        <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-white/5 border border-white/10">
          <span className="text-[10px] text-zinc-500 font-bold px-1 hidden sm:inline">OCTAVE</span>
          <button
            onClick={() => scrollToOctave(currentOctave - 1)}
            disabled={currentOctave <= 1}
            className="w-9 h-9 min-w-[36px] min-h-[36px] rounded-full flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 disabled:opacity-25 transition-all"
            title="Previous Octave"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          {[1, 2, 3, 4, 5, 6, 7].map((oct) => (
            <button
              key={oct}
              onClick={() => scrollToOctave(oct)}
              className={`w-9 h-9 min-w-[36px] min-h-[36px] rounded-full flex items-center justify-center text-xs font-mono font-bold transition-all ${
                currentOctave === oct
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-600/40'
                  : 'text-zinc-400 hover:text-white hover:bg-white/10'
              }`}
            >
              C{oct}
            </button>
          ))}
          <button
            onClick={() => scrollToOctave(currentOctave + 1)}
            disabled={currentOctave >= 7}
            className="w-9 h-9 min-w-[36px] min-h-[36px] rounded-full flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 disabled:opacity-25 transition-all"
            title="Next Octave"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Center: Integrated Transport Controls (Zero Piano Key Occlusion) */}
        {centerControls && (
          <div className="flex items-center justify-center pointer-events-auto mx-2">
            {centerControls}
          </div>
        )}

        {/* Right: Sustain Pedal Pill & Labels */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              triggerHaptic('light');
              setShowNoteLabels(!showNoteLabels);
            }}
            className={`flex items-center gap-1.5 px-3 min-h-[36px] rounded-full text-xs font-semibold transition-all border ${
              showNoteLabels
                ? 'bg-purple-600/25 border-purple-400/50 text-purple-200'
                : 'bg-white/5 border-white/10 text-zinc-400 hover:text-white hover:bg-white/10'
            }`}
          >
            <Tag className="w-3.5 h-3.5" />
            <span>Labels</span>
          </button>

          <button
            onClick={() => {
              triggerHaptic('medium');
              onToggleSustain();
            }}
            className={`flex items-center gap-1.5 px-3.5 min-h-[36px] rounded-full text-xs font-bold tracking-wider uppercase transition-all shadow-md border ${
              sustainPedal
                ? 'bg-amber-500 text-black border-amber-300 shadow-[0_0_14px_rgba(245,158,11,0.6)] animate-pulse'
                : 'bg-white/5 text-zinc-400 border-white/10 hover:text-white hover:bg-white/10'
            }`}
          >
            <Disc className={`w-3.5 h-3.5 ${sustainPedal ? 'rotate-90 text-black' : 'text-zinc-500'}`} />
            <span>Sustain {sustainPedal ? 'ON' : 'OFF'}</span>
          </button>
        </div>
      </div>

      {/* Red Damper Strip */}
      <div className="piano-felt-strip" />

      {/* Octave Navigator Mini-map */}
      <div
        className="octave-navigator"
        style={{
          paddingLeft: 'max(12px, env(safe-area-inset-left, 12px))',
          paddingRight: 'max(12px, env(safe-area-inset-right, 12px))',
        }}
      >
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
        onPointerMove={handleViewportPointerMove}
        onPointerLeave={(e) => {
          if (pointerMapRef.current.has(e.pointerId)) {
            const pitch = pointerMapRef.current.get(e.pointerId);
            pointerMapRef.current.delete(e.pointerId);
            if (pitch !== undefined && pitch !== -1) {
              const stillHeld = Array.from(pointerMapRef.current.values()).includes(pitch);
              if (!stillHeld) {
                handleNoteEnd(pitch);
              }
            }
          }
        }}
      >
        <div
          className="keyboard-keys-container"
          style={{
            paddingLeft: 'max(16px, env(safe-area-inset-left, 16px))',
            paddingRight: 'max(16px, env(safe-area-inset-right, 16px))',
          }}
        >
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
                  onPointerDown={(e) => handleKeyPointerDown(e, wk.midi)}
                  onPointerUp={(e) => handleKeyPointerUp(e, wk.midi)}
                  onPointerEnter={(e) => handleKeyPointerEnter(e, wk.midi)}
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
                      handleKeyPointerDown(e, nextKey.midi);
                    }}
                    onPointerUp={(e) => {
                      e.stopPropagation();
                      handleKeyPointerUp(e, nextKey.midi);
                    }}
                    onPointerEnter={(e) => {
                      e.stopPropagation();
                      handleKeyPointerEnter(e, nextKey.midi);
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
