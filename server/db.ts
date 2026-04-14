
import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "../shared/schema.js";

// Configuração obrigatória para Websockets no driver Neon Serverless
neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  console.error("❌ ERRO FATAL: DATABASE_URL não configurada.");
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

console.log("🔌 A iniciar ligação à base de dados Neon...");

// Configuração otimizada do Pool para alta performance
export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 5000, // 5 segundos timeout
  idleTimeoutMillis: 30000, // Fechar conexões inativas após 30s
  max: 20, // Limite máximo de conexões simultâneas (ajustado para Neon)
  ssl: true // Forçar SSL para segurança
});

// Prevenir crash da aplicação em erros inesperados de conexão
pool.on('error', (err) => {
  console.error('💥 Erro inesperado no cliente da base de dados:', err);
  // Não sair do processo, permitir que o pool tente reconectar
});

// Inicialização do ORM com logging apenas em desenvolvimento para evitar IO overhead em produção
export const db = drizzle(pool, { 
  schema,
  logger: process.env.NODE_ENV === 'development' 
});

// Verificação de saúde da conexão no arranque
(async () => {
  try {
    const client = await pool.connect();
    try {
      await client.query('SELECT NOW()');
      console.log("✅ Base de dados conectada e operacional!");
    } finally {
      client.release();
    }
  } catch (err) {
    console.error("❌ Falha crítica ao conectar à base de dados:", err);
  }
})();
