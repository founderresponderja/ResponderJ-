// RJ-2.4: regras dos convites da equipa (plano Agência). Sem acesso à base de dados, para testar.

export interface MemberRow { userId: number | null; status?: string | null }
export interface InviteRow { email: string; status?: string | null; expiresAt?: Date | string | null }

const isPendingInvite = (i: InviteRow, now: Date) =>
  (i.status ?? "pending") === "pending" && (!i.expiresAt || new Date(i.expiresAt).getTime() > now.getTime());

/** Lugares ocupados = pessoas distintas na equipa (o dono incluído) + convites ainda válidos. */
export function seatsTaken(members: MemberRow[], invites: InviteRow[], now = new Date()): number {
  const people = new Set(members.filter((m) => m.userId != null && m.status !== "suspended").map((m) => Number(m.userId)));
  const pendingEmails = new Set(invites.filter((i) => isPendingInvite(i, now)).map((i) => i.email.trim().toLowerCase()));
  return people.size + pendingEmails.size;
}

export type InviteCheck = { ok: true } | { ok: false; status: number; message: string };

/** Pode-se convidar este email? */
export function canInvite(
  email: string,
  members: MemberRow[],
  memberEmails: string[],
  invites: InviteRow[],
  limit: number,
  now = new Date(),
): InviteCheck {
  const clean = email.trim().toLowerCase();
  if (memberEmails.some((e) => e.trim().toLowerCase() === clean)) {
    return { ok: false, status: 409, message: "Esta pessoa já faz parte da equipa." };
  }
  if (invites.some((i) => isPendingInvite(i, now) && i.email.trim().toLowerCase() === clean)) {
    return { ok: false, status: 409, message: "Já existe um convite pendente para este email." };
  }
  if (limit !== -1 && seatsTaken(members, invites, now) >= limit) {
    return { ok: false, status: 403, message: `Limite de ${limit} utilizadores atingido (contando com convites pendentes).` };
  }
  return { ok: true };
}

/** O convite ainda pode ser aceite (pendente e dentro do prazo)? */
export function canAccept(invite: InviteRow, now = new Date()): InviteCheck {
  if ((invite.status ?? "pending") !== "pending") {
    return { ok: false, status: 410, message: "Este convite já foi usado." };
  }
  if (invite.expiresAt && new Date(invite.expiresAt).getTime() <= now.getTime()) {
    return { ok: false, status: 410, message: "Este convite expirou. Pede um novo convite." };
  }
  return { ok: true };
}
