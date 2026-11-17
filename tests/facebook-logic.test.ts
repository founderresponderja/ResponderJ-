// RJ-4.7: ligação ao Facebook (regras sem rede).
import { test } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { facebookAvailableFor, facebookAppCredentials, mapFacebookRating, parseSignedRequest, FACEBOOK_SCOPES } from "../server/services/facebook-logic.ts";

const CREDS = { FACEBOOK_APP_ID: "123", FACEBOOK_APP_SECRET: "s3cr3t" };

test("sem App ID e App Secret ninguém liga o Facebook", () => {
  assert.equal(facebookAvailableFor("a@b.pt", { FACEBOOK_REVIEWS_ENABLED: "true" }), false);
  assert.equal(facebookAppCredentials({ FACEBOOK_CLIENT_ID: "1", FACEBOOK_CLIENT_SECRET: "2" }).configured, true);
});

test("antes da aprovação: só os emails de teste", () => {
  const env = { ...CREDS, FACEBOOK_TEST_EMAILS: " Luis@Exemplo.pt , outro@x.pt" };
  assert.ok(facebookAvailableFor("luis@exemplo.pt", env));
  assert.ok(!facebookAvailableFor("cliente@x.pt", env));
  assert.ok(!facebookAvailableFor(null, env));
});

test("depois da aprovação: toda a gente", () => {
  assert.ok(facebookAvailableFor("cliente@x.pt", { ...CREDS, FACEBOOK_REVIEWS_ENABLED: "true" }));
});

test("pede as permissões para ler e responder", () => {
  assert.ok(FACEBOOK_SCOPES.includes("pages_read_user_content"));
  assert.ok(FACEBOOK_SCOPES.includes("pages_manage_engagement"));
});

test("recomendação positiva e negativa viram sentimento, sem inventar estrelas", () => {
  const pos = mapFacebookRating({ recommendation_type: "positive", review_text: "Ótimo", open_graph_story: { id: "1_2" }, reviewer: { name: "Ana" }, created_time: "2026-11-01T10:00:00+0000" });
  assert.equal(pos?.sentiment, "positive");
  assert.equal(pos?.rating, null);
  assert.equal(pos?.externalId, "1_2");
  assert.equal(pos?.authorName, "Ana");
  const neg = mapFacebookRating({ recommendation_type: "negative", open_graph_story: { id: "1_3" } });
  assert.equal(neg?.sentiment, "negative");
  assert.equal(neg?.authorName, "Cliente Facebook");
});

test("estrelas antigas (1-5) são aproveitadas", () => {
  const r = mapFacebookRating({ rating: 2, open_graph_story: { id: "x" } });
  assert.equal(r?.rating, 2);
  assert.equal(r?.sentiment, "negative");
});

test("sem id da história não dá para responder: fica de fora", () => {
  assert.equal(mapFacebookRating({ recommendation_type: "positive" }), null);
});

function sign(payload: object, secret: string) {
  const b64url = (b: Buffer) => b.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  const body = b64url(Buffer.from(JSON.stringify(payload)));
  const sig = b64url(crypto.createHmac("sha256", secret).update(body).digest());
  return `${sig}.${body}`;
}

test("pedido de apagamento de dados: aceita só com a assinatura certa", () => {
  const req = sign({ algorithm: "HMAC-SHA256", user_id: "999" }, "s3cr3t");
  assert.equal(parseSignedRequest(req, "s3cr3t")?.user_id, "999");
  assert.equal(parseSignedRequest(req, "outro"), null);
  assert.equal(parseSignedRequest("lixo", "s3cr3t"), null);
  assert.equal(parseSignedRequest(sign({ algorithm: "MD5", user_id: "1" }, "s3cr3t"), "s3cr3t"), null);
});
