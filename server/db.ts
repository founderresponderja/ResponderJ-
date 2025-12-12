import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

// Configuração obrigatória para Websockets no driver Neon Serverless
neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  console.error("❌ ERRO FATAL: DATABASE_URL não configurada.");
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

console.log("🔌 A iniciar ligação à base de dados Neon...");

// Configuração otimizada do Pool
export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 5000, // 5 segundos timeout
  max: 20, // Limite máximo de conexões simultâneas
});

// Prevenir crash da aplicação em erros inesperados de conexão
pool.on('error', (err) => {
  console.error('💥 Erro inesperado no cliente da base de dados:', err);
});

// Inicialização do ORM com logging apenas em desenvolvimento
export const db = drizzle({ 
  client: pool, 
  schema,
  logger: process.env.NODE_ENV !== 'production' // Logs SQL ativos apenas em dev
});

// Verificação de saúde da conexão no arranque
pool.query('SELECT NOW()').then(() => {
  console.log("✅ Base de dados conectada e operacional!");
}).catch((err) => {
  console.error("❌ Falha crítica ao conectar à base de dados:", err);
});