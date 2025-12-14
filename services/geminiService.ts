
import { ReviewData } from "../types";

export interface BusinessContext {
  businessName?: string;
  businessType?: string;
  description?: string;
  responseGuidelines?: string;
}

export interface AIResponse {
  response: string;
  sentiment: 'Positive' | 'Neutral' | 'Negative';
  keywords: string[];
}

export interface GenerationInput {
  platform: string;
  customerName: string;
  reviewText: string;
  rating?: number;
  tone: string;
  language: string;
  extraInstructions?: string;
}

// Helper to get CSRF token
async function getCsrfToken() {
  try {
    const res = await fetch('/api/csrf-token');
    if (!res.ok) return null;
    const data = await res.json();
    return data.csrfToken;
  } catch (e) {
    console.warn("Could not fetch CSRF token", e);
    return null;
  }
}

export const generateResponse = async (review: GenerationInput | ReviewData, context?: BusinessContext): Promise<AIResponse> => {
  const csrfToken = await getCsrfToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };
  
  if (csrfToken) {
    headers['x-csrf-token'] = csrfToken;
  }

  const response = await fetch('/api/generate-response', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      platform: review.platform,
      originalMessage: 'reviewText' in review ? review.reviewText : '',
      tone: review.tone,
      extraInstructions: 'extraInstructions' in review ? review.extraInstructions : undefined,
      businessContext: context,
      customerName: 'customerName' in review ? review.customerName : 'Cliente'
    })
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.message || "Failed to generate response");
  }

  const data = await response.json();
  return {
    response: data.generatedResponse,
    sentiment: data.sentiment || "Neutral",
    keywords: data.keywords || []
  };
};

export const analyzeSentiment = async (reviews: string[]): Promise<{ positive: number, neutral: number, negative: number }> => {
    // Placeholder for sentiment analysis logic
    return { positive: 0, neutral: 0, negative: 0 };
};
