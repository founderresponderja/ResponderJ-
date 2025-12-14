import { storage } from "../storage";
import { nanoid } from "nanoid";

export const referralService = {
  async generateReferralCode(userId: string) {
    // Generate a unique, readable code
    const code = nanoid(8).toUpperCase();
    
    // In production: save this code to the user's profile in DB
    // await storage.updateUser(userId, { referralCode: code });
    
    return code;
  },

  async processReferral(code: string, newUserId: string) {
    // 1. Find the referrer user by code
    const referrer = await storage.getReferralByCode(code);
    
    if (referrer) {
        // 2. Award credits to the referrer
        await storage.addCreditsToUser(referrer.referrerId, 20, "Bónus de Referência");
        
        // 3. Award credits to the new user
        await storage.addCreditsToUser(newUserId, 20, "Bónus de Inscrição por Convite");
        
        // 4. Mark referral as completed
        await storage.updateReferral(referrer.id, { 
            status: "completed", 
            referredUserId: newUserId,
            completedAt: new Date()
        });
        
        return true;
    }
    return false;
  }
};