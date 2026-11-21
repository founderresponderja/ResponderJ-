import React from 'react';

/** Símbolo do Responder Já: bolha de conversa com a estrela das avaliações.
 *  Ver Manual de Identidade Visual, cap. 02. Nunca substituir por um ícone de biblioteca. */
interface SymbolProps {
  size?: number | string;
  className?: string;
  /** cores: «brand» (petróleo + ouro), «icon» (ouro + petróleo), «white» (branco + carvão) */
  variant?: 'brand' | 'icon' | 'white';
  title?: string;
}

const COLORS = {
  brand: { bubble: '#0F5F66', star: '#F2B13D' },
  icon: { bubble: '#F2B13D', star: '#0F5F66' },
  white: { bubble: '#FFFFFF', star: '#1B1A1C' },
};

export const RJSymbol: React.FC<SymbolProps> = ({ size = 24, className = '', variant = 'brand', title }) => {
  const c = COLORS[variant];
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={className}
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M50 92 H12 V50 A38 38 0 1 1 50 92 Z" fill={c.bubble} />
      <polygon
        points="51,27 57.3,42.3 73.8,43.6 61.3,54.3 65.1,70.4 51,61.8 36.9,70.4 40.7,54.3 28.2,43.6 44.7,42.3"
        fill={c.star}
        stroke={c.star}
        strokeWidth={2.9}
        strokeLinejoin="round"
      />
    </svg>
  );
};

/** Marca usada nas sugestões da IA (substitui o ícone de brilhos). Aceita as mesmas props base dos ícones Lucide. */
export const AiMark: React.FC<{ size?: number | string; className?: string; [key: string]: unknown }> = ({ size = 16, className = '' }) => (
  <RJSymbol size={size} className={className} />
);

interface LogoProps {
  size?: number | string;
  className?: string;
  showText?: boolean;
}

export const Logo: React.FC<LogoProps> = ({ size = 24, className = '', showText = false }) => {
  const iconSize = typeof size === 'number' ? size : 24;
  return (
    <div className={`flex items-center gap-2 ${showText ? '' : 'inline-flex'}`}>
      <RJSymbol size={iconSize} className={className} title={showText ? undefined : 'Responder Já'} />
      {showText && (
        <span className="text-xl text-slate-900 dark:text-white">
          Responder Já
        </span>
      )}
    </div>
  );
};
