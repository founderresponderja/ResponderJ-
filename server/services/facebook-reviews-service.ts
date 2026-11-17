// RJ-4.7: ligação às recomendações (reviews) de uma página de Facebook pela Graph API.
// Ler: GET /{page-id}/ratings. Responder: comentário da página na história da recomendação.
// Até a Meta aprovar a app, só funciona para contas com papel na app (ver docs/FACEBOOK-SETUP.md).

import { facebookAppCredentials, mapFacebookRating, type FacebookRating } from "./facebook-logic.js";

const GRAPH_VERSION = process.env.FACEBOOK_GRAPH_VERSION || "v25.0";
const GRAPH = `https://graph.facebook.com/${GRAPH_VERSION}`;

async function graph<T = any>(path: string, params: Record<string, string>, method: "GET" | "POST" | "DELETE" = "GET"): Promise<T> {
  const url = new URL(path.startsWith("http") ? path : `${GRAPH}${path}`);
  let body: URLSearchParams | undefined;
  if (method === "GET" || method === "DELETE") {
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  } else {
    body = new URLSearchParams(params);
  }
  const res = await fetch(url.toString(), { method, body });
  const data: any = await res.json().catch(() => ({}));
  if (!res.ok || data?.error) {
    const err = data?.error || {};
    throw new Error(`Facebook ${res.status}: ${err.message || "erro desconhecido"} (code ${err.code ?? "?"})`);
  }
  return data as T;
}

export const FacebookReviewsService = {
  graphVersion: GRAPH_VERSION,

  buildOAuthUrl(state: string, redirectUri: string, scopes: string[]) {
    const { appId } = facebookAppCredentials(process.env);
    const params = new URLSearchParams({
      client_id: appId,
      redirect_uri: redirectUri,
      response_type: "code",
      state,
      scope: scopes.join(","),
    });
    return `https://www.facebook.com/${GRAPH_VERSION}/dialog/oauth?${params.toString()}`;
  },

  /** Código do login -> token de utilizador de longa duração (cerca de 60 dias). */
  async exchangeCode(code: string, redirectUri: string): Promise<{ userToken: string; expiresAt: Date | null }> {
    const { appId, appSecret } = facebookAppCredentials(process.env);
    const short = await graph<{ access_token: string }>("/oauth/access_token", {
      client_id: appId, client_secret: appSecret, redirect_uri: redirectUri, code,
    });
    const long = await graph<{ access_token: string; expires_in?: number }>("/oauth/access_token", {
      grant_type: "fb_exchange_token", client_id: appId, client_secret: appSecret, fb_exchange_token: short.access_token,
    });
    return {
      userToken: long.access_token,
      expiresAt: long.expires_in ? new Date(Date.now() + long.expires_in * 1000) : null,
    };
  },

  async me(userToken: string): Promise<{ id: string; name?: string }> {
    return graph("/me", { access_token: userToken, fields: "id,name" });
  },

  /** Páginas que a pessoa gere. O token de página obtido de um token longo não expira. */
  async listPages(userToken: string): Promise<Array<{ id: string; name: string; access_token: string }>> {
    const out: Array<{ id: string; name: string; access_token: string }> = [];
    let next: string | null = null;
    let first = true;
    while (first || next) {
      const data: any = first
        ? await graph("/me/accounts", { access_token: userToken, fields: "id,name,access_token", limit: "100" })
        : await graph(next as string, {});
      first = false;
      out.push(...(data.data || []));
      next = data.paging?.next || null;
    }
    return out;
  },

  /** Todas as recomendações da página (com paginação), já no formato das reviews da app. */
  async fetchReviews(pageId: string, pageToken: string, maxPages = 20) {
    const items: FacebookRating[] = [];
    let next: string | null = null;
    for (let i = 0; i < maxPages; i++) {
      const data: any = i === 0
        ? await graph(`/${pageId}/ratings`, {
            access_token: pageToken,
            fields: "created_time,recommendation_type,review_text,rating,has_rating,reviewer{id,name},open_graph_story{id}",
            limit: "100",
          })
        : await graph(next as string, {});
      items.push(...(data.data || []));
      next = data.paging?.next || null;
      if (!next) break;
    }
    return items.map(mapFacebookRating).filter((r): r is NonNullable<ReturnType<typeof mapFacebookRating>> => r !== null);
  },

  /** Publica a resposta como comentário da página. Devolve o id do comentário (para poder apagar). */
  async reply(storyId: string, pageToken: string, message: string): Promise<string> {
    const data = await graph<{ id: string }>(`/${storyId}/comments`, { access_token: pageToken, message }, "POST");
    return data.id;
  },

  async deleteReply(commentId: string, pageToken: string): Promise<void> {
    await graph(`/${commentId}`, { access_token: pageToken }, "DELETE");
  },
};
