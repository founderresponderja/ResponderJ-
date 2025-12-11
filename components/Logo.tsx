import React from 'react';

export const Logo = ({ className = "w-8 h-8", size = 32 }: { className?: string; size?: number }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 100 100" 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    {/* Variação estilizada da montanha/triângulo, adaptada ao tema Blue (Brand) da app */}
    <path 
      d="M50 15L15 85H45L50 75L55 85H85L50 15Z" 
      fill="url(#logo-gradient)" 
      stroke="none"
    />
    <path 
      d="M50 15L15 85H35L50 55L65 85H85L50 15Z" 
      fill="url(#logo-gradient-inner)" 
      opacity="0.9"
    />
    <defs>
      <linearGradient id="logo-gradient" x1="15" y1="85" x2="85" y2="15" gradientUnits="userSpaceOnUse">
        <stop stopColor="#0284c7" /> {/* brand-600 */}
        <stop offset="1" stopColor="#0ea5e9" /> {/* brand-500 */}
      </linearGradient>
      <linearGradient id="logo-gradient-inner" x1="50" y1="15" x2="50" y2="85" gradientUnits="userSpaceOnUse">
        <stop stopColor="#0ea5e9" /> {/* brand-500 */}
        <stop offset="1" stopColor="#0369a1" /> {/* brand-700 shadow */}
      </linearGradient>
    </defs>
  </svg>
);