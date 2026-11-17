// RJ-7.2: versão em vigor de cada documento legal. Mudar a data aqui obriga todas as
// contas a aceitar de novo na entrada seguinte (o registo guarda a versão aceite).
// Usar a data da "Última atualização" que aparece na página do documento.
export const LEGAL_VERSIONS = {
  terms: "2026-04-10",
  privacy: "2026-04-10",
  cookies: "2026-04-10",
} as const;

export type LegalDocument = keyof typeof LEGAL_VERSIONS;

/** Documentos que é preciso aceitar para usar a app (os cookies não bloqueiam). */
export const REQUIRED_DOCUMENTS: LegalDocument[] = ["terms", "privacy"];
