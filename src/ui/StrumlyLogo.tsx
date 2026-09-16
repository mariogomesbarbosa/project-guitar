import React from 'react';

interface StrumlyLogoProps {
  variant?: 'full' | 'icon-only' | 'stacked';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const StrumlyIcon: React.FC<{ size?: number; className?: string }> = ({
  size = 36,
  className = '',
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 drop-shadow-[0_4px_12px_rgba(255,87,34,0.35)] ${className}`}
    >
      <defs>
        {/* Gradiente da Palheta */}
        <linearGradient id="strumlyPickGrad" x1="15%" y1="10%" x2="85%" y2="95%">
          <stop offset="0%" stopColor="#FF6B35" />
          <stop offset="45%" stopColor="#FF416C" />
          <stop offset="100%" stopColor="#7928CA" />
        </linearGradient>

        {/* Gradiente das Cordas */}
        <linearGradient id="strumlyStringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#E2E8F0" />
        </linearGradient>

        {/* Brilho Superior da Palheta */}
        <linearGradient id="strumlyHighlight" x1="50%" y1="0%" x2="50%" y2="60%">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Silhueta da Palheta (Guitar Pick) */}
      <path
        d="M50 94C37 81.5 14 55 14 33C14 17.5 29.5 9 50 9C70.5 9 86 17.5 86 33C86 55 63 81.5 50 94Z"
        fill="url(#strumlyPickGrad)"
      />

      {/* Camada de relevo/brilho suave no topo */}
      <path
        d="M50 11C68 11 83 18.5 83 33C83 45 74 61 64 73C58 64 54 48 53 35C52 23 48 15 50 11Z"
        fill="url(#strumlyHighlight)"
      />

      {/* Cordas de Violão Diagonais de Fundo */}
      <line
        x1="26"
        y1="70"
        x2="74"
        y2="22"
        stroke="url(#strumlyStringGrad)"
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeOpacity="0.45"
      />
      <line
        x1="33"
        y1="77"
        x2="81"
        y2="29"
        stroke="url(#strumlyStringGrad)"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeOpacity="0.35"
      />
      <line
        x1="19"
        y1="63"
        x2="67"
        y2="15"
        stroke="url(#strumlyStringGrad)"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeOpacity="0.35"
      />

      {/* O 'S' Harmônico Sônico (Ondas Sonoras + Letra S) */}
      <path
        d="M62 27C55 21 41 22 36 29C30 37 38 46 47 49C57 52 64 57 61 68C58 76 46 78 37 73"
        stroke="#FFFFFF"
        strokeWidth="5.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Pulsos de áudio nas extremidades do S */}
      <circle cx="62" cy="27" r="2.2" fill="#FFD54F" />
      <circle cx="37" cy="73" r="2.2" fill="#4ECAFF" />
    </svg>
  );
};

export const StrumlyLogo: React.FC<StrumlyLogoProps> = ({
  variant = 'full',
  size = 'md',
  className = '',
}) => {
  const iconSize = size === 'sm' ? 28 : size === 'lg' ? 44 : 36;

  if (variant === 'icon-only') {
    return <StrumlyIcon size={iconSize} className={className} />;
  }

  return (
    <div
      className={`flex items-center gap-3 select-none transition-transform ${
        variant === 'stacked' ? 'flex-col text-center' : ''
      } ${className}`}
    >
      <div className="relative group">
        <StrumlyIcon size={iconSize} className="transition-transform group-hover:scale-105" />
      </div>

      <div className="flex flex-col">
        <div className="flex items-center gap-1.5 leading-none">
          <span className="font-black tracking-tight text-white font-sans text-lg sm:text-xl">
            Strum
            <span className="bg-gradient-to-r from-[#FF6B35] to-[#A855F7] bg-clip-text text-transparent">
              ly
            </span>
          </span>
          <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-gradient-to-r from-orange-500/20 to-purple-500/20 text-orange-300 border border-orange-500/30">
            3D
          </span>
        </div>
        <span className="text-[10px] text-zinc-400 font-medium tracking-wide mt-0.5">
          Learn by playing
        </span>
      </div>
    </div>
  );
};
