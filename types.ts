export enum Platform {
  GOOGLE = 'Google Maps',
  THE_FORK = 'The Fork',
  BOOKING = 'Booking.com',
  TRIPADVISOR = 'TripAdvisor',
  AIRBNB = 'Airbnb',
  FACEBOOK = 'Facebook',
  ZOMATO = 'Zomato/Yelp'
}

export enum Tone {
  PROFESSIONAL = 'Profissional',
  FRIENDLY = 'Amigável',
  GRATEFUL = 'Agradecido',
  APOLOGETIC = 'Desculpas/Empático',
  WITTY = 'Bem-humorado'
}

export enum Language {
  PT = 'Português',
  EN = 'Inglês',
  ES = 'Espanhol',
  FR = 'Francês'
}

export interface ReviewData {
  id: string;
  platform: Platform;
  customerName: string;
  rating: number; // 1-5
  reviewText: string;
  tone: Tone;
  language: Language;
  generatedResponse?: string;
  createdAt: Date;
}

export interface ChartData {
  name: string;
  value: number;
}

export type PlanId = 'trial' | 'regular' | 'pro' | 'agency';

export interface Plan {
  id: PlanId;
  price: number;
  credits: number; // Number of AI responses
  users: number;
  nameKey: string; // Translation key
  highlight?: boolean;
}

export interface UserSubscription {
  planId: PlanId;
  creditsUsed: number;
  startDate: Date;
}