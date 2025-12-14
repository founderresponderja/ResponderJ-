export enum Platform {
  GOOGLE = 'Google Maps',
  THE_FORK = 'The Fork',
  BOOKING = 'Booking.com',
  TRIPADVISOR = 'TripAdvisor',
  AIRBNB = 'Airbnb',
  FACEBOOK = 'Facebook',
  YELP = 'Yelp',
  UBER_EATS = 'Uber Eats',
  EXPEDIA = 'Expedia',
  ZOMATO = 'Zomato',
  INSTAGRAM = 'Instagram',
  LINKEDIN = 'LinkedIn',
  TIKTOK = 'TikTok',
  TWITTER = 'Twitter'
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
  isFavorite?: boolean;
}

export type SocialPlatform = 'facebook' | 'instagram' | 'linkedin' | 'tiktok' | 'twitter';
export type PostStatus = 'draft' | 'scheduled' | 'published';
export type ContentType = 'image' | 'video' | 'text' | 'carousel';

export interface SocialPost {
  id: string;
  title: string;
  platform: SocialPlatform;
  status: PostStatus;
  scheduledDate: Date;
  contentType: ContentType;
  engagement?: string;
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