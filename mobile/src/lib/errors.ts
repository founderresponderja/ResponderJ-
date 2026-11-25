// Mensagens de erro do Clerk em português (as do Clerk vêm em inglês).
const MENSAGENS: Record<string, string> = {
  form_identifier_not_found: 'Não há nenhuma conta com este email.',
  form_code_incorrect: 'O código não está certo. Confirme e tente outra vez.',
  verification_expired: 'O código expirou. Peça um novo.',
  form_password_incorrect: 'A palavra-passe não está certa.',
  form_password_pwned: 'Esta palavra-passe apareceu numa fuga de dados. Escolha outra.',
  form_password_length_too_short: 'A palavra-passe é demasiado curta.',
  form_identifier_exists: 'Já existe uma conta com este email.',
  form_param_format_invalid: 'O email não parece válido.',
  too_many_requests: 'Demasiadas tentativas. Espere um pouco e tente outra vez.',
};

export function errorCode(error: unknown): string | undefined {
  const e = error as { code?: string; errors?: { code?: string }[] } | null;
  return e?.errors?.[0]?.code || e?.code;
}

export function mensagemDeErro(error: unknown): string {
  const code = errorCode(error);
  if (code && MENSAGENS[code]) return MENSAGENS[code];
  return 'Não foi possível continuar. Tente outra vez.';
}
