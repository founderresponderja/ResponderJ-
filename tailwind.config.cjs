/** @type {import('tailwindcss').Config} */
const petroleo = { 50: '#EAF3F2', 100: '#D3E9E8', 200: '#A8D3D2', 300: '#73B7B8', 400: '#3E979A', 500: '#1A7A80', 600: '#0F5F66', 700: '#0C4E54', 800: '#0A3A3F', 900: '#082D31', 950: '#051C1F' };
const pedra = { 50: '#FAF8F5', 100: '#F4F1EC', 200: '#E8E3DA', 300: '#D5CEC2', 400: '#A39B8F', 500: '#6E675E', 600: '#5A544C', 700: '#45403A', 800: '#2E2B28', 900: '#1B1A1C', 950: '#141312' };
const ouro = { 50: '#FEF8EC', 100: '#FCEDCC', 200: '#F9DB98', 300: '#F6C765', 400: '#F2B13D', 500: '#E39A1F', 600: '#C27C14', 700: '#9A5F13', 800: '#7A4B16', 900: '#643E16', 950: '#3A2008' };

module.exports = {
  darkMode: 'class',
  content: [
    './index.html',
    './index.tsx',
    './App.tsx',
    './components/**/*.{ts,tsx}',
    './hooks/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
    './utils/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      // Identidade Responder Já (ver Manual de Identidade Visual, cap. 06)
      colors: {
        brand: petroleo,
        // Neutros quentes «Pedra» substituem os cinzentos de origem do Tailwind
        slate: pedra,
        // Ouro das estrelas
        amber: ouro,
        // Roxos e azuis de origem passam a Petróleo: apaga os gradientes azul-roxo
        purple: petroleo, indigo: petroleo, violet: petroleo, sky: petroleo, blue: petroleo,
      },
      animation: {
        'fade-in':    'fadeIn 0.3s ease-out forwards',
        'fade-in-up': 'fadeInUp 0.5s ease-out forwards',
      },
      keyframes: {
        fadeIn: {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeInUp: {
          '0%':   { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};
