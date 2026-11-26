// RJ-16.3: pedidos de avaliação por QR code e WhatsApp.
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildReviewMessage, cleanReviewLink, defaultReviewMessage, incentiveWarning, whatsappUrl } from "../shared/review-requests.ts";

test("aceita ligações da própria plataforma e força https", () => {
  assert.equal(cleanReviewLink("google", "https://g.page/r/CabcXYZ/review").url, "https://g.page/r/CabcXYZ/review");
  assert.equal(cleanReviewLink("google", "search.google.com/local/writereview?placeid=ChIJ123").url, "https://search.google.com/local/writereview?placeid=ChIJ123");
  assert.equal(cleanReviewLink("tripadvisor", "http://www.tripadvisor.pt/UserReviewEdit-d123").url, "https://www.tripadvisor.pt/UserReviewEdit-d123");
  assert.equal(cleanReviewLink("facebook", "https://www.facebook.com/opatio/reviews").url, "https://www.facebook.com/opatio/reviews");
  assert.equal(cleanReviewLink("google", "").url, null);
});

test("recusa ligações de outros sítios na plataforma errada", () => {
  assert.match(cleanReviewLink("google", "https://evil.example.com/google.com").error!, /tem de ser de Google/);
  assert.match(cleanReviewLink("tripadvisor", "https://www.facebook.com/x").error!, /Tripadvisor/);
  assert.match(cleanReviewLink("google", "javascript:alert(1)").error!, /não é válida|tem de ser/);
  assert.match(cleanReviewLink("google", "https://google.com.evil.io/x").error!, /tem de ser de Google/);
});

test("mensagem com a ligação da página", () => {
  assert.equal(buildReviewMessage("Avalie aqui: {link} obrigado", "https://x/avaliar/abc"), "Avalie aqui: https://x/avaliar/abc obrigado");
  assert.equal(buildReviewMessage("Avalie-nos", "https://x/a"), "Avalie-nos https://x/a");
  assert.match(defaultReviewMessage("O Pátio"), /O Pátio.*\{link\}/);
});

test("WhatsApp: com e sem número; português sem indicativo leva +351", () => {
  assert.equal(whatsappUrl("Olá & obrigado"), "https://wa.me/?text=Ol%C3%A1%20%26%20obrigado");
  assert.equal(whatsappUrl("x", "912 345 678"), "https://wa.me/351912345678?text=x");
  assert.equal(whatsappUrl("x", "+44 7700 900123"), "https://wa.me/447700900123?text=x");
  assert.equal(whatsappUrl("x", "00351 912345678"), "https://wa.me/351912345678?text=x");
});

test("avisa se a mensagem oferece algo em troca", () => {
  assert.ok(incentiveWarning("Avalie e ganhe 10% de desconto"));
  assert.equal(incentiveWarning("Obrigado pela visita!"), null);
});
