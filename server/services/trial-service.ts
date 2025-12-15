
import { storage } from '../storage';
import { urlBuilder } from '../utils/url-builder';

export interface TrialStatus {
  isActive: boolean;
  daysRemaining: number;
  creditsRemaining: number;
  trialEndDate: Date;
  canUpgrade: boolean;
  planAfterTrial: string;
}

export class TrialService {
  private readonly TRIAL_DURATION_DAYS = 7;
  private readonly TRIAL_CREDITS = 50;

  async getTrialStatus(userId: string): Promise<TrialStatus> {
    const user = await storage.getUserById(userId);
    if (!user) throw new Error('User not found');

    // Use loose typing to access fields potentially not in basic User type but in DB
    const u = user as any; 

    const now = new Date();
    const endDate = u.trialEndDate ? new Date(u.trialEndDate) : new Date(0);
    const isActive = u.isTrialActive && now < endDate;
    const daysRemaining = isActive ? Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : 0;
    
    return {
      isActive: isActive,
      daysRemaining: Math.max(0, daysRemaining),
      creditsRemaining: user.credits,
      trialEndDate: endDate,
      canUpgrade: daysRemaining <= 2 || user.credits < 5,
      planAfterTrial: 'starter',
    };
  }

  async startTrial(userId: string): Promise<boolean> {
    const user = await storage.getUserById(userId);
    if (!user) return false;

    // Prevent abuse
    if ((user as any).trialStartDate) return false;

    const endDate = new Date();
    endDate.setDate(endDate.getDate() + this.TRIAL_DURATION_DAYS);

    await storage.updateUser(userId, {
      credits: this.TRIAL_CREDITS,
      subscriptionPlan: 'trial',
      // @ts-ignore - DB supports these
      trialStartDate: new Date(),
      trialEndDate: endDate,
      isTrialActive: true
    });

    return true;
  }

  async endTrial(userId: string): Promise<void> {
    await storage.updateUser(userId, {
      subscriptionPlan: 'free',
      // @ts-ignore
      isTrialActive: false
    });
  }
}

export const trialService = new TrialService();
