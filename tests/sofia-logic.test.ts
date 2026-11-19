// RJ-5.7: perfis, ferramentas, propostas e avisos da Sofia.
import { test } from "node:test";
import assert from "node:assert/strict";
import { audienceFor, toolNamesFor, buildProposal, isAllowedProposalPath, computeNudges, destinationsFor, firstNameOf } from "../server/sofia/sofia-logic.ts";

test("perfil: operador > membro > dono de agência > cliente", () => {
  assert.equal(audienceFor({ platformRole: "super_admin", isMember: false, hasClientManagement: false }), "super_admin");
  assert.equal(audienceFor({ platformRole: "operator", isMember: true, hasClientManagement: true }), "operator");
  assert.equal(audienceFor({ platformRole: "customer", isMember: true, hasClientManagement: true }), "agency_member");
  assert.equal(audienceFor({ platformRole: "customer", isMember: false, hasClientManagement: true }), "agency_owner");
  assert.equal(audienceFor({ platformRole: "customer", isMember: false, hasClientManagement: false }), "customer");
});

test("clientes não têm ferramentas do backoffice", () => {
  assert.ok(!toolNamesFor("customer").some((t) => t.includes("incident")));
  assert.ok(toolNamesFor("operator").includes("propose_reclassify_incident"));
  const r = buildProposal("customer", "propose_resolve_incident", { incident_id: 1, message_to_customer: "x" });
  assert.ok(r.error);
});

test("reclassificar: valida e monta a chamada ao endereço existente", () => {
  const ok = buildProposal("operator", "propose_reclassify_incident", { incident_id: "12", severity: "high", category: "sync", reason: "x" });
  assert.equal(ok.proposal?.path, "/api/backoffice/incidents/12/reclassify");
  assert.deepEqual(ok.proposal?.body, { severity: "high", category: "sync", reason: "x" });
  assert.ok(isAllowedProposalPath(ok.proposal!.path!));
  assert.ok(buildProposal("operator", "propose_reclassify_incident", { incident_id: 12, severity: "urgentissimo", category: "sync" }).error);
  assert.ok(buildProposal("operator", "propose_reclassify_incident", { incident_id: "../1", severity: "high", category: "sync" }).error);
});

test("resolver exige mensagem e avisa que envia email", () => {
  assert.ok(buildProposal("operator", "propose_resolve_incident", { incident_id: 3 }).error);
  const r = buildProposal("super_admin", "propose_resolve_incident", { incident_id: 3, message_to_customer: "Já está corrigido." });
  assert.match(r.proposal!.detail!, /email/);
});

test("caminhos fora da lista nunca são aceites", () => {
  assert.ok(!isAllowedProposalPath("/api/backoffice/customers/1/plan"));
  assert.ok(!isAllowedProposalPath("/api/account/delete"));
});

test("navegação respeita o perfil", () => {
  assert.ok(!("pricing" in destinationsFor("agency_member")));
  assert.ok(!("team" in destinationsFor("customer")));
  assert.ok(buildProposal("customer", "navigate", { destination: "team" }).error);
  assert.equal(buildProposal("customer", "navigate", { destination: "inbox" }).proposal?.tab, "inbox");
  assert.equal(buildProposal("operator", "navigate", { destination: "incidents" }).proposal?.view, "backoffice");
});

test("avisos do cliente", () => {
  const n = computeNudges("customer", { expiredConnections: ["google"], unansweredNegativeOld: 2, creditsRemaining: 1, creditsTotal: 50, trialDaysLeft: null });
  assert.deepEqual(n.map((x) => x.id), ["conn-google", "negative-old", "credits-low"]);
  assert.equal(computeNudges("customer", { unansweredTotal: 3, creditsRemaining: 40, creditsTotal: 50 }).length, 0);
  // O membro da agência não recebe avisos de créditos nem de período experimental (são do dono).
  assert.equal(computeNudges("agency_member", { creditsRemaining: 0, creditsTotal: 500, trialDaysLeft: 1 }).length, 0);
});

test("avisos do backoffice", () => {
  const n = computeNudges("operator", { incidentsOverdue: 1, criticalOpen: 2, incidentsDueSoon: 0, technicalErrorsNew: 3 });
  assert.deepEqual(n.map((x) => x.id), ["incidents-overdue", "incidents-critical", "tech-errors"]);
  assert.match(n[0].text, /1 erro reportado já passou do prazo/);
});

test("primeiro nome", () => {
  assert.equal(firstNameOf("Luís Filipe", "x@y.pt"), "Luís");
  assert.equal(firstNameOf("", "ana.silva@x.pt"), "ana");
});

import { knowledgeFor, plansKnowledge } from "../server/sofia/knowledge.ts";

test("conhecimento: preços vêm de shared/plans.ts e o backoffice só para operadores", () => {
  const p = plansKnowledge();
  assert.match(p, /Starter: 19,99 €\/mês; 50 respostas/);
  assert.match(p, /Agência: 149,99 €\/mês; 500 respostas/);
  assert.ok(!knowledgeFor("customer").includes("BACKOFFICE"));
  assert.ok(!knowledgeFor("customer").includes("AGÊNCIAS"));
  assert.ok(knowledgeFor("agency_member").includes("AGÊNCIAS"));
  assert.match(knowledgeFor("operator"), /critical = Crítica \(1 dia/);
});
