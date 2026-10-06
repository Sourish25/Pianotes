import React, { useState, useRef } from 'react';

/**
 * Optical SVG filters providing chromatic dispersion and gel refraction
 */
export const LiquidGlassSVGDefs: React.FC = () => {
  return (
    <svg style={{ position: 'absolute', width: 0, height: 0, pointerEvents: 'none' }} aria-hidden="true">
      <defs>
        {/* Dynamic gel displacement for tap/drag bending */}
        <filter id="apple-liquid-disp" x="-20%" y="-20%" width="140%" height="140%">
          <feTurbulence type="fractalNoise" baseFrequency="0.05 0.05" numOctaves="2" result="noise" />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="4" xChannelSelector="R" yChannelSelector="G" />
        </filter>

        {/* Multi-pass Chromatic Aberration Prism Filter */}
        <filter id="liquid-chromatic" x="-10%" y="-10%" width="120%" height="120%">
          <feColorMatrix
            in="SourceGraphic"
            type="matrix"
            values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0"
            result="red"
          />
          <feOffset in="red" dx="1.6" dy="0" result="redShift" />
          <feColorMatrix
            in="SourceGraphic"
            type="matrix"
            values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0"
            result="green"
          />
          <feColorMatrix
            in="SourceGraphic"
            type="matrix"
            values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0"
            result="blue"
          />
          <feOffset in="blue" dx="-1.6" dy="0" result="blueShift" />
          <feBlend mode="screen" in="redShift" in2="green" result="rg" />
          <feBlend mode="screen" in="rg" in2="blueShift" result="chroma" />
        </filter>
      </defs>
    </svg>
  );
};

interface LiquidGlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  enableGelPhysics?: boolean;
}

export const LiquidGlassCard: React.FC<LiquidGlassCardProps> = ({
  children,
  className = '',
  enableGelPhysics = true,
  style,
  ...props
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<{ x: number; y: number; angle: number }>({ x: 50, y: 50, angle: 135 });
  const [isPressing, setIsPressing] = useState(false);
  const [springScale, setSpringScale] = useState(1);

  // Mouse / pointer movement for dynamic specular sheen
  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    // Calculate light vector angle from center
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const angleRad = Math.atan2(e.clientY - centerY, e.clientX - centerX);
    const angleDeg = ((angleRad * 180) / Math.PI + 360) % 360;

    setCoords({ x, y, angle: angleDeg });
  };

  const handlePointerDown = () => {
    if (!enableGelPhysics) return;
    setIsPressing(true);
    setSpringScale(0.98);
  };

  const handlePointerUp = () => {
    if (!enableGelPhysics) return;
    setIsPressing(false);
    // Elastic spring release
    setSpringScale(1.015);
    setTimeout(() => setSpringScale(1), 200);
  };

  return (
    <div
      ref={cardRef}
      onPointerMove={handlePointerMove}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={() => {
        setIsPressing(false);
        setSpringScale(1);
      }}
      className={`liquid-glass ${isPressing ? 'liquid-gel-active' : ''} ${className}`}
      style={{
        ...style,
        ['--mouse-x' as string]: `${coords.x}%`,
        ['--mouse-y' as string]: `${coords.y}%`,
        ['--sheen-angle' as string]: `${coords.angle}deg`,
        transform: `scale(${springScale}) ${isPressing ? 'translateY(1px)' : ''}`,
      }}
      {...props}
    >
      <div className="liquid-glass-sheen" />
      {children}
    </div>
  );
};

interface LiquidGlassButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: 'default' | 'violet' | 'amber' | 'ghost';
  active?: boolean;
}

export const LiquidGlassButton: React.FC<LiquidGlassButtonProps> = ({
  children,
  variant = 'default',
  active = false,
  className = '',
  onClick,
  ...props
}) => {
  const btnRef = useRef<HTMLButtonElement>(null);
  const [sheenCoords, setSheenCoords] = useState<{ x: number; y: number }>({ x: 50, y: 50 });
  const [gelScale, setGelScale] = useState(1);

  const handlePointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setSheenCoords({ x, y });
  };

  const handlePointerDown = () => {
    setGelScale(0.93);
  };

  const handlePointerUp = () => {
    setGelScale(1.04);
    setTimeout(() => setGelScale(1), 180);
  };

  let variantClass = '';
  if (active) {
    if (variant === 'violet') variantClass = 'lh-badge';
    else if (variant === 'amber') variantClass = 'rh-badge';
    else variantClass = 'bg-white/20 border-white/40 shadow-[0_0_16px_rgba(255,255,255,0.25)]';
  } else {
    if (variant === 'violet') variantClass = 'text-purple-300 hover:text-purple-100 hover:border-purple-400/40';
    if (variant === 'amber') variantClass = 'text-amber-300 hover:text-amber-100 hover:border-amber-400/40';
  }

  return (
    <button
      ref={btnRef}
      onPointerMove={handlePointerMove}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={() => setGelScale(1)}
      onClick={onClick}
      className={`liquid-glass-btn ${variantClass} ${className}`}
      style={{
        transform: `scale(${gelScale})`,
        ['--mouse-x' as string]: `${sheenCoords.x}%`,
        ['--mouse-y' as string]: `${sheenCoords.y}%`,
      }}
      {...props}
    >
      <div className="liquid-glass-sheen" />
      {children}
    </button>
  );
};
