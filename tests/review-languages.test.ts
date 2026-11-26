// RJ-13.4: respostas na língua do cliente (pt-PT, en, es, fr, de).
import { test } from "node:test";
import assert from "node:assert/strict";
import { detectReviewLanguage, toReviewLanguage, REVIEW_LANGUAGE_PROMPT } from "../shared/review-languages.ts";
import { normalizeGeneration } from "../server/services/ai-normalize.ts";

test("deteta as cinco línguas em avaliações típicas", () => {
  assert.equal(detectReviewLanguage("A comida estava ótima e o atendimento muito simpático. Voltaremos!"), "pt");
  assert.equal(detectReviewLanguage("The staff were very friendly and the food was great. Highly recommend."), "en");
  assert.equal(detectReviewLanguage("La comida estaba muy buena pero el servicio fue lento. Gracias."), "es");
  assert.equal(detectReviewLanguage("Très bon accueil, le personnel était vraiment sympathique. Merci !"), "fr");
  assert.equal(detectReviewLanguage("Sehr freundliches Personal und das Essen war lecker. Gerne wieder!"), "de");
});

test("português não é confundido com espanhol (RJ-4.4 continua certo)", () => {
  assert.equal(detectReviewLanguage("Não gostei da espera, mas a equipa foi simpática."), "pt");
});

test("texto sem sinais claros fica para a IA decidir", () => {
  assert.equal(detectReviewLanguage("Top!"), null);
  assert.equal(detectReviewLanguage(""), null);
  assert.equal(detectReviewLanguage("12345"), null);
});

test("aceita códigos, variantes regionais e os nomes antigos da interface", () => {
  assert.equal(toReviewLanguage("pt"), "pt");
  assert.equal(toReviewLanguage("pt-PT"), "pt");
  assert.equal(toReviewLanguage("EN"), "en");
  assert.equal(toReviewLanguage("Português"), "pt");
  assert.equal(toReviewLanguage("Francês"), "fr");
  assert.equal(toReviewLanguage("Alemão"), "de");
  assert.equal(toReviewLanguage("Automática (a do cliente)"), null);
  assert.equal(toReviewLanguage("auto"), null);
  assert.equal(toReviewLanguage("it"), null);
  assert.equal(toReviewLanguage("deutsch"), "de");
  assert.equal(toReviewLanguage("desconhecida"), null);
  assert.equal(toReviewLanguage(undefined), null);
});

test("o português pedido à IA é o de Portugal", () => {
  assert.match(REVIEW_LANGUAGE_PROMPT.pt, /pt-PT/);
  assert.match(REVIEW_LANGUAGE_PROMPT.pt, /Never Brazilian/);
});

test("a validação da resposta da IA aceita francês e alemão", () => {
  assert.equal(normalizeGeneration({ language: "fr", variations: [] }, null).language, "fr");
  assert.equal(normalizeGeneration({ language: "de", variations: [] }, null).language, "de");
  assert.equal(normalizeGeneration({ language: "it", variations: [] }, null).language, "pt");
});
