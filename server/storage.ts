
import { 
  users, leads, automationRules, responses, establishments, creditTransactions, 
  subscriptions, corporateSocialAccounts, corporatePosts, agencyMembers, 
  agencyInvitations, agencyAdminDelegations, referrals, referralRewards, pageContents, 
  InsertUser, User, InsertLead, Lead, InsertAutomationRule, AutomationRule,
  InsertResponse, Response, InsertEstablishment, Establishment, 
  InsertCreditTransaction, CreditTransaction, InsertSubscription, Subscription,
  InsertEmailSequence, EmailSequence, InsertInvoice, Invoice, InsertInvoiceItem, InvoiceItem,
  InsertInvoiceSettings, InvoiceSettings, InsertReferral, Referral, InsertReferralReward, ReferralReward,
  creditPackages, InsertCreditPackage, CreditPackage,
  invoices, invoiceItems, invoiceSettings, qualityFeedback, InsertQualityFeedback, QualityFeedback
} from "../shared/schema.js";
import { db, pool } from "./db.js";
import { eq, ilike, or, and, desc, sql, gte } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";

const PostgresSessionStore = connectPg(session);

export interface IStorage {
  sessionStore: session.Store;
  
  // User methods
  getUser(id: string | number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserById(id: string | number): Promise<User | undefined>;
  getUserByStripeCustomerId(customerId: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string | number, user: Partial<User>): Promise<User>;
  deleteUser(id: string | number): Promise<void>;
  getAllUsersForAdmin(): Promise<User[]>;
  getAdminUsers(): Promise<User[]>;
  
  // Auth methods
  setPasswordResetToken(userId: number, token: string | null, expires: Date | null): Promise<void>;
  getUserByPasswordResetToken(token: string): Promise<User | undefined>;
  resetUserPassword(userId: number, password: string): Promise<void>;
  getUserByEmailVerificationToken(token: string): Promise<User | undefined>;
  
  // Lead methods
  getLeads(offset: number, limit: number): Promise<Lead[]>;
  getLeadsCount(): Promise<number>;
  createLead(lead: InsertLead): Promise<Lead>;
  updateLead(id: number | string, lead: Partial<Lead>): Promise<Lead>;
  deleteLead(id: number | string): Promise<void>;
  checkLeadExists(email: string): Promise<boolean>;
  searchLeads(query: string): Promise<Lead[]>;
  getLeadsByStatus(status: string): Promise<Lead[]>;
  importLeadsFromCSV(csvData: any[]): Promise<{ imported: number; skipped: number; errors: string[] }>;
  exportLeadsToCSV(): Promise<string>;
  getLeadsForEmailSequence(): Promise<Lead[]>;
  updateLeadEmailStatus(id: number | string, status: string, date?: Date): Promise<void>;
  getLeadsByEmailStatus(status: string): Promise<Lead[]>;
  
  // Automation Rules
  getAutomationRules(userId: number | string): Promise<AutomationRule[]>;
  createAutomationRule(rule: InsertAutomationRule): Promise<AutomationRule>;
  updateAutomationRule(id: number | string, rule: Partial<AutomationRule>): Promise<AutomationRule>;
  deleteAutomationRule(id: number | string): Promise<void>;
  
  // Responses & AI
  getUserAiResponses(userId: number | string, limit?: number): Promise<Response[]>;
  createAiResponse(response: InsertResponse): Promise<Response>;
  updateAiResponse(id: number | string, response: Partial<Response>): Promise<Response>;
  
  // Credit & Billing
  getUserCreditTransactions(userId: number | string): Promise<CreditTransaction[]>;
  createCreditTransaction(transaction: InsertCreditTransaction): Promise<CreditTransaction>;
  addCreditsToUser(userId: number | string, amount: number, description: string): Promise<void>;
  updateUserCredits(userId: number | string, credits: number): Promise<void>;
  deductUserCreditsAtomic(userId: number | string, amount: number): Promise<{ ok: boolean; creditsRemaining: number }>;
  getUserCreditBalance(userId: number | string): Promise<number>;
  getUserSubscription(userId: number | string): Promise<Subscription | undefined>;
  updateUserStripeInfo(userId: number | string, info: { customerId?: string, subscriptionId?: string }): Promise<void>;
  updateUserStripeCustomerId(userId: number | string, customerId: string): Promise<void>;
  
  // Credit Packages
  getAllCreditPackages(): Promise<CreditPackage[]>;
  getCreditPackage(id: string): Promise<CreditPackage | undefined>;
  getCreditPackages(): Promise<CreditPackage[]>;
  createCreditPackage(pkg: InsertCreditPackage): Promise<CreditPackage>;
  getUserRecentCreditTransactions(userId: number | string, days: number): Promise<CreditTransaction[]>;
  getCreditSalesStats(): Promise<any>;

  // Business Profile / Establishment
  getBusinessProfile(userId: number | string): Promise<Establishment | undefined>;
  createBusinessProfile(profile: InsertEstablishment): Promise<Establishment>;
  
  // Sentiment
  createSentimentAnalysis(data: any): Promise<any>;
  
  // Audit
  createAuditLog(log: any): Promise<void>;
  
  // Agency
  getAgencyInvitationByToken(token: string): Promise<any>;
  acceptAgencyInvitation(token: string, userId: number | string): Promise<void>;
  getAgencyMembers(agencyId: number | string): Promise<any[]>;
  getAgencyMemberCount(agencyId: number | string): Promise<{ total: number }>;
  inviteAgencyMember(agencyId: number | string, email: string, role: string, invitedBy: number | string): Promise<any>;
  updateAgencyMember(memberId: number | string, updates: any): Promise<any>;
  getAgencyDelegations(agencyId: number | string): Promise<any[]>;
  createAgencyDelegation(delegation: any): Promise<any>;
  
  // Corporate Social
  getCorporateSocialAccounts(): Promise<any[]>;
  getCorporateSocialAccountsByPlatforms(platforms: string[]): Promise<any[]>;
  getCorporateSocialAccount(id: string): Promise<any>;
  saveCorporateSocialAccount(account: any): Promise<void>;
  updateCorporateSocialAccount(id: string, updates: any): Promise<void>;
  deleteCorporateSocialAccount(id: string): Promise<void>;
  createCorporatePost(post: any): Promise<void>;
  getCorporatePosts(params: { page: number, limit: number }): Promise<any[]>;
  getCorporateSocialStats(): Promise<any>;
  
  // Referral
  getReferralByCode(code: string): Promise<Referral | undefined>;
  createReferral(referral: InsertReferral): Promise<Referral>;
  updateReferral(id: number, updates: Partial<Referral>): Promise<void>;
  updateReferralStatus(id: number, status: string, newUserId?: string): Promise<void>;
  createReferralReward(reward: InsertReferralReward): Promise<void>;
  getReferralStats(userId: string | number): Promise<any>;
  getReferralsByUser(userId: string | number): Promise<Referral[]>;
  getReferralRewardsByUser(userId: string | number): Promise<ReferralReward[]>;
  
  // Stats
  getSystemStats(): Promise<any>;
  getUserStats(userId: number | string): Promise<any>;
  
  // CSV Uploads
  createCsvUpload(data: any): Promise<any>;
  getCsvUpload(id: string): Promise<any>;

  // Invoicing
  getInvoiceSettings(userId: number | string): Promise<InvoiceSettings | undefined>;
  createInvoice(invoice: InsertInvoice): Promise<Invoice>;
  createInvoiceItem(item: InsertInvoiceItem): Promise<InvoiceItem>;
  updateInvoiceSequence(settingsId: number | string, sequence: number): Promise<void>;
  createInvoiceAuditLog(log: any): Promise<void>;
  getInvoice(id: number | string): Promise<Invoice | undefined>;
  getInvoiceWithDetails(id: number | string): Promise<Invoice & { items: InvoiceItem[] } | undefined>;
  updateInvoiceStatus(id: number | string, status: string): Promise<void>;
  updateInvoiceATData(id: number | string, data: any): Promise<void>;
  updateInvoiceATError(id: number | string, error: string): Promise<void>;
  updateInvoicePdfPath(id: number | string, path: string): Promise<void>;
  updateInvoiceEmailSent(id: number | string, sent: boolean, date: Date): Promise<void>;

  // Quality Feedback
  createQualityFeedback(feedback: InsertQualityFeedback): Promise<QualityFeedback>;
  getQualityFeedback(userId?: number | string, since?: Date): Promise<QualityFeedback[]>;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    this.sessionStore = new PostgresSessionStore({
      pool,
      createTableIfMissing: true,
    });
  }

  // Users
  async getUser(id: string | number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, Number(id)));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async getUserById(id: string | number): Promise<User | undefined> {
    return this.getUser(id);
  }

  async getUserByStripeCustomerId(customerId: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.stripeCustomerId, customerId));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUser(id: string | number, updateUser: Partial<User>): Promise<User> {
    const [user] = await db.update(users).set(updateUser).where(eq(users.id, Number(id))).returning();
    return user;
  }

  async deleteUser(id: string | number): Promise<void> {
    await db.delete(users).where(eq(users.id, Number(id)));
  }

  async getAllUsersForAdmin(): Promise<User[]> {
    return await db.select().from(users);
  }

  async getAdminUsers(): Promise<User[]> {
    return await db.select().from(users).where(
      or(
        eq(users.isAdmin, true),
        eq(users.isSuperAdmin, true)
      )
    );
  }

  // Auth
  async setPasswordResetToken(userId: number, token: string | null, expires: Date | null): Promise<void> {
    await db.update(users).set({
      passwordResetToken: token,
      passwordResetExpires: expires
    }).where(eq(users.id, userId));
  }

  async getUserByPasswordResetToken(token: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.passwordResetToken, token));
    return user;
  }

  async resetUserPassword(userId: number, password: string): Promise<void> {
    await db.update(users).set({
      password,
      passwordResetToken: null,
      passwordResetExpires: null
    }).where(eq(users.id, userId));
  }

  async getUserByEmailVerificationToken(token: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.emailVerificationToken, token));
    return user;
  }

  // Leads
  async getLeads(offset: number, limit: number): Promise<Lead[]> {
    return await db.select().from(leads).limit(limit).offset(offset);
  }

  async getLeadsCount(): Promise<number> {
    const [result] = await db.select({ count: sql<number>`count(*)` }).from(leads);
    return Number(result.count);
  }

  async createLead(lead: InsertLead): Promise<Lead> {
    const [newLead] = await db.insert(leads).values(lead).returning();
    return newLead;
  }

  async updateLead(id: number | string, leadData: Partial<Lead>): Promise<Lead> {
    const [updatedLead] = await db.update(leads).set(leadData).where(eq(leads.id, Number(id))).returning();
    return updatedLead;
  }

  async deleteLead(id: number | string): Promise<void> {
    await db.delete(leads).where(eq(leads.id, Number(id)));
  }

  async checkLeadExists(email: string): Promise<boolean> {
    // Optimized check using simple select 1
    const [lead] = await db.select({ id: leads.id }).from(leads).where(eq(leads.email, email)).limit(1);
    return !!lead;
  }

  async searchLeads(query: string): Promise<Lead[]> {
    return await db.select().from(leads).where(
      or(
        ilike(leads.companyName, `%${query}%`),
        ilike(leads.email, `%${query}%`),
        ilike(leads.contactName, `%${query}%`)
      )
    ).limit(50); // Add limit to prevent massive results
  }

  async getLeadsByStatus(status: string): Promise<Lead[]> {
    return await db.select().from(leads).where(eq(leads.status, status));
  }

  async importLeadsFromCSV(csvData: any[]): Promise<{ imported: number; skipped: number; errors: string[] }> {
    // This method processes row by row for safety, but could be batch inserted for performance
    const rowPromises = csvData.map(async (row, index) => {
      try {
        if (!row.email || !row.companyName) return { status: 'error', error: `Linha ${index + 1}: falta email ou nome da empresa` };
        
        // Validação de email
        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        if (!emailRegex.test(row.email.trim())) {
          return { status: 'error', error: `Linha ${index + 1}: Email inválido (${row.email})` };
        }

        const exists = await this.checkLeadExists(row.email);
        if (exists) return { status: 'skipped' };
        await this.createLead({
          companyName: row.companyName,
          contactName: row.contactName || '',
          email: row.email.toLowerCase().trim(),
          phone: row.phone || '',
          website: row.website || '',
          industry: row.industry || '',
          region: row.region || '',
          businessType: row.businessType || '',
          source: 'csv',
          status: 'novo',
          emailStatus: 'pending',
        });
        return { status: 'imported' };
      } catch (error) {
        return { status: 'error', error: `Erro na linha ${index + 1}: ${error}` };
      }
    });
    const results = await Promise.allSettled(rowPromises);
    return results.filter(result => result.status === 'fulfilled').map(result => (result as PromiseFulfilledResult<any>).value).reduce((acc, result) => {
      if (result.status === 'imported') acc.imported++;
      else if (result.status === 'skipped') acc.skipped++;
      else if (result.status === 'error') acc.errors.push(result.error);
      return acc;
    }, { imported: 0, skipped: 0, errors: [] as string[] });
  }

  async exportLeadsToCSV(): Promise<string> {
    const allLeads = await db.select().from(leads);
    if (allLeads.length === 0) return "";
    
    const headers = Object.keys(allLeads[0]).join(",");
    const rows = allLeads.map(l => Object.values(l).map(v => typeof v === 'string' ? `"${v}"` : v).join(","));
    return [headers, ...rows].join("\n");
  }

  async getLeadsForEmailSequence(): Promise<Lead[]> {
    return await db.select().from(leads).where(
      or(
        eq(leads.emailStatus, 'pending'),
        eq(leads.emailStatus, 'first_sent'),
        eq(leads.emailStatus, 'second_sent')
      )
    );
  }

  async updateLeadEmailStatus(id: number | string, status: string, date?: Date): Promise<void> {
    const updateData: any = { emailStatus: status };
    if (date) {
      if (status === 'first_sent') updateData.firstEmailSentAt = date;
      if (status === 'second_sent') updateData.secondEmailSentAt = date;
      if (status === 'third_sent') updateData.thirdEmailSentAt = date;
    }
    await db.update(leads).set(updateData).where(eq(leads.id, Number(id)));
  }

  async getLeadsByEmailStatus(status: string): Promise<Lead[]> {
    return await db.select().from(leads).where(eq(leads.emailStatus, status));
  }

  // Automation Rules
  async getAutomationRules(userId: number | string): Promise<AutomationRule[]> {
    return await db.select().from(automationRules).where(eq(automationRules.userId, Number(userId)));
  }

  async createAutomationRule(rule: InsertAutomationRule): Promise<AutomationRule> {
    const [newRule] = await db.insert(automationRules).values(rule).returning();
    return newRule;
  }

  async updateAutomationRule(id: number | string, rule: Partial<AutomationRule>): Promise<AutomationRule> {
    const [updatedRule] = await db.update(automationRules).set(rule).where(eq(automationRules.id, Number(id))).returning();
    return updatedRule;
  }

  async deleteAutomationRule(id: number | string): Promise<void> {
    await db.delete(automationRules).where(eq(automationRules.id, Number(id)));
  }

  // Responses & AI
  async getUserAiResponses(userId: number | string, limit: number = 100): Promise<Response[]> {
    return await db.select().from(responses).where(eq(responses.userId, Number(userId))).limit(limit).orderBy(desc(responses.createdAt));
  }

  async createAiResponse(response: InsertResponse): Promise<Response> {
    const [newResponse] = await db.insert(responses).values(response).returning();
    return newResponse;
  }

  async updateAiResponse(id: number | string, response: Partial<Response>): Promise<Response> {
    const [updatedResponse] = await db.update(responses).set(response).where(eq(responses.id, Number(id))).returning();
    return updatedResponse;
  }

  // Credit & Billing
  async getUserCreditTransactions(userId: number | string): Promise<CreditTransaction[]> {
    return await db.select().from(creditTransactions).where(eq(creditTransactions.userId, Number(userId))).orderBy(desc(creditTransactions.createdAt));
  }

  async createCreditTransaction(transaction: InsertCreditTransaction): Promise<CreditTransaction> {
    const [newTransaction] = await db.insert(creditTransactions).values(transaction).returning();
    return newTransaction;
  }

  async addCreditsToUser(userId: number | string, amount: number, description: string): Promise<void> {
    // Use atomic update
    await db.update(users)
      .set({ credits: sql`${users.credits} + ${amount}` })
      .where(eq(users.id, Number(userId)));
      
    await this.createCreditTransaction({
      userId: Number(userId),
      type: 'bonus',
      amount,
      description
    });
  }

  async updateUserCredits(userId: number | string, credits: number): Promise<void> {
    await db.update(users).set({ credits }).where(eq(users.id, Number(userId)));
  }

  async deductUserCreditsAtomic(
    userId: number | string,
    amount: number
  ): Promise<{ ok: boolean; creditsRemaining: number }> {
    try {
      const result = await db
        .update(users)
        .set({
          credits: sql`${users.credits} - ${amount}`,
          creditsUsedThisPeriod: sql`COALESCE(${users.creditsUsedThisPeriod}, 0) + ${amount}`,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(users.id, Number(userId)),
            gte(users.credits, amount)
          )
        )
        .returning({ creditsRemaining: users.credits });

      if (result.length === 0) {
        const current = await this.getUserCreditBalance(userId);
        return { ok: false, creditsRemaining: current };
      }

      return {
        ok: true,
        creditsRemaining: result[0].creditsRemaining,
      };
    } catch (error) {
      console.error("[storage.deductUserCreditsAtomic] error:", error);
      return { ok: false, creditsRemaining: 0 };
    }
  }

  async getUserCreditBalance(userId: number | string): Promise<number> {
    const user = await this.getUser(userId);
    return user?.credits || 0;
  }

  async getUserSubscription(userId: number | string): Promise<Subscription | undefined> {
    const [sub] = await db.select().from(subscriptions).where(eq(subscriptions.userId, Number(userId)));
    return sub;
  }

  async updateUserStripeInfo(userId: number | string, info: { customerId?: string, subscriptionId?: string }): Promise<void> {
    const updateData: any = {};
    if (info.customerId) updateData.stripeCustomerId = info.customerId;
    if (info.subscriptionId) updateData.stripeSubscriptionId = info.subscriptionId;
    
    await db.update(users).set(updateData).where(eq(users.id, Number(userId)));
  }

  async updateUserStripeCustomerId(userId: number | string, customerId: string): Promise<void> {
    await this.updateUserStripeInfo(userId, { customerId });
  }

  // Credit Packages
  async getAllCreditPackages(): Promise<CreditPackage[]> {
    return await db.select().from(creditPackages).orderBy(creditPackages.sortOrder);
  }

  async getCreditPackages(): Promise<CreditPackage[]> {
    return this.getAllCreditPackages();
  }

  async getCreditPackage(id: string): Promise<CreditPackage | undefined> {
    const [pkg] = await db.select().from(creditPackages).where(eq(creditPackages.id, id));
    return pkg;
  }

  async createCreditPackage(pkg: InsertCreditPackage): Promise<CreditPackage> {
      // Generate ID if missing (assuming not strictly auto-generated by DB for text PK)
      const pkgWithId = { ...pkg };
      if (!pkgWithId.id) {
         pkgWithId.id = pkg.name ? pkg.name.toLowerCase().replace(/\s+/g, '-') : Math.random().toString(36).substr(2, 8);
      }
      const [newPkg] = await db.insert(creditPackages).values(pkgWithId).returning();
      return newPkg;
  }

  async getUserRecentCreditTransactions(userId: number | string, days: number): Promise<CreditTransaction[]> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    return await db.select().from(creditTransactions)
      .where(and(
        eq(creditTransactions.userId, Number(userId)),
        sql`${creditTransactions.createdAt} >= ${cutoffDate}`
      ))
      .orderBy(desc(creditTransactions.createdAt));
  }

  async getCreditSalesStats(): Promise<any> {
    const sales = await db.select().from(creditTransactions).where(eq(creditTransactions.type, 'upsell'));
    const totalSales = sales.length;
    const totalCredits = sales.reduce((sum, tx) => sum + (tx.amount || 0), 0);
    return {
        totalSales,
        totalCredits,
        totalRevenue: 0,
        topPackages: []
    };
  }

  // Business Profile
  async getBusinessProfile(userId: number | string): Promise<Establishment | undefined> {
    const [profile] = await db.select().from(establishments).where(eq(establishments.userId, Number(userId)));
    return profile;
  }

  async createBusinessProfile(profile: InsertEstablishment): Promise<Establishment> {
    const existing = await this.getBusinessProfile(profile.userId);
    if (existing) {
      const [updated] = await db.update(establishments).set(profile).where(eq(establishments.id, existing.id)).returning();
      return updated;
    }
    const [newProfile] = await db.insert(establishments).values(profile).returning();
    return newProfile;
  }

  // Sentiment
  async createSentimentAnalysis(data: any): Promise<any> {
    // For now, just logging or fake saving if table doesn't exist
    return { ...data, id: Date.now() };
  }

  // Audit
  async createAuditLog(log: any): Promise<void> {
    // Ideally insert into an audit_logs table
  }

  // Agency
  async getAgencyInvitationByToken(token: string): Promise<any> {
    const [invite] = await db.select().from(agencyInvitations).where(eq(agencyInvitations.token, token));
    return invite;
  }

  async acceptAgencyInvitation(token: string, userId: number | string): Promise<void> {
    const invite = await this.getAgencyInvitationByToken(token);
    if (!invite) throw new Error("Invite not found");
    
    await db.update(agencyInvitations).set({ 
      status: 'accepted', 
      acceptedAt: new Date(), 
      acceptedBy: Number(userId) 
    }).where(eq(agencyInvitations.token, token));
    
    await db.insert(agencyMembers).values({
      agencyId: invite.agencyId,
      userId: Number(userId),
      role: invite.role,
      status: 'active',
      invitedBy: invite.invitedBy,
      joinedAt: new Date()
    });
  }

  async getAgencyMembers(agencyId: number | string): Promise<any[]> {
    return await db.select().from(agencyMembers).where(eq(agencyMembers.agencyId, Number(agencyId)));
  }

  async getAgencyMemberCount(agencyId: number | string): Promise<{ total: number }> {
    const members = await this.getAgencyMembers(agencyId);
    return { total: members.length };
  }

  async inviteAgencyMember(agencyId: number | string, email: string, role: string, invitedBy: number | string): Promise<any> {
    const token = Math.random().toString(36).substring(2);
    const [invite] = await db.insert(agencyInvitations).values({
      agencyId: Number(agencyId),
      email,
      role,
      token,
      invitedBy: Number(invitedBy),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    }).returning();
    return invite;
  }

  async updateAgencyMember(memberId: number | string, updates: any): Promise<any> {
    const [member] = await db.update(agencyMembers).set(updates).where(eq(agencyMembers.id, Number(memberId))).returning();
    return member;
  }

  async getAgencyDelegations(agencyId: number | string): Promise<any[]> {
    return await db.select().from(agencyAdminDelegations).where(eq(agencyAdminDelegations.agencyId, Number(agencyId)));
  }

  async createAgencyDelegation(delegation: any): Promise<any> {
    const [newDelegation] = await db.insert(agencyAdminDelegations).values(delegation).returning();
    return newDelegation;
  }

  // Corporate Social
  async getCorporateSocialAccounts(): Promise<any[]> {
    return await db.select().from(corporateSocialAccounts);
  }

  async getCorporateSocialAccountsByPlatforms(platforms: string[]): Promise<any[]> {
    const accounts = await this.getCorporateSocialAccounts();
    return accounts.filter(acc => platforms.includes(acc.platform));
  }

  async getCorporateSocialAccount(id: string): Promise<any> {
    const [account] = await db.select().from(corporateSocialAccounts).where(eq(corporateSocialAccounts.id, id));
    return account;
  }

  async saveCorporateSocialAccount(account: any): Promise<void> {
    const existing = await this.getCorporateSocialAccount(account.id || "0");
    if (existing || (account.id && await this.getCorporateSocialAccount(account.id))) {
       await this.updateCorporateSocialAccount(account.id || existing.id, account);
    } else {
       if (!account.id) account.id = Math.random().toString(36).substring(7);
       await db.insert(corporateSocialAccounts).values(account);
    }
  }

  async updateCorporateSocialAccount(id: string, updates: any): Promise<void> {
    await db.update(corporateSocialAccounts).set(updates).where(eq(corporateSocialAccounts.id, id));
  }

  async deleteCorporateSocialAccount(id: string): Promise<void> {
    await db.delete(corporateSocialAccounts).where(eq(corporateSocialAccounts.id, id));
  }

  async createCorporatePost(post: any): Promise<void> {
    if (!post.id) post.id = Math.random().toString(36).substring(7);
    await db.insert(corporatePosts).values(post);
  }

  async getCorporatePosts(params: { page: number, limit: number }): Promise<any[]> {
    return await db.select().from(corporatePosts).limit(params.limit).offset((params.page - 1) * params.limit).orderBy(desc(corporatePosts.createdAt));
  }

  async getCorporateSocialStats(): Promise<any> {
    return {
      connectedAccounts: (await this.getCorporateSocialAccounts()).length,
      totalPosts: 0,
      engagement: 0
    };
  }

  // Referral
  async getReferralByCode(code: string): Promise<Referral | undefined> {
    const [referral] = await db.select().from(referrals).where(eq(referrals.referralCode, code));
    return referral;
  }

  async createReferral(referral: InsertReferral): Promise<Referral> {
    const [newReferral] = await db.insert(referrals).values(referral).returning();
    return newReferral;
  }

  async updateReferral(id: number, updates: Partial<Referral>): Promise<void> {
    await db.update(referrals).set(updates).where(eq(referrals.id, id));
  }

  async updateReferralStatus(id: number, status: string, newUserId?: string): Promise<void> {
    const updates: Partial<Referral> = { status };
    if (newUserId) {
        updates.referredUserId = Number(newUserId);
    }
    if (status === 'completed') {
        updates.completedAt = new Date();
    }
    await db.update(referrals).set(updates).where(eq(referrals.id, id));
  }

  async createReferralReward(reward: InsertReferralReward): Promise<void> {
    await db.insert(referralRewards).values(reward);
  }

  async getReferralStats(userId: string | number): Promise<any> {
    const refs = await this.getReferralsByUser(userId);
    const rewards = await this.getReferralRewardsByUser(userId);
    
    return {
        totalInvites: refs.length,
        pendingInvites: refs.filter(r => r.status === 'pending').length,
        completedInvites: refs.filter(r => r.status === 'completed').length,
        totalCreditsEarned: rewards.reduce((acc, r) => acc + r.credits, 0)
    };
  }

  async getReferralsByUser(userId: string | number): Promise<Referral[]> {
    return await db.select().from(referrals).where(eq(referrals.referrerId, Number(userId)));
  }

  async getReferralRewardsByUser(userId: string | number): Promise<ReferralReward[]> {
    return await db.select().from(referralRewards).where(eq(referralRewards.userId, Number(userId)));
  }

  // Stats
  async getSystemStats(): Promise<any> {
    const usersCount = (await db.select({ count: sql<number>`count(*)` }).from(users))[0].count;
    const leadsCount = await this.getLeadsCount();
    return {
      users: Number(usersCount),
      leads: leadsCount,
      revenue: 0
    };
  }

  async getUserStats(userId: number | string): Promise<any> {
    const user = await this.getUser(userId);
    return {
      credits: user?.credits || 0,
      plan: user?.selectedPlan
    };
  }

  // CSV Uploads
  private csvUploads = new Map<string, any>();
  
  async createCsvUpload(data: any): Promise<any> {
    const id = Math.random().toString(36).substring(7);
    const upload = { ...data, id, createdAt: new Date() };
    this.csvUploads.set(id, upload);
    return upload;
  }

  async getCsvUpload(id: string): Promise<any> {
    return this.csvUploads.get(id);
  }

  // Invoicing Implementation
  async getInvoiceSettings(userId: number | string): Promise<InvoiceSettings | undefined> {
    const [settings] = await db.select().from(invoiceSettings).where(eq(invoiceSettings.userId, Number(userId)));
    return settings;
  }

  async createInvoice(invoice: InsertInvoice): Promise<Invoice> {
    const [newInvoice] = await db.insert(invoices).values(invoice).returning();
    return newInvoice;
  }

  async createInvoiceItem(item: InsertInvoiceItem): Promise<InvoiceItem> {
    const [newItem] = await db.insert(invoiceItems).values(item).returning();
    return newItem;
  }

  async updateInvoiceSequence(settingsId: number | string, sequence: number): Promise<void> {
    await db.update(invoiceSettings).set({ invoiceSequence: sequence }).where(eq(invoiceSettings.id, Number(settingsId)));
  }

  async createInvoiceAuditLog(log: any): Promise<void> {
    await this.createAuditLog(log);
  }

  async getInvoice(id: number | string): Promise<Invoice | undefined> {
    const [invoice] = await db.select().from(invoices).where(eq(invoices.id, Number(id)));
    return invoice;
  }

  async getInvoiceWithDetails(id: number | string): Promise<Invoice & { items: InvoiceItem[] } | undefined> {
    const invoice = await this.getInvoice(id);
    if (!invoice) return undefined;
    
    const items = await db.select().from(invoiceItems).where(eq(invoiceItems.invoiceId, invoice.id));
    return { ...invoice, items };
  }

  async updateInvoiceStatus(id: number | string, status: string): Promise<void> {
    await db.update(invoices).set({ status }).where(eq(invoices.id, Number(id)));
  }

  async updateInvoiceATData(id: number | string, data: any): Promise<void> {
     await db.update(invoices).set({
       atDocumentId: data.atReference,
       atValidationCode: data.atValidationCode,
       atQrCode: data.atQrCode,
       atSubmittedAt: data.atSubmissionDate,
     }).where(eq(invoices.id, Number(id)));
  }

  async updateInvoiceATError(id: number | string, error: string): Promise<void> {
    await db.update(invoices).set({ atError: error }).where(eq(invoices.id, Number(id)));
  }

  async updateInvoicePdfPath(id: number | string, path: string): Promise<void> {
    await db.update(invoices).set({ pdfPath: path }).where(eq(invoices.id, Number(id)));
  }

  async updateInvoiceEmailSent(id: number | string, sent: boolean, date: Date): Promise<void> {
    await db.update(invoices).set({ 
      emailSent: sent,
      emailSentAt: date 
    }).where(eq(invoices.id, Number(id)));
  }

  // Quality Feedback
  async createQualityFeedback(feedback: InsertQualityFeedback): Promise<QualityFeedback> {
    const [entry] = await db.insert(qualityFeedback).values(feedback).returning();
    return entry;
  }

  async getQualityFeedback(userId?: number | string, since?: Date): Promise<QualityFeedback[]> {
    const conditions = [];
    if (userId) conditions.push(eq(qualityFeedback.userId, Number(userId)));
    if (since) conditions.push(gte(qualityFeedback.createdAt, since));
    
    return await db.select()
      .from(qualityFeedback)
      .where(and(...conditions))
      .orderBy(desc(qualityFeedback.createdAt));
  }
}

export const storage = new DatabaseStorage();
