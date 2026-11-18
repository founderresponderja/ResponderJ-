// Escolha entre AI Studio (pré-pago) e Agent Platform (pós-pago).
import { test } from "node:test";
import assert from "node:assert/strict";
import { resolveGenAIConfig } from "../server/services/genai-config.ts";

const sa = { client_email: "ia@proj.iam.gserviceaccount.com", private_key: "-----BEGIN PRIVATE KEY-----\nx\n-----END PRIVATE KEY-----\n" };

test("sem nada: não configurado", () => {
  assert.equal(resolveGenAIConfig({}).configured, false);
});

test("por omissão continua a chave do AI Studio", () => {
  const c = resolveGenAIConfig({ GEMINI_API_KEY: "k" });
  assert.equal(c.provider, "ai-studio");
  assert.deepEqual(c.options, { apiKey: "k" });
});

test("Agent Platform com chave própria (não usa a do AI Studio)", () => {
  const c = resolveGenAIConfig({ GEMINI_PROVIDER: "agent-platform", AGENT_PLATFORM_API_KEY: "ap", GEMINI_API_KEY: "studio" });
  assert.equal(c.provider, "agent-platform");
  assert.deepEqual(c.options, { vertexai: true, apiKey: "ap" });
});

test("Agent Platform com conta de serviço em JSON ou base64", () => {
  const json = JSON.stringify(sa);
  for (const raw of [json, Buffer.from(json).toString("base64")]) {
    const c = resolveGenAIConfig({ GEMINI_PROVIDER: "agent-platform", GOOGLE_CLOUD_PROJECT: "proj", GOOGLE_SERVICE_ACCOUNT_JSON: raw });
    assert.equal(c.configured, true);
    assert.equal(c.options.project, "proj");
    assert.equal(c.options.location, "europe-west1");
    assert.equal(c.options.googleAuthOptions.credentials.client_email, sa.client_email);
    assert.ok(!c.description.includes("PRIVATE"));
  }
});

test("Agent Platform pedido mas sem credenciais: não cai para o pré-pago", () => {
  const c = resolveGenAIConfig({ GEMINI_PROVIDER: "agent-platform", GEMINI_API_KEY: "studio" });
  assert.equal(c.provider, "agent-platform");
  assert.equal(c.configured, false);
});

test("GOOGLE_GENAI_USE_VERTEXAI=true também ativa a Agent Platform", () => {
  assert.equal(resolveGenAIConfig({ GOOGLE_GENAI_USE_VERTEXAI: "true", AGENT_PLATFORM_API_KEY: "ap" }).provider, "agent-platform");
});
