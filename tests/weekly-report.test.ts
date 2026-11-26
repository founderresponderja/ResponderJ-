// RJ-13.5: relatório semanal.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  isReportDay, isoWeekKey, parseSuggestions, previousWeekRange, summarizeWeek, textsForSuggestions, weeklyReportContent,
} from "../server/services/weekly-report-logic.ts";

const r = (rating: number, sentiment: string | null, keywords: string[], answered = true, text = "texto") =>
  ({ rating, sentiment, keywords, answered, text });

test("semana ISO e semana anterior completa", () => {
  assert.equal(isoWeekKey(new Date("2026-11-23T00:00:00Z")), "2026-W48");
  assert.equal(isoWeekKey(new Date("2027-01-01T00:00:00Z")), "2026-W53");
  const w = previousWeekRange(new Date("2026-11-30T03:21:00Z")); // segunda
  assert.equal(w.from.toISOString().slice(0, 10), "2026-11-23");
  assert.equal(w.to.toISOString().slice(0, 10), "2026-11-30");
  assert.equal(w.key, "2026-W48");
  // Terça (repescagem) dá a mesma semana.
  assert.equal(previousWeekRange(new Date("2026-12-01T03:21:00Z")).key, "2026-W48");
});

test("só sai à segunda e à terça", () => {
  assert.equal(isReportDay(new Date("2026-11-30T03:21:00Z")), true);
  assert.equal(isReportDay(new Date("2026-12-01T03:21:00Z")), true);
  assert.equal(isReportDay(new Date("2026-12-02T03:21:00Z")), false);
});

test("resumo: média, sentimentos, sem resposta e temas repetidos", () => {
  const s = summarizeWeek([
    r(5, "positive", ["atendimento", "comida"]),
    r(4, null, ["Atendimento"]),
    r(2, "negative", ["espera", "preço"], false),
    r(1, "negative", ["espera"], false),
    r(3, "neutral", ["espera"]),
  ]);
  assert.equal(s.total, 5);
  assert.equal(s.averageRating, 3);
  assert.deepEqual([s.positive, s.neutral, s.negative], [2, 1, 2]);
  assert.equal(s.unanswered, 2);
  assert.deepEqual(s.praise[0], { topic: "atendimento", count: 2 });
  assert.deepEqual(s.complaints[0], { topic: "espera", count: 3 });
});

test("textos para a IA começam pelos negativos e são cortados", () => {
  const texts = textsForSuggestions([r(5, "positive", [], true, "ótimo"), r(1, "negative", [], true, "x".repeat(900))]);
  assert.match(texts[0], /^\[1★\] x{500}$/);
  assert.equal(texts.length, 2);
});

test("sugestões: uma por linha, sem numeração, no máximo 3", () => {
  assert.deepEqual(
    parseSuggestions("1. Reforçar a equipa ao sábado à noite\n- Rever o tempo de espera das reservas\n\n• Ok\n4) Treinar a receção para avisar atrasos\n5. Mais uma ideia extra aqui"),
    ["Reforçar a equipa ao sábado à noite", "Rever o tempo de espera das reservas", "Treinar a receção para avisar atrasos"],
  );
});

test("email com números, temas, sugestões e como desligar", () => {
  const c = weeklyReportContent({
    firstName: "Luís",
    weekLabel: "de 23/11 a 29/11",
    businesses: [{ name: "O Pátio", summary: summarizeWeek([r(2, "negative", ["espera"], false), r(5, "positive", ["comida"])]), suggestions: ["Reforçar a sala ao sábado"] }],
    baseUrl: "https://www.responderja.pt",
  });
  assert.match(c.subject, /1 avaliação por responder/);
  assert.match(c.text, /média 3,5 estrelas/);
  assert.match(c.text, /espera \(1\)/);
  assert.match(c.text, /1\. Reforçar a sala ao sábado/);
  assert.match(c.text, /Privacidade e dados/);
});
