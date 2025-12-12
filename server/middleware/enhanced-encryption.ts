/**
 * RESPONDER JÁ - SISTEMA DE ENCRIPTAÇÃO MILITAR AVANÇADO
 * AES-256-GCM + PBKDF2 com 200.000 iterações para máxima segurança
 */

import crypto from 'crypto';
import { promisify } from 'util';
import process from 'process';
import { Buffer } from 'buffer';

const pbkdf2 = promisify(crypto.pbkdf2);

// Configurações ultra-seguras
const ENCRYPTION_CONFIG = {
  algorithm: 'aes-256-gcm',
  keyLength: 32,
  ivLength: 16,
  saltLength: 32,
  tagLength: 16,
  iterations: 200000, // 200k iterações para máxima segurança
  digest: 'sha512'
} as const;

// Obter chave mestra do ambiente
const getMasterKey = (): string => {
  const key = process.env.ENCRYPTION_KEY;
  if (!key || key.length < 32) {
    // Fallback para dev (segurança)
    if (process.env.NODE_ENV !== 'production') {
       return 'default-dev-key-must-be-32-chars-long-at-least';
    }
    throw new Error('ENCRYPTION_KEY deve ter pelo menos 32 caracteres');
  }
  return key;
};

// Derivar chave de encriptação segura
const deriveKey = async (password: string, salt: Buffer): Promise<Buffer> => {
  return pbkdf2(
    password,
    salt,
    ENCRYPTION_CONFIG.iterations,
    ENCRYPTION_CONFIG.keyLength,
    ENCRYPTION_CONFIG.digest
  );
};

// Encriptar dados sensíveis
export const encryptData = async (data: string, context?: string): Promise<string> => {
  try {
    if (!data) return data;
    
    const masterKey = getMasterKey();
    const salt = crypto.randomBytes(ENCRYPTION_CONFIG.saltLength);
    const iv = crypto.randomBytes(ENCRYPTION_CONFIG.ivLength);
    
    // Adicionar contexto à chave para evitar rainbow tables
    const keyMaterial = context ? `${masterKey}:${context}` : masterKey;
    const key = await deriveKey(keyMaterial, salt);
    
    const cipher = crypto.createCipheriv(ENCRYPTION_CONFIG.algorithm, key, iv);
    cipher.setAAD(salt); // Dados adicionais autenticados
    
    let encrypted = cipher.update(data, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    
    const authTag = cipher.getAuthTag();
    
    // Combinar: salt + iv + authTag + encrypted
    const combined = Buffer.concat([
      salt,
      iv,
      authTag,
      Buffer.from(encrypted, 'base64')
    ]);
    
    return combined.toString('base64');
  } catch (error) {
    console.error('Erro na encriptação:', error);
    throw new Error('Falha na encriptação de dados');
  }
};

// Desencriptar dados sensíveis
export const decryptData = async (encryptedData: string, context?: string): Promise<string> => {
  try {
    if (!encryptedData) return encryptedData;
    
    const masterKey = getMasterKey();
    const combined = Buffer.from(encryptedData, 'base64');
    
    // Extrair componentes
    const salt = combined.subarray(0, ENCRYPTION_CONFIG.saltLength);
    const iv = combined.subarray(ENCRYPTION_CONFIG.saltLength, ENCRYPTION_CONFIG.saltLength + ENCRYPTION_CONFIG.ivLength);
    const authTag = combined.subarray(
      ENCRYPTION_CONFIG.saltLength + ENCRYPTION_CONFIG.ivLength,
      ENCRYPTION_CONFIG.saltLength + ENCRYPTION_CONFIG.ivLength + ENCRYPTION_CONFIG.tagLength
    );
    const encrypted = combined.subarray(ENCRYPTION_CONFIG.saltLength + ENCRYPTION_CONFIG.ivLength + ENCRYPTION_CONFIG.tagLength);
    
    // Derivar chave
    const keyMaterial = context ? `${masterKey}:${context}` : masterKey;
    const key = await deriveKey(keyMaterial, salt);
    
    const decipher = crypto.createDecipheriv(ENCRYPTION_CONFIG.algorithm, key, iv);
    decipher.setAAD(salt);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted, undefined, 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('Erro na desencriptação:', error);
    throw new Error('Falha na desencriptação de dados');
  }
};

// Encriptar credenciais de utilizador
export const encryptUserCredentials = async (userData: any, isUpdate = false): Promise<any> => {
  const encryptedData = { ...userData };
  
  // Campos sensíveis que necessitam encriptação
  const sensitiveFields = [
    'password',
    'facebookToken',
    'facebookPageId',
    'instagramToken',
    'instagramBusinessId',
    'googleMyBusinessToken',
    'tiktokToken',
    'linkedinToken',
    'email' // Encriptar email para conformidade GDPR
  ];
  
  for (const field of sensitiveFields) {
    if (encryptedData[field]) {
      encryptedData[field] = await encryptData(encryptedData[field], `user:${field}`);
    }
  }
  
  // Timestamp de encriptação para auditoria
  if (!isUpdate) {
    encryptedData.encryptedAt = new Date();
  } else {
    encryptedData.updatedAt = new Date();
  }
  
  return encryptedData;
};

// Desencriptar credenciais de utilizador
export const decryptUserCredentials = async (userData: any): Promise<any> => {
  if (!userData) return userData;
  
  const decryptedData = { ...userData };
  
  const sensitiveFields = [
    'password',
    'facebookToken',
    'facebookPageId',
    'instagramToken',
    'instagramBusinessId',
    'googleMyBusinessToken',
    'tiktokToken',
    'linkedinToken',
    'email'
  ];
  
  for (const field of sensitiveFields) {
    if (decryptedData[field]) {
      try {
        decryptedData[field] = await decryptData(decryptedData[field], `user:${field}`);
      } catch (error) {
        console.warn(`Falha ao desencriptar campo ${field}:`, error);
        // Manter valor encriptado se a desencriptação falhar
      }
    }
  }
  
  return decryptedData;
};

// Hash seguro para passwords
export const hashPassword = async (password: string): Promise<string> => {
  const bcrypt = await import('bcrypt');
  // 15 rounds para máxima segurança (aumentado de 12)
  return bcrypt.hash(password, 15);
};

// Verificar password
export const verifyPassword = async (password: string, hash: string): Promise<boolean> => {
  const bcrypt = await import('bcrypt');
  return bcrypt.compare(password, hash);
};

// Gerar token seguro
export const generateSecureToken = (length: number = 32): string => {
  return crypto.randomBytes(length).toString('base64url');
};

// Função para rotação de chaves (para uso futuro)
export const rotateEncryptionKey = async (oldKey: string, newKey: string): Promise<boolean> => {
  // Esta função seria usada para rotacionar chaves em produção
  // Requer migração cuidadosa dos dados existentes
  console.log('Rotação de chaves não implementada - requer migração manual');
  return false;
};