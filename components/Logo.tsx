import React from 'react';
import { MessageCircle } from 'lucide-react';

interface LogoProps {
  size?: number | string;
  className?: string;
  showText?: boolean;
}

export const Logo: React.FC<LogoProps> = ({ size = 24, className = '', showText = false }) => {
  const iconSize = typeof size === 'number' ? size : 24;
  
  return (
    <div className={`flex items-center gap-2 ${showText ? '' : 'inline-flex'}`}>
      <MessageCircle 
        size={iconSize} 
        className={`text-brand-600 dark:text-brand-400 ${className}`}
        strokeWidth={2.5}
      />
      {showText && (
        <span className="font-bold text-xl text-slate-900 dark:text-white">
          Responder Já
        </span>
      )}
    </div>
  );
};