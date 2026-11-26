// RJ-4.6 / RJ-4.3: validação da resposta única do Gemini.
import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeGeneration } from "../server/services/ai-normalize.ts";
import { sentimentFromRating } from "../shared/sentiment.ts";

test("aceita uma resposta válida e normaliza os temas", () => {
  const r = normalizeGeneration({
    sentiment: "negative",
    language: "en",
    keywords: ["Waiting Time", "waiting time", " service ", ""],
    variations: [{ text: " Sorry. ", type: "concise" }, { text: "Thanks", type: "balanced" }],
  }, null);
  assert.equal(r.sentiment, "negative");
  assert.equal(r.language, "en");
  assert.deepEqual(r.keywords, ["waiting time", "service"]);
  assert.deepEqual(r.variations.map((v) => v.text), ["Sorry.", "Thanks"]);
});

test("a língua já conhecida prevalece sobre a da IA", () => {
  assert.equal(normalizeGeneration({ language: "es", variations: [] }, "pt").language, "pt");
});

test("valores inválidos caem para valores seguros", () => {
  const r = normalizeGeneration({ sentiment: "angry", language: "it", keywords: "x" as any, variations: [{ text: "" }, {} as any] }, null);
  assert.equal(r.sentiment, "neutral");
  assert.equal(r.language, "pt");
  assert.deepEqual(r.keywords, []);
  assert.equal(r.variations.length, 0);
});

test("no máximo 5 temas", () => {
  const r = normalizeGeneration({ keywords: ["a", "b", "c", "d", "e", "f"], variations: [] }, null);
  assert.equal(r.keywords.length, 5);
});

test("sentimento de base pelas estrelas", () => {
  assert.equal(sentimentFromRating(5), "positive");
  assert.equal(sentimentFromRating(4), "positive");
  assert.equal(sentimentFromRating(3), "neutral");
  assert.equal(sentimentFromRating(2), "negative");
  assert.equal(sentimentFromRating(1), "negative");
  assert.equal(sentimentFromRating(0), null);
  assert.equal(sentimentFromRating(null), null);
});
