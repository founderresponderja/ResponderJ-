// RJ-2.4: limite de utilizadores da equipa e regras dos convites.
import { test } from "node:test";
import assert from "node:assert/strict";
import { seatsTaken, canInvite, canAccept } from "../server/services/agency-invite-logic.ts";

const now = new Date("2026-11-24T10:00:00Z");
const future = new Date("2026-11-30T10:00:00Z");
const past = new Date("2026-11-01T10:00:00Z");

test("conta pessoas distintas (linhas repetidas não contam duas vezes) e convites pendentes", () => {
  const members = [{ userId: 18 }, { userId: 20 }, { userId: 20 }];
  const invites = [
    { email: "a@x.pt", status: "pending", expiresAt: future },
    { email: "A@x.pt", status: "pending", expiresAt: future },
    { email: "b@x.pt", status: "pending", expiresAt: past },
    { email: "c@x.pt", status: "accepted", expiresAt: future },
  ];
  assert.equal(seatsTaken(members, invites, now), 3);
});

test("recusa o convite que passaria do limite, contando os pendentes", () => {
  const members = [{ userId: 1 }, { userId: 2 }];
  const invites = [1, 2, 3].map((n) => ({ email: `p${n}@x.pt`, status: "pending", expiresAt: future }));
  const r = canInvite("novo@x.pt", members, [], invites, 5, now);
  assert.equal(r.ok, false);
  assert.equal((r as any).status, 403);
  assert.equal(canInvite("novo@x.pt", members, [], invites.slice(0, 2), 5, now).ok, true);
});

test("não repete convites nem convida quem já está na equipa", () => {
  const inv = [{ email: "a@x.pt", status: "pending", expiresAt: future }];
  assert.equal((canInvite("A@x.pt", [], [], inv, 5, now) as any).status, 409);
  assert.equal((canInvite("m@x.pt", [], ["M@x.pt"], [], 5, now) as any).status, 409);
});

test("só aceita convites pendentes e dentro do prazo", () => {
  assert.equal(canAccept({ email: "a", status: "pending", expiresAt: future }, now).ok, true);
  assert.equal(canAccept({ email: "a", status: "accepted", expiresAt: future }, now).ok, false);
  assert.equal(canAccept({ email: "a", status: "pending", expiresAt: past }, now).ok, false);
});
