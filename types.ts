
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
  establishmentId?: number;
  establishmentName?: string;
  platform: Platform;
  customerName: string;
  rating: number; // 1-5
  reviewText: string;
  tone: Tone;
  language: Language;
  extraInstructions?: string;
  generatedResponse?: string;
  sentiment?: 'Positive' | 'Neutral' | 'Negative';
  keywords?: string[];
  createdAt: Date;
  isFavorite?: boolean;
  responseType?: string; // auto_reply, manual, etc.
  responseId?: number;
  approvalStatus?: 'pending' | 'approved' | 'edited' | 'discarded';
  attemptsCount?: number;
}

export type SocialPlatform = 'facebook' | 'instagram' | 'linkedin' | 'tiktok' | 'twitter' | 'youtube' | 'google' | 'tripadvisor' | 'booking' | 'thefork';
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
  sourceType?: 'manual' | 'review_response';
  reviewId?: number;
  responseId?: number;
  content?: string;
}

export interface ChartData {
  name: string;
  value: number;
}

export type PlanId = 'trial' | 'starter' | 'regular' | 'pro' | 'agency';

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

export interface AutomationRule {
  id: string;
  userId: string;
  name: string;
  platform: string;
  isActive: boolean;
  trigger: {
    type: 'keyword' | 'sentiment' | 'time' | 'rating';
    value: string;
    condition: 'contains' | 'equals' | 'greater_than' | 'less_than';
  };
  action: {
    type: 'auto_respond' | 'schedule_response' | 'notify' | 'tag';
    template: string;
    delay?: number;
  };
  createdAt: string;
  lastTriggered?: string;
  triggerCount: number;
}