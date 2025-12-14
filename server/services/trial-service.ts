import { storage } from "../storage";

export const trialService = {
  async getTrialStatus(userId: string) {
    const user = await storage.getUser(userId);
    if (!user) return { isActive: false, daysRemaining: 0 };

    // Assuming user has a createdAt field, calculate 7 days trial
    const createdAt = new Date(user.createdAt || Date.now());
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - createdAt.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    // Check if plan is 'trial' (checking both legacy fields for safety)
    const isTrialPlan = user.selectedPlan === 'trial' || (user as any).subscriptionPlan === 'trial';
    
    const daysRemaining = Math.max(0, 7 - diffDays);
    const isActive = isTrialPlan && daysRemaining > 0;

    return {
      isActive,
      daysRemaining,
      totalDays: 7,
      creditsLeft: user.credits
    };
  },

  async startTrial(userId: string) {
    const user = await storage.getUser(userId);
    if (!user) return false;

    await storage.updateUser(userId, {
      selectedPlan: 'trial',
      // @ts-ignore - Handle specific schema property
      subscriptionPlan: 'trial',
      credits: 50 // Default trial credits
    });

    return true;
  }
};