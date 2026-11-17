// Permite que os testes (executor nativo do Node, sem dependências) importem ficheiros .ts
// do projeto que usam imports com extensão ".js" (convenção do servidor). Se "x.js" não
// existir, tenta "x.ts".
import { register } from "node:module";

register("data:text/javascript," + encodeURIComponent(`
export async function resolve(specifier, context, next) {
  try {
    return await next(specifier, context);
  } catch (error) {
    if (specifier.startsWith(".") && specifier.endsWith(".js")) {
      return next(specifier.slice(0, -3) + ".ts", context);
    }
    throw error;
  }
}
`), import.meta.url);
