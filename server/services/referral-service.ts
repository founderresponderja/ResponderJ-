
import { storage } from "../storage.js";
import { nanoid } from "nanoid";
import type { InsertReferral, InsertReferralReward, Referral } from "../../shared/schema.js";

export class ReferralService {
  
  // Gerar código de referência único
  async generateReferralCode(userId: string): Promise<string> {
    // We don't use userId in nanoid generation, but might be used for context or logging if extended
    const code = nanoid(8).toLowerCase();
    
    // Verificar se o código já existe
    const existingReferral = await storage.getReferralByCode(code);
    if (existingReferral) {
      // Se existir, gerar novamente (recursivo)
      return this.generateReferralCode(userId);
    }
    
    return code;
  }

  // Criar convite de referência
  async createReferral(referrerId: string, email?: string): Promise<Referral> {
    const referralCode = await this.generateReferralCode(referrerId);
    
    const referralData: InsertReferral = {
      referrerId: Number(referrerId),
      referralCode,
      email: email?.toLowerCase(),
      status: 'pending',
      creditsEarned: 0,
    };

    return await storage.createReferral(referralData);
  }

  // Processar registo através de código de referência
  async processReferralSignup(referralCode: string, newUserId: string): Promise<void> {
    const referral = await storage.getReferralByCode(referralCode);
    
    if (!referral || referral.status !== 'pending') {
      console.log('Código de referência inválido ou já usado:', referralCode);
      return;
    }

    // Atualizar referência para 'registered' (completed)
    // Note: The provided logic used 'registered' but storage has 'completed'. Adapting.
    // Actually the user provided code used 'registered' then 'completed' later. I'll stick to 'completed' final state.
    // The provided snippet: updateReferralStatus(..., 'registered', ...) then later 'completed'.
    // I will simplify to just completing it as per common flows, or follow logic if needed.
    // Let's implement as requested: registered -> bonus -> completed.
    
    // 1. Mark as registered/linked
    await storage.updateReferralStatus(referral.id, 'registered', newUserId);
    
    // 2. Give bonuses
    await this.giveSignupBonus(newUserId, referral.id);
    await this.giveReferrerReward(referral.referrerId.toString(), referral.id);
    
    // 3. Mark as fully completed
    await storage.updateReferralStatus(referral.id, 'completed');
  }

  // Dar bonus de registo ao novo utilizador
  private async giveSignupBonus(userId: string, referralId: number): Promise<void> {
    const rewardData: InsertReferralReward = {
      userId: Number(userId),
      referralId,
      type: 'signup_bonus',
      credits: 5,
      description: 'Bonus de boas-vindas por convite',
    };

    await storage.createReferralReward(rewardData);
    await storage.addCreditsToUser(userId, 5, 'Bonus de convite - novo utilizador');
  }

  // Dar recompensa ao utilizador que convidou
  private async giveReferrerReward(referrerId: string, referralId: number): Promise<void> {
    const rewardData: InsertReferralReward = {
      userId: Number(referrerId),
      referralId,
      type: 'referrer_bonus',
      credits: 5,
      description: 'Recompensa por convite bem-sucedido',
    };

    await storage.createReferralReward(rewardData);
    await storage.addCreditsToUser(referrerId, 5, 'Recompensa de convite - amigo registado');
  }

  // Obter estatísticas de referências do utilizador
  async getUserReferralStats(userId: string) {
    const stats = await storage.getReferralStats(userId);
    const referrals = await storage.getReferralsByUser(userId);
    const rewards = await storage.getReferralRewardsByUser(userId);
    
    return {
      ...stats,
      referrals,
      rewards,
      referralLink: `${process.env.FRONTEND_URL || 'https://responderja.com'}/auth?ref=${await this.getUserReferralCode(userId)}`,
    };
  }

  // Obter código de referência do utilizador (criar se não existir)
  async getUserReferralCode(userId: string): Promise<string> {
    const existingReferrals = await storage.getReferralsByUser(userId);
    
    // Se já tem um código ativo (pending), usar esse
    const activeReferral = existingReferrals.find(r => r.status === 'pending');
    if (activeReferral) {
      return activeReferral.referralCode;
    }
    
    // Criar novo código de referência
    const newReferral = await this.createReferral(userId);
    return newReferral.referralCode;
  }

  // Validar código de referência
  async validateReferralCode(code: string): Promise<{ valid: boolean; referrerId?: string }> {
    const referral = await storage.getReferralByCode(code);
    
    if (!referral || referral.status !== 'pending') {
      return { valid: false };
    }
    
    return { 
      valid: true, 
      referrerId: referral.referrerId.toString() 
    };
  }

  // Obter link de partilha formatado
  formatShareLink(code: string, platform: 'whatsapp' | 'email' | 'copy' = 'copy'): string {
    const baseUrl = process.env.FRONTEND_URL || 'https://responderja.com';
    const referralUrl = `${baseUrl}/auth?ref=${code}`;
    const message = 'Junta-te ao Responder Já e recebe 5 respostas grátis! Eu também ganho 5 quando te registares. 🚀';
    
    switch (platform) {
      case 'whatsapp':
        return `https://wa.me/?text=${encodeURIComponent(`${message}\n\n${referralUrl}`)}`;
      case 'email':
        return `mailto:?subject=${encodeURIComponent('Convite para Responder Já')}&body=${encodeURIComponent(`${message}\n\n${referralUrl}`)}`;
      default:
        return referralUrl;
    }
  }
}

export const referralService = new ReferralService();
