/**
 * Envio de email transacional pelo Resend (API HTTP, sem dependências).
 * Variáveis: RESEND_API_KEY, EMAIL_FROM (ex.: "Responder Já <nao-responder@responderja.pt>").
 */
export interface MailInput {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export function isMailerConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
}

const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

// Um só tipo de resultado (o projeto compila sem strictNullChecks, onde uniões discriminadas não estreitam).
export interface MailResult {
  ok: boolean;
  id?: string;
  error?: string;
}

export async function sendMail(input: MailInput): Promise<MailResult> {
  if (!isMailerConfigured()) return { ok: false, error: "Email não configurado (RESEND_API_KEY / EMAIL_FROM)." };
  try {
    const res = await fetch("https://api.resend.com/emails", {
      signal: AbortSignal.timeout(10000), // RJ-8.3: não prender o pedido se o Resend não responder
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM,
        to: [input.to],
        subject: input.subject,
        text: input.text,
        html: input.html ?? `<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.5;white-space:pre-line">${escapeHtml(input.text)}</div>`,
      }),
    });
    const data: any = await res.json().catch(() => ({}));
    if (!res.ok) {
      const error = data?.message || `Resend respondeu ${res.status}`;
      console.error("[mailer] send failed:", res.status, error);
      return { ok: false, error };
    }
    return { ok: true, id: String(data?.id || "") };
  } catch (error: any) {
    console.error("[mailer] send error:", error?.message);
    return { ok: false, error: error?.message || "Erro ao enviar email" };
  }
}
