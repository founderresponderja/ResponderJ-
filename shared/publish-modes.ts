// RJ-4.7: como se publica a resposta em cada plataforma.
// - "google" e "facebook": pela API, quando a review veio da sincronização.
// - "assisted": a plataforma não deixa responder por API (TripAdvisor, Booking) ou a review foi
//   adicionada à mão. A app copia a resposta e abre a página da plataforma; a pessoa cola e
//   marca como publicada.

export type PublishMode = "google" | "facebook" | "assisted";

const ASSISTED_URLS: Record<string, string> = {
  tripadvisor: "https://www.tripadvisor.com/Owners",
  booking: "https://admin.booking.com/",
  google: "https://business.google.com/reviews",
  facebook: "https://www.facebook.com/",
  instagram: "https://www.instagram.com/",
};

export const PLATFORM_LABELS: Record<string, string> = {
  google: "Google", facebook: "Facebook", tripadvisor: "TripAdvisor", booking: "Booking", instagram: "Instagram",
};

export function isManualExternalId(externalId?: string | null): boolean {
  return !externalId || String(externalId).startsWith("manual:");
}

export function publishModeFor(platform?: string | null, externalId?: string | null): PublishMode {
  const p = String(platform || "").toLowerCase();
  if (isManualExternalId(externalId)) return "assisted";
  if (p === "google") return "google";
  if (p === "facebook") return "facebook";
  return "assisted";
}

/** Página onde a pessoa cola a resposta. */
export function assistedUrlFor(platform?: string | null): string {
  return ASSISTED_URLS[String(platform || "").toLowerCase()] || "https://www.google.com/";
}
