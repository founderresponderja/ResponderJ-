// RJ-5.5: membros da equipa de uma agência.
import { test } from "node:test";
import assert from "node:assert/strict";
import { memberBlockedReason, memberKeepsOwnIdentity, canManageTeam } from "../server/middleware/member-rules.ts";

test("membros não fazem pagamentos", () => {
  assert.ok(memberBlockedReason("POST", "/api/billing/create-checkout-session"));
  assert.ok(memberBlockedReason("POST", "/api/billing/cancel"));
  assert.ok(memberBlockedReason("GET", "/api/billing/portal"));
});

test("membros trabalham nas reviews, respostas e clientes", () => {
  for (const [m, p] of [
    ["GET", "/api/inbox"], ["POST", "/api/generate-response"], ["POST", "/api/responses/12/accept"],
    ["GET", "/api/agency/clients"], ["GET", "/api/billing/me"], ["GET", "/api/billing/plans"],
  ]) assert.equal(memberBlockedReason(m, p), null, `${m} ${p}`);
});

test("backoffice e convites correm sempre como o próprio membro", () => {
  assert.ok(memberKeepsOwnIdentity("/api/backoffice/me"));
  assert.ok(memberKeepsOwnIdentity("/api/invitations/abc/accept"));
  assert.ok(!memberKeepsOwnIdentity("/api/inbox"));
});

test("gestão da equipa: dono ou administrador da equipa", () => {
  assert.ok(canManageTeam({ isOwner: true }));
  assert.ok(canManageTeam({ isOwner: false, memberRole: "admin" }));
  assert.ok(!canManageTeam({ isOwner: false, memberRole: "member" }));
  assert.ok(!canManageTeam({ isOwner: false, memberRole: null }));
});
