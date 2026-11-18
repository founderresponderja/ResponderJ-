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
    assert.equal(c.options.location, "europe-west3");
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

import { resolveModel, thinkingConfigFor, DEFAULT_MODEL } from "../server/services/genai-config.ts";

test("conta de serviço tem prioridade sobre a chave e a região por omissão é Frankfurt", () => {
  const c = resolveGenAIConfig({ GEMINI_PROVIDER: "agent-platform", AGENT_PLATFORM_API_KEY: "ap", GOOGLE_CLOUD_PROJECT: "p", GOOGLE_SERVICE_ACCOUNT_JSON: JSON.stringify(sa) });
  assert.equal(c.options.location, "europe-west3");
  assert.equal(c.options.apiKey, undefined);
});

test("na Agent Platform, nomes Gemini 2.5 (retirados) passam ao modelo atual", () => {
  assert.equal(resolveModel("gemini-2.5-flash", "agent-platform"), DEFAULT_MODEL);
  assert.equal(resolveModel("", "agent-platform"), DEFAULT_MODEL);
  assert.equal(resolveModel("gemini-3.6-flash", "agent-platform"), "gemini-3.6-flash");
  assert.equal(resolveModel("gemini-2.5-flash", "ai-studio"), "gemini-2.5-flash");
});

test("pensamento em nível baixo só nos modelos Gemini 3", () => {
  assert.deepEqual(thinkingConfigFor("gemini-3.5-flash"), { thinkingConfig: { thinkingLevel: "LOW" } });
  assert.deepEqual(thinkingConfigFor("gemini-2.5-flash"), {});
});
