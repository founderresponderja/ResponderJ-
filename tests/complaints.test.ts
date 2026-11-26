// RJ-13.1 / RJ-13.2: caixa de reclamações e prazo de 15 dias úteis.
import { test } from "node:test";
import assert from "node:assert/strict";
import { addBusinessDays, businessDaysLeft, easterSunday, isBusinessDay } from "../shared/business-days.ts";
import {
  complaintDueDate, complaintsAddress, complaintsTokenFromRecipients, deadlineAlertContent, deadlineAlertFor,
  detectComplaintSource, extractComplaintReference, extractForwardingCode, newComplaintsToken,
} from "../server/services/complaint-logic.ts";

const d = (s: string) => new Date(`${s}T00:00:00Z`);
const iso = (x: Date) => x.toISOString().slice(0, 10);

test("Páscoa e feriados móveis", () => {
  assert.equal(iso(easterSunday(2027)), "2027-03-28");
  assert.equal(iso(easterSunday(2026)), "2026-04-05");
  assert.equal(isBusinessDay(d("2027-03-26")), false); // Sexta-feira Santa
  assert.equal(isBusinessDay(d("2027-05-27")), false); // Corpo de Deus (Páscoa + 60)
  assert.equal(isBusinessDay(d("2026-12-08")), false); // Imaculada Conceição
  assert.equal(isBusinessDay(d("2026-11-28")), false); // sábado
  assert.equal(isBusinessDay(d("2026-11-26")), true);
});

test("15 dias úteis contam a partir do dia seguinte e saltam fins de semana e feriados", () => {
  // Recebida quinta 26/11/2026; feriados 1/12 e 8/12 pelo meio.
  assert.equal(iso(addBusinessDays(d("2026-11-26"), 15)), "2026-12-21");
  // Recebida numa sexta: o 1.º dia útil é segunda.
  assert.equal(iso(addBusinessDays(d("2027-01-08"), 1)), "2027-01-11");
  // Natal e Ano Novo pelo meio.
  assert.equal(iso(complaintDueDate(new Date("2026-12-17T15:30:00Z"))), "2027-01-11");
});

test("dias úteis em falta: 1 no último dia, negativo depois", () => {
  const due = d("2026-12-18");
  assert.equal(businessDaysLeft(d("2026-12-18"), due), 1);
  assert.equal(businessDaysLeft(d("2026-12-16"), due), 3);
  assert.equal(businessDaysLeft(d("2026-12-21"), due), -1);
  assert.equal(businessDaysLeft(d("2026-12-19"), due), 0); // sábado a seguir: já passou, sem dia útil em atraso
});

test("avisos: 5, 2, último dia e ultrapassado; nada se já respondida", () => {
  const base = { status: "nova" as const, source: "livro_reclamacoes" as const, dueAt: d("2026-12-18") };
  assert.equal(deadlineAlertFor(base, d("2026-12-07")), null);
  assert.equal(deadlineAlertFor(base, d("2026-12-14")), "faltam_5");
  assert.equal(deadlineAlertFor(base, d("2026-12-17")), "faltam_2");
  assert.equal(deadlineAlertFor(base, d("2026-12-18")), "ultimo_dia");
  assert.equal(deadlineAlertFor(base, d("2026-12-21")), "ultrapassado");
  assert.equal(deadlineAlertFor({ ...base, status: "respondida" }, d("2026-12-18")), null);
  assert.equal(deadlineAlertFor({ ...base, source: "confirmacao_reencaminhamento" }, d("2026-12-18")), null);
});

test("origem pelo remetente ou pelo texto reencaminhado", () => {
  assert.equal(detectComplaintSource({ from: "nao-responder@livroreclamacoes.pt" }), "livro_reclamacoes");
  assert.equal(detectComplaintSource({ from: "dono@gmail.com", text: "---------- Forwarded message ----------\nDe: Livro de Reclamações" }), "livro_reclamacoes");
  assert.equal(detectComplaintSource({ from: "dono@gmail.com", subject: "Fwd: Nova reclamação no Portal da Queixa" }), "portal_queixa");
  assert.equal(detectComplaintSource({ from: "forwarding-noreply@google.com", subject: "(#123) Gmail Forwarding Confirmation" }), "confirmacao_reencaminhamento");
  assert.equal(detectComplaintSource({ from: "cliente@exemplo.pt", text: "Estou muito insatisfeito" }), "outro");
});

test("número da reclamação e código do Gmail", () => {
  assert.equal(extractComplaintReference("Reclamação n.º 12345/2026 registada"), "12345/2026");
  assert.equal(extractComplaintReference("Reclamacao nº: ABC-998877."), "ABC-998877");
  assert.equal(extractComplaintReference("sem número"), null);
  assert.equal(extractForwardingCode("Confirmation code: 123456789"), "123456789");
});

test("endereço único: criação e reconhecimento", () => {
  const token = newComplaintsToken((n) => new Uint8Array(n).map((_, i) => i * 7));
  assert.match(token, /^[a-z0-9]{16}$/);
  const address = complaintsAddress(token);
  assert.equal(complaintsTokenFromRecipients([address]), token);
  assert.equal(complaintsTokenFromRecipients(["Reclamações <" + address.toUpperCase() + ">"]), token);
  assert.equal(complaintsTokenFromRecipients(["erros@suporte.responderja.pt"]), null);
  assert.equal(complaintsTokenFromRecipients(undefined), null);
});

test("email de aviso diz o prazo e se é legal", () => {
  const c = deadlineAlertContent({ alert: "faltam_2", businessName: "O Pátio", source: "livro_reclamacoes", reference: "123", dueAt: d("2026-12-18"), baseUrl: "https://www.responderja.pt" });
  assert.match(c.subject, /Livro de Reclamações n\.º 123/);
  assert.match(c.text, /18\/12\/2026/);
  assert.match(c.text, /15 dias úteis/);
  assert.match(c.text, /\/reclamacoes/);
});
