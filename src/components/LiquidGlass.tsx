import React, { useState, useRef, useCallback } from 'react';

/**
 * Optical SVG filters providing chromatic dispersion and gel refraction
 */
export const LiquidGlassSVGDefs: React.FC = () => {
  return (
    <svg style={{ position: 'absolute', width: 0, height: 0, pointerEvents: 'none' }} aria-hidden="true">
      <defs>
        {/* Dynamic gel displacement for tap/drag bending */}
        <filter id="apple-liquid-disp" x="-20%" y="-20%" width="140%" height="140%">
          <feTurbulence type="fractalNoise" baseFrequency="0.04 0.04" numOctaves="2" result="noise" />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="3" xChannelSelector="R" yChannelSelector="G" />
        </filter>

        {/* Multi-pass Chromatic Aberration Prism Filter */}
        <filter id="apple-chromatic-prism" x="-10%" y="-10%" width="120%" height="120%">
          <feColorMatrix
            in="SourceGraphic"
            type="matrix"
            values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0"
            result="red"
          />
          <feOffset in="red" dx="1.8" dy="0" result="redShift" />
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
          <feOffset in="blue" dx="-1.8" dy="0" result="blueShift" />
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
  const [tilt, setTilt] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Mouse / pointer movement for dynamic specular sheen and incident angle
  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));

    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const angleRad = Math.atan2(e.clientY - centerY, e.clientX - centerX);
    const angleDeg = ((angleRad * 180) / Math.PI + 360) % 360;

    setCoords({ x, y, angle: angleDeg });

    if (enableGelPhysics && isPressing) {
      // Dynamic 3D tilt towards touch/click point
      setTilt({
        x: ((y - 50) / 50) * -5,
        y: ((x - 50) / 50) * 5,
      });
    }
  }, [enableGelPhysics, isPressing]);

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!enableGelPhysics || !cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setIsPressing(true);
    setTilt({
      x: ((y - 50) / 50) * -5,
      y: ((x - 50) / 50) * 5,
    });
    setSpringScale(0.975);
  }, [enableGelPhysics]);

  const handlePointerUp = useCallback(() => {
    if (!enableGelPhysics) return;
    setIsPressing(false);
    setTilt({ x: 0, y: 0 });
    // Hooke's law spring recoil
    setSpringScale(1.02);
    setTimeout(() => setSpringScale(1), 220);
  }, [enableGelPhysics]);

  const transformStyle = enableGelPhysics
    ? `perspective(800px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) scale3d(${springScale}, ${springScale}, ${springScale}) ${
        isPressing ? 'translateZ(-6px)' : 'translateZ(0px)'
      }`
    : `scale(${springScale})`;

  return (
    <div
      ref={cardRef}
      onPointerMove={handlePointerMove}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={() => {
        setIsPressing(false);
        setTilt({ x: 0, y: 0 });
        setSpringScale(1);
      }}
      className={`liquid-glass ${isPressing ? 'liquid-gel-active' : ''} ${className}`}
      style={{
        ...style,
        ['--mouse-x' as string]: `${coords.x}%`,
        ['--mouse-y' as string]: `${coords.y}%`,
        ['--sheen-angle' as string]: `${coords.angle}deg`,
        transform: transformStyle,
      }}
      {...props}
    >
      <div className="liquid-glass-sheen" />
      <div className="liquid-prism-edge" />
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
  const [sheenCoords, setSheenCoords] = useState<{ x: number; y: number; angle: number }>({ x: 50, y: 50, angle: 135 });
  const [isPressing, setIsPressing] = useState(false);
  const [gelScale, setGelScale] = useState(1);
  const [tilt, setTilt] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLButtonElement>) => {
    if (!btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));

    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const angleRad = Math.atan2(e.clientY - centerY, e.clientX - centerX);
    const angleDeg = ((angleRad * 180) / Math.PI + 360) % 360;

    setSheenCoords({ x, y, angle: angleDeg });
  }, []);

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLButtonElement>) => {
    if (!btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setIsPressing(true);
    setTilt({
      x: ((y - 50) / 50) * -6,
      y: ((x - 50) / 50) * 6,
    });
    setGelScale(0.93);
  }, []);

  const handlePointerUp = useCallback(() => {
    setIsPressing(false);
    setTilt({ x: 0, y: 0 });
    // Spring bounce
    setGelScale(1.045);
    setTimeout(() => setGelScale(1), 200);
  }, []);

  let variantClass = '';
  if (active) {
    if (variant === 'violet') variantClass = 'lh-badge';
    else if (variant === 'amber') variantClass = 'rh-badge';
    else variantClass = 'bg-white/20 border-white/40 shadow-[0_0_16px_rgba(255,255,255,0.25)]';
  } else {
    if (variant === 'violet') variantClass = 'text-purple-300 hover:text-purple-100 hover:border-purple-400/40';
    if (variant === 'amber') variantClass = 'text-amber-300 hover:text-amber-100 hover:border-amber-400/40';
  }

  const transformStyle = `perspective(600px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) scale3d(${gelScale}, ${gelScale}, ${gelScale}) ${
    isPressing ? 'translateZ(-4px)' : 'translateZ(0px)'
  }`;

  return (
    <button
      ref={btnRef}
      onPointerMove={handlePointerMove}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={() => {
        setIsPressing(false);
        setTilt({ x: 0, y: 0 });
        setGelScale(1);
      }}
      onClick={onClick}
      className={`liquid-glass-btn ${isPressing ? 'liquid-gel-active' : ''} ${variantClass} ${className}`}
      style={{
        transform: transformStyle,
        ['--mouse-x' as string]: `${sheenCoords.x}%`,
        ['--mouse-y' as string]: `${sheenCoords.y}%`,
        ['--sheen-angle' as string]: `${sheenCoords.angle}deg`,
      }}
      {...props}
    >
      <div className="liquid-glass-sheen" />
      <div className="liquid-prism-edge" />
      {children}
    </button>
  );
};
