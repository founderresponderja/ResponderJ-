
import { createCipheriv, createDecipheriv, randomBytes, scrypt, pbkdf2 } from 'crypto';
import { promisify } from 'util';
import { Buffer } from 'buffer';

const scryptAsync = promisify(scrypt);
const pbkdf2Async = promisify(pbkdf2);

// ==========================================
// CONFIGURAÇÃO DE SEGURANÇA
// ==========================================

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;

if (!ENCRYPTION_KEY) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('🚨 ERRO CRÍTICO: ENCRYPTION_KEY é obrigatória em produção!');
  } else {
    console.warn('⚠️ AVISO DE SEGURANÇA: ENCRYPTION_KEY não definida. Usando chave de desenvolvimento insegura.');
  }
}

const MASTER_SECRET = ENCRYPTION_KEY || 'dev-temp-key-change-in-production-immediately';

const SECURITY_CONFIG = {
  // AES-256-GCM para encriptação autenticada (Integridade + Confidencialidade)
  algorithm: 'aes-256-gcm' as const,
  keyLength: 32, // 256 bits
  ivLength: 16,  // 128 bits
  saltLength: 32,
  tagLength: 16,
  // Iterações ajustadas para 100k para balancear segurança e performance em operações de lote
  pbkdf2Iterations: 100000, 
  digest: 'sha512'
};

// ==========================================
// FUNÇÕES CORE (DERIVAÇÃO DE CHAVES)
// ==========================================

/**
 * Deriva uma chave segura usando PBKDF2 (Padrão atual)
 */
async function deriveKeyPBKDF2(salt: Buffer): Promise<Buffer> {
  return await pbkdf2Async(
    MASTER_SECRET, 
    salt, 
    SECURITY_CONFIG.pbkdf2Iterations, 
    SECURITY_CONFIG.keyLength, 
    SECURITY_CONFIG.digest
  );
}

/**
 * Deriva uma chave usando scrypt (Legado/Compatibilidade v1)
 */
async function deriveKeyScrypt(salt: Buffer): Promise<Buffer> {
  return (await scryptAsync(
    MASTER_SECRET, 
    salt, 
    SECURITY_CONFIG.keyLength
  )) as Buffer;
}

// ==========================================
// API DE ENCRIPTAÇÃO
// ==========================================

/**
 * Encripta dados usando AES-256-GCM (v2).
 * Formato output: v2:salt:iv:ciphertext:authTag
 */
export async function encryptSensitiveData(plaintext: string): Promise<string> {
  if (!plaintext) return '';

  try {
    const salt = randomBytes(SECURITY_CONFIG.saltLength);
    const iv = randomBytes(SECURITY_CONFIG.ivLength);
    
    // Derivação da chave única para este dado
    const key = await deriveKeyPBKDF2(salt);
    
    const cipher = createCipheriv(SECURITY_CONFIG.algorithm, key, iv);
    
    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return `v2:${salt.toString('hex')}:${iv.toString('hex')}:${encrypted}:${authTag.toString('hex')}`;
  } catch (error) {
    console.error('❌ Falha na encriptação:', error);
    throw new Error('Erro interno de segurança ao encriptar dados.');
  }
}

/**
 * Desencripta dados (Suporta v2 GCM e v1 CBC legado).
 */
export async function decryptSensitiveData(encryptedData: string): Promise<string> {
  if (!encryptedData) return '';

  try {
    // === FORMATO V2 (AES-GCM) ===
    if (encryptedData.startsWith('v2:')) {
      const parts = encryptedData.split(':');
      if (parts.length !== 5) throw new Error('Formato v2 corrompido');
      
      const [, saltHex, ivHex, encrypted, authTagHex] = parts;
      
      const salt = Buffer.from(saltHex, 'hex');
      const iv = Buffer.from(ivHex, 'hex');
      const authTag = Buffer.from(authTagHex, 'hex');
      const key = await deriveKeyPBKDF2(salt);
      
      const decipher = createDecipheriv(SECURITY_CONFIG.algorithm, key, iv);
      decipher.setAuthTag(authTag);
      
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } 
    
    // === FORMATO V1 (AES-CBC Legado) ===
    else if (encryptedData.startsWith('v1:')) {
      const parts = encryptedData.split(':');
      if (parts.length !== 4) throw new Error('Formato v1 corrompido');
      
      const [, saltHex, ivHex, encrypted] = parts;
      
      const salt = Buffer.from(saltHex, 'hex');
      const iv = Buffer.from(ivHex, 'hex');
      const key = await deriveKeyScrypt(salt);
      
      const decipher = createDecipheriv('aes-256-cbc', key, iv);
      
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    }
    
    // === FORMATO DESCONHECIDO ===
    else {
        // Tenta processar como legado simples se tiver estrutura de 3 partes
        if (encryptedData.split(':').length === 3) {
            return await decryptLegacyFormat(encryptedData);
        }
        return ''; // Retorna vazio se não reconhecer formato (fail-safe)
    }
  } catch (error) {
    console.warn(`🔒 Falha na desencriptação (Dados corrompidos ou chave inválida).`);
    return ''; // Falha silenciosa segura
  }
}

// Helper para formato antigo sem prefixo
async function decryptLegacyFormat(data: string): Promise<string> {
    try {
        const [saltHex, ivHex, encrypted] = data.split(':');
        const salt = Buffer.from(saltHex, 'hex');
        const iv = Buffer.from(ivHex, 'hex');
        const key = await deriveKeyScrypt(salt);
        const decipher = createDecipheriv('aes-256-cbc', key, iv);
        let decrypted = decipher.update(encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    } catch { 
        return ''; 
    }
}

// ==========================================
// PROCESSAMENTO EM LOTE (CREDENCIAIS)
// ==========================================

const SENSITIVE_FIELDS = [
  // Social
  'googleAccessToken', 'googleRefreshToken', 'facebookAccessToken', 'instagramAccessToken', 
  'linkedinAccessToken', 'twitterAccessToken', 'googlePassword', 'facebookPassword',
  // Financeiro
  'iban', 'creditCardNumber', 'stripeSecretKey',
  // Identificação
  'nif', 'passportNumber', 'taxId',
  // API Keys
  'openaiApiKey', 'sendgridApiKey', 'apiSecret'
];

/**
 * Encripta automaticamente campos sensíveis num objeto de utilizador.
 */
export async function encryptUserCredentials(userData: Record<string, any>): Promise<Record<string, any>> {
  const result = { ...userData };
  const tasks = [];

  for (const field of SENSITIVE_FIELDS) {
    if (userData[field] && typeof userData[field] === 'string' && userData[field].trim() !== '') {
      // Adiciona à fila de processamento
      tasks.push(
        encryptSensitiveData(userData[field]).then(enc => {
          result[field] = enc;
        })
      );
    }
  }

  if (tasks.length > 0) {
    await Promise.all(tasks);
    console.log(`🔒 Encriptados ${tasks.length} campos sensíveis.`);
  }

  return result;
}

/**
 * Desencripta automaticamente campos sensíveis.
 */
export async function decryptUserCredentials(userData: Record<string, any>): Promise<Record<string, any>> {
  const result = { ...userData };
  const tasks = [];

  for (const field of SENSITIVE_FIELDS) {
    if (userData[field] && typeof userData[field] === 'string') {
      const val = userData[field] as string;
      if (val.startsWith('v1:') || val.startsWith('v2:')) {
        tasks.push(
            decryptSensitiveData(val).then(dec => {
                if (dec) result[field] = dec;
            })
        );
      }
    }
  }

  if (tasks.length > 0) {
    await Promise.all(tasks);
  }

  return result;
}

// ==========================================
// ALIASES & UTILITÁRIOS (COMPATIBILIDADE)
// ==========================================

export const encryptQuick = encryptSensitiveData;
export const decryptQuick = decryptSensitiveData;

// Wrappers seguros para substituir funções legadas inseguras
export function encrypt(data: string): Promise<string> {
    return encryptSensitiveData(data);
}

export function decrypt(data: string): Promise<string> {
    return decryptSensitiveData(data);
}

export function isEncrypted(data: string): boolean {
  if (!data || typeof data !== 'string') return false;
  return data.startsWith('v2:') || data.startsWith('v1:');
}

/**
 * Obtém informações sobre o método de encriptação usado.
 */
export function getEncryptionInfo(encryptedData: string): { version: string; algorithm: string; secure: boolean } {
  if (!encryptedData || typeof encryptedData !== 'string') {
    return { version: 'none', algorithm: 'none', secure: false };
  }
  
  if (encryptedData.startsWith('v2:')) {
    return { version: 'v2', algorithm: 'aes-256-gcm', secure: true };
  } else if (encryptedData.startsWith('v1:')) {
    return { version: 'v1', algorithm: 'aes-256-cbc', secure: false };
  }
  
  return { version: 'unknown', algorithm: 'unknown', secure: false };
}
