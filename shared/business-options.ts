// RJ-5.8: opções de tipo de negócio e tom de voz, partilhadas pelo perfil do negócio e pela gestão de clientes da agência.
export const BUSINESS_TYPES: { value: string; label: string }[] = [
  { value: "restaurant", label: "Restaurante" },
  { value: "hotel", label: "Hotelaria" },
  { value: "retail", label: "Retalho" },
  { value: "service", label: "Serviços" },
  { value: "health", label: "Saúde" },
  { value: "beauty", label: "Beleza & Bem-Estar" },
  { value: "real-estate", label: "Imobiliária" },
  { value: "other", label: "Outro" },
];

export const BRAND_TONES: { value: string; label: string }[] = [
  { value: "professional", label: "Profissional" },
  { value: "friendly", label: "Amigável" },
  { value: "casual", label: "Informal" },
  { value: "grateful", label: "Agradecido" },
  { value: "witty", label: "Bem-humorado" },
];
