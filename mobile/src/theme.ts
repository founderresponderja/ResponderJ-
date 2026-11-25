// Cores iguais às do site (tailwind.config.cjs): Petróleo, Pedra e Ouro.
// Se o site mudar uma cor, muda-se aqui também.
export const petroleo = {
  50: '#EAF3F2', 100: '#D3E9E8', 200: '#A8D3D2', 300: '#73B7B8', 400: '#3E979A',
  500: '#1A7A80', 600: '#0F5F66', 700: '#0C4E54', 800: '#0A3A3F', 900: '#082D31', 950: '#051C1F',
} as const;
export const pedra = {
  50: '#FAF8F5', 100: '#F4F1EC', 200: '#E8E3DA', 300: '#D5CEC2', 400: '#A39B8F',
  500: '#6E675E', 600: '#5A544C', 700: '#45403A', 800: '#2E2B28', 900: '#1B1A1C', 950: '#141312',
} as const;
export const ouro = {
  50: '#FEF8EC', 100: '#FCEDCC', 200: '#F9DB98', 300: '#F6C765', 400: '#F2B13D',
  500: '#E39A1F', 600: '#C27C14', 700: '#9A5F13', 800: '#7A4B16', 900: '#643E16', 950: '#3A2008',
} as const;

export const colors = {
  fundo: pedra[100],
  cartao: '#FFFFFF',
  linha: pedra[200],
  texto: pedra[900],
  textoSecundario: pedra[500],
  marca: petroleo[600],
  marcaEscura: petroleo[800],
  destaque: ouro[500],
  perigo: '#B4412F',
  sucesso: '#2E7D4F',
} as const;

// Tipo de letra Max (assets/fonts/Max-Regular.otf). O nome é o mesmo no iPhone e no Android.
export const fonte = 'Max-Regular';

export const espaco = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
export const raio = { controlo: 10, cartao: 12 } as const;
export const alturaControlo = 48;
