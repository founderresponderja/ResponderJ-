// =====================================
// RESPONDER JÁ - STORAGE SIMPLIFICADO
// =====================================
// Implementado para corrigir problemas de compatibilidade
// Data: 28 Agosto 2025
// =====================================

import { eq, and, desc, asc, sql, like, count, lte } from "drizzle-orm";
import { db } from "./db";
import {
  users,
  agencies,
  establishments,
  reviews,
  responses,
  responseTemplates,
  creditTransactions,
  creditPackages,
  referrals,
  leads,
  sessions,
  invoices,
  invoiceItems,
  invoiceSettings,
  subscriptions,
  emailSequences,
  type User,
  type InsertUser,
  type Agency,
  type InsertAgency,
  type Establishment,
  type InsertEstablishment,
  type CreditTransaction,
  type InsertCreditTransaction,
  type CreditPackage,
  type InsertCreditPackage,
  type Referral,
  type InsertReferral,
  type Lead,
  type InsertLead,
  type Invoice,
  type InsertInvoice,
  type InvoiceItem,
  type InsertInvoiceItem,
  type InvoiceSettings,
  type InsertInvoiceSettings,
  type Subscription,
  type InsertSubscription,
  type RegisterData,
  type UpdateUser,
  type EmailSequence,
  type InsertEmailSequence,
} from "@shared/schema";
import session from "express-session";
import connectPg from "connect-pg-simple";
import crypto from "crypto";
import process from "process";

// =====================================
// CONFIGURAÇÃO DE SESSÕES POSTGRESQL
// =====================================

const PostgresSessionStore = connectPg(session);

// =====================================
// INTERFACE STORAGE SIMPLIFICADA
// =====================================

export interface IStorage {
  // === GESTÃO DE UTILIZADORES ===
  getUser(id: string): Promise<User | undefined>;
  getUserById(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getAllUsersForAdmin(): Promise<User[]>;
  createUser(userData: RegisterData): Promise<User>;
  updateUser(id: string, userData: Partial<UpdateUser>): Promise<User>;
  deleteUser(id: string): Promise<void>;
  updateUserCredits(userId: string, credits: number): Promise<void>;
  addCreditsToUser(userId: string, amount: number, description: string): Promise<void>;
  upsertUser(userData: InsertUser): Promise<User>;
  
  // === SISTEMA DE AGÊNCIAS ===
  createAgency(agencyData: InsertAgency): Promise<Agency>;
  getAgency(id: string): Promise<Agency | undefined>;
  updateAgency(id: string, agencyData: Partial<InsertAgency>): Promise<Agency>;
  deleteAgency(id: string): Promise<void>;
  getAgencyMembers(agencyId: string): Promise<any[]>; // Retorna com dados do utilizador
  addAgencyMember(agencyId: string, userId: string): Promise<void>;
  removeAgencyMember(agencyId: string, userId: string): Promise<void>;
  getAgencyMemberCount(agencyId: string): Promise<{ activeMembers: number; pendingInvitations: number; total: number }>;
  getAgencyDelegations(agencyId: string): Promise<any[]>;
  createAgencyDelegation(delegationData: any): Promise<any>;
  inviteAgencyMember(agencyId: string, email: string, role: string, invitedBy: string): Promise<any>;
  updateAgencyMember(memberId: string, memberData: any): Promise<any>;
  
  // === SISTEMA DE SUBSCRIÇÕES ===
  createSubscription(subscriptionData: InsertSubscription): Promise<Subscription>;
  getSubscription(id: string): Promise<Subscription | undefined>;
  getUserSubscription(userId: string): Promise<Subscription | undefined>;
  updateSubscription(id: string, subscriptionData: Partial<InsertSubscription>): Promise<Subscription>;
  cancelSubscription(id: string): Promise<void>;
  
  // === ESTABELECIMENTOS ===
  createEstablishment(establishmentData: InsertEstablishment): Promise<Establishment>;
  getEstablishment(id: string): Promise<Establishment | undefined>;
  getUserEstablishments(userId: string): Promise<Establishment[]>;
  updateEstablishment(id: string, establishmentData: Partial<InsertEstablishment>): Promise<Establishment>;
  deleteEstablishment(id: string): Promise<void>;
  
  // === SISTEMA DE CRÉDITOS ===
  createCreditTransaction(transactionData: InsertCreditTransaction): Promise<CreditTransaction>;
  getCreditTransaction(id: string): Promise<CreditTransaction | undefined>;
  getUserCreditTransactions(userId: string, limit?: number): Promise<CreditTransaction[]>;
  getUserCreditBalance(userId: string): Promise<number>;
  
  // === PACOTES DE CRÉDITOS ===
  createCreditPackage(packageData: InsertCreditPackage): Promise<CreditPackage>;
  getCreditPackage(id: string): Promise<CreditPackage | undefined>;
  getAllCreditPackages(): Promise<CreditPackage[]>;
  getActiveCreditPackages(): Promise<CreditPackage[]>;
  updateCreditPackage(id: string, packageData: Partial<InsertCreditPackage>): Promise<CreditPackage>;
  
  // === SISTEMA DE REFERÊNCIAS ===
  createReferral(referralData: InsertReferral): Promise<Referral>;
  getReferral(id: string): Promise<Referral | undefined>;
  getReferralByCode(code: string): Promise<Referral | undefined>;
  getUserReferrals(userId: string): Promise<Referral[]>;
  updateReferral(id: string, referralData: Partial<InsertReferral>): Promise<Referral>;
  processReferralSignup(referralCode: string, newUserId: string): Promise<void>;
  
  // === MÉTODOS ADICIONAIS ===
  getCreditPackages(): Promise<CreditPackage[]>;
  updateUserPlan(userId: string, plan: string): Promise<User>;
  updateUserStripeCustomerId(userId: string, customerId: string): Promise<User>;
  updateUserStripeInfo(userId: string, info: any): Promise<User>;
  setPasswordResetToken(userId: string, token: string, expires: Date): Promise<void>;
  getUserByPasswordResetToken(token: string): Promise<User | undefined>;
  getUserByEmailVerificationToken(token: string): Promise<User | undefined>;
  resetUserPassword(userId: string, newPassword: string): Promise<void>;
  
  // === LEADS MANAGEMENT ===
  createLead(leadData: InsertLead): Promise<Lead>;
  getLead(id: string): Promise<Lead | undefined>;
  getAllLeads(): Promise<Lead[]>;
  getLeads(offset?: number, limit?: number): Promise<Lead[]>;
  getLeadsCount(): Promise<number>;
  updateLead(id: string, leadData: Partial<InsertLead>): Promise<Lead>;
  deleteLead(id: string): Promise<void>;
  searchLeads(searchTerm: string): Promise<Lead[]>;
  getLeadsByStatus(status: string): Promise<Lead[]>;
  getLeadsByEmailStatus(emailStatus: string): Promise<Lead[]>;
  updateLeadEmailStatus(id: string, emailStatus: string, timestamp: Date): Promise<Lead>;
  getLeadsForEmailSequence(): Promise<Lead[]>;
  checkLeadExists(email: string): Promise<boolean>;
  importLeadsFromCSV(csvData: any[]): Promise<{ imported: number; skipped: number; errors: string[] }>;
  exportLeadsToCSV(): Promise<string>;
  
  // === ESTATÍSTICAS DO SISTEMA ===
  getTotalUsers(): Promise<number>;
  getTotalActiveUsers(): Promise<number>;
  getUserStats(userId: string): Promise<any>;
  getSystemStats(): Promise<any>;
  
  // === CSV UPLOAD ===
  createCsvUpload(uploadData: any): Promise<any>;
  getCsvUpload(id: string): Promise<any>;
  
  // === SISTEMA DE FATURAÇÃO ===
  getInvoiceSettings(userId: string): Promise<InvoiceSettings | undefined>;
  createInvoiceSettings(settingsData: InsertInvoiceSettings): Promise<InvoiceSettings>;
  updateInvoiceSettings(userId: string, settingsData: Partial<InsertInvoiceSettings>): Promise<InvoiceSettings>;
  
  createInvoice(invoiceData: InsertInvoice): Promise<Invoice>;
  getInvoice(id: number): Promise<Invoice | undefined>;
  getInvoiceWithDetails(id: number): Promise<Invoice & { items: InvoiceItem[] } | undefined>;
  updateInvoiceStatus(id: number, status: string): Promise<Invoice>;
  updateInvoiceSequence(settingsId: number, sequence: number): Promise<void>;
  updateInvoicePdfPath(id: number, pdfPath: string): Promise<Invoice>;
  updateInvoiceEmailSent(id: number, emailSent: boolean): Promise<Invoice>;
  updateInvoiceATData(id: number, atDocumentId: string, atQrCode?: string): Promise<Invoice>;
  updateInvoiceATError(id: number, atError: string): Promise<Invoice>;
  
  createInvoiceItem(itemData: InsertInvoiceItem): Promise<InvoiceItem>;
  createInvoiceAuditLog(logData: any): Promise<void>;
  createAuditLog(logData: any): Promise<void>;
  
  // === CONFIGURAÇÃO DE SESSÕES ===
  sessionStore: any;
  
  // === MÉTODOS STUB (IMPLEMENTAÇÃO SIMPLIFICADA) ===
  getCreditPackages(): Promise<CreditPackage[]>;
  updateUserPlan(userId: string, plan: string): Promise<User>;
  updateUserStripeCustomerId(userId: string, customerId: string): Promise<User>;
  updateUserStripeInfo(userId: string, info: any): Promise<User>;
  setPasswordResetToken(userId: string, token: string, expires: Date): Promise<void>;
  getUserByPasswordResetToken(token: string): Promise<User | undefined>;
  resetUserPassword(userId: string, newPassword: string): Promise<void>;
  getBusinessProfile(userId: string): Promise<any>;
  createBusinessProfile(data: any): Promise<any>;
  updateBusinessProfile(id: string, data: any): Promise<any>;
  createAiResponse(data: any): Promise<any>;
  getUserAiResponses(userId: string, limit?: number): Promise<any[]>;
  updateAiResponse(id: string, data: any): Promise<any>;
  getPageContent(page: string): Promise<any>;
  updatePageContent(page: string, content: string): Promise<any>;
  createPageContent(data: any): Promise<any>;
  getAllPageContents(): Promise<any[]>;
  createSentimentAnalysis(data: any): Promise<any>;
  getSentimentAnalysisByUser(userId: string): Promise<any[]>;
  createEngagementPrediction(data: any): Promise<any>;
  getInteractionHistoryByUser(userId: string): Promise<any[]>;
  createLinkedinBusinessConfig(data: any): Promise<any>;
  getLinkedinBusinessConfigByUser(userId: string): Promise<any>;
  createCrmContact(data: any): Promise<any>;
  getCrmContactsByUser(userId: string): Promise<any[]>;
  getSalesPipelineByUser(userId: string): Promise<any[]>;
}

// =====================================
// IMPLEMENTAÇÃO POSTGRESQL SIMPLIFICADA
// =====================================

export class DatabaseStorage implements IStorage {
  public sessionStore: any;

  constructor() {
    // Configuração de sessões PostgreSQL
    this.sessionStore = new PostgresSessionStore({
      conString: process.env.DATABASE_URL!,
      createTableIfMissing: false,
      tableName: "sessions",
      ttl: 7 * 24 * 60 * 60, // 7 dias
    });
  }

  // =====================================
  // GESTÃO DE UTILIZADORES
  // =====================================

  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserById(id: string): Promise<User | undefined> {
    return this.getUser(id);
  }

  async getAllUsersForAdmin(): Promise<User[]> {
    try {
      const allUsers = await db.select().from(users).orderBy(desc(users.createdAt));
      return allUsers;
    } catch (error) {
      console.error("❌ Erro ao obter todos os utilizadores:", error);
      return [];
    }
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    console.log(`🔍 Storage: buscando utilizador por email: ${email}`);
    const [user] = await db.select().from(users).where(eq(users.email, email.toLowerCase()));
    if (user) {
      console.log(`✅ Storage: utilizador encontrado`);
    } else {
      console.log(`❌ Storage: utilizador não encontrado`);
    }
    return user;
  }

  async createUser(userData: RegisterData): Promise<User> {
    const insertData: InsertUser = {
      email: userData.email.toLowerCase(),
      password: userData.password,
      firstName: userData.firstName || "",
      lastName: userData.lastName || "",
      nif: userData.nif,
      credits: 50,
      emailVerified: false,
      // Ensure verification token is passed if present in RegisterData as any
      emailVerificationToken: (userData as any).emailVerificationToken || null
    };

    const [newUser] = await db.insert(users).values(insertData).returning();

    // Criar subscrição trial
    await this.createSubscription({
      userId: newUser.id,
      planType: "trial",
      status: "trial",
    });

    return newUser;
  }

  async updateUser(id: string, userData: Partial<UpdateUser>): Promise<User> {
    const [updatedUser] = await db
      .update(users)
      .set({ ...userData, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return updatedUser;
  }

  async deleteUser(id: string): Promise<void> {
    await db.delete(users).where(eq(users.id, id));
  }

  async updateUserCredits(userId: string, credits: number): Promise<void> {
    await db.update(users).set({ credits }).where(eq(users.id, userId));
  }

  async addCreditsToUser(userId: string, amount: number, description: string): Promise<void> {
    const user = await this.getUser(userId);
    if (!user) throw new Error("Utilizador não encontrado");

    const newBalance = user.credits + amount;
    
    await this.updateUserCredits(userId, newBalance);
    
    await this.createCreditTransaction({
      userId,
      type: amount > 0 ? "bonus" : "usage",
      amount,
      description,
    });
  }

  async upsertUser(userData: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values({
        ...userData,
        updatedAt: new Date()
      })
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // =====================================
  // SISTEMA DE AGÊNCIAS
  // =====================================

  async createAgency(agencyData: InsertAgency): Promise<Agency> {
    const [newAgency] = await db.insert(agencies).values(agencyData).returning();
    
    await this.updateUser(agencyData.ownerId, { 
      agencyId: newAgency.id,
      isAgencyOwner: true
    });
    
    return newAgency;
  }

  async getAgency(id: string): Promise<Agency | undefined> {
    const [agency] = await db.select().from(agencies).where(eq(agencies.id, id));
    return agency;
  }

  async updateAgency(id: string, agencyData: Partial<InsertAgency>): Promise<Agency> {
    const [updatedAgency] = await db
      .update(agencies)
      .set({ ...agencyData, updatedAt: new Date() })
      .where(eq(agencies.id, id))
      .returning();
    return updatedAgency;
  }

  async getAgencyMemberCount(agencyId: string): Promise<{ activeMembers: number; pendingInvitations: number; total: number }> {
    // Contar membros ativos da agência
    const activeMembersResult = await db.execute(sql`
      SELECT COUNT(*) as count
      FROM users 
      WHERE agency_id = ${agencyId} AND is_active = true
    `);
    
    // Contar convites pendentes
    const pendingInvitationsResult = await db.execute(sql`
      SELECT COUNT(*) as count
      FROM agency_invitations 
      WHERE agency_id = ${agencyId} AND status = 'pending' AND expires_at > NOW()
    `);
    
    const activeMembers = parseInt((activeMembersResult.rows[0] as any)?.count || '0');
    const pendingInvitations = parseInt((pendingInvitationsResult.rows[0] as any)?.count || '0');
    
    return {
      activeMembers,
      pendingInvitations,
      total: activeMembers + pendingInvitations
    };
  }

  async deleteAgency(id: string): Promise<void> {
    await db.update(users).set({ 
      agencyId: null,
      isAgencyOwner: false
    }).where(eq(users.agencyId, id));
    
    await db.delete(agencies).where(eq(agencies.id, id));
  }

  async getAgencyMembers(agencyId: string): Promise<any[]> {
    // Buscar membros da tabela agency_members com dados do utilizador
    const result = await db.execute(sql`
      SELECT 
        am.id, am.user_id, am.role, am.status, am.joined_at, am.invited_at,
        u.id as user_id, u.first_name, u.last_name, u.email, u.profile_image_url
      FROM agency_members am
      JOIN users u ON am.user_id = u.id
      WHERE am.agency_id = ${agencyId}
      ORDER BY am.created_at ASC
    `);
    
    return result.rows.map((row: any) => ({
      id: row.id,
      userId: row.user_id,
      role: row.role,
      status: row.status,
      joinedAt: row.joined_at,
      user: {
        id: row.user_id,
        firstName: row.first_name,
        lastName: row.last_name,
        email: row.email,
        profileImageUrl: row.profile_image_url
      }
    }));
  }


  async getTotalUsersCount(): Promise<number> {
    const result = await db.execute(sql`
      SELECT COUNT(*) as count 
      FROM users 
      WHERE is_active = true
    `);
    return parseInt((result.rows[0] as any)?.count || '0');
  }

  async getAgencyDelegations(agencyId: string): Promise<any[]> {
    const result = await db.execute(sql`
      SELECT 
        ad.id, ad.delegated_to, ad.type, ad.start_date, ad.end_date, ad.status,
        u.first_name, u.last_name, u.email
      FROM agency_admin_delegations ad
      JOIN users u ON ad.delegated_to = u.id
      WHERE ad.agency_id = ${agencyId} AND ad.status = 'active'
      ORDER BY ad.created_at DESC
    `);
    
    return result.rows.map((row: any) => ({
      id: row.id,
      delegatedTo: row.delegated_to,
      type: row.type,
      startDate: row.start_date,
      endDate: row.end_date,
      status: row.status,
      user: {
        firstName: row.first_name,
        lastName: row.last_name,
        email: row.email
      }
    }));
  }

  async createAgencyDelegation(delegationData: any): Promise<any> {
    const { agencyId, delegatedBy, delegatedTo, type, days, permissions } = delegationData;
    
    let endDate = null;
    if (type === 'temporary' && days) {
      endDate = new Date();
      endDate.setDate(endDate.getDate() + days);
    }
    
    const result = await db.execute(sql`
      INSERT INTO agency_admin_delegations (
        agency_id, delegated_by, delegated_to, type, end_date, permissions, status
      ) VALUES (
        ${agencyId}, ${delegatedBy}, ${delegatedTo}, ${type}, 
        ${endDate}, ${JSON.stringify(permissions)}, 'active'
      ) 
      RETURNING *
    `);
    
    return result.rows[0];
  }

  // =====================================
  // CONVITES DE AGÊNCIA
  // =====================================
  
  async createAgencyInvitation(invitationData: any): Promise<any> {
    const { agencyId, email, firstName, lastName, role, token, invitedBy } = invitationData;
    
    // Verificar se já existe convite pendente para este email
    const existingInvite = await db.execute(sql`
      SELECT id FROM agency_invitations 
      WHERE agency_id = ${agencyId} AND email = ${email} AND status = 'pending'
    `);
    
    if (existingInvite.rows.length > 0) {
      throw new Error('Já existe um convite pendente para este email nesta agência');
    }
    
    // Verificar se utilizador já é membro da agência
    const existingUser = await this.getUserByEmail(email);
    if (existingUser) {
      const existingMember = await db.execute(sql`
        SELECT id FROM agency_members 
        WHERE agency_id = ${agencyId} AND user_id = ${existingUser.id}
      `);
      
      if (existingMember.rows.length > 0) {
        throw new Error('Este utilizador já é membro da agência');
      }
    }
    
    // Criar convite (expira em 7 dias)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    
    const result = await db.execute(sql`
      INSERT INTO agency_invitations (
        agency_id, email, first_name, last_name, role, token, invited_by, expires_at
      ) VALUES (
        ${agencyId}, ${email}, ${firstName || null}, ${lastName || null}, 
        ${role}, ${token}, ${invitedBy}, ${expiresAt}
      ) 
      RETURNING *
    `);
    
    return result.rows[0];
  }

  async getAgencyInvitationByToken(token: string): Promise<any> {
    const result = await db.execute(sql`
      SELECT ai.*, a.name as agency_name, u.first_name as inviter_name, u.email as inviter_email
      FROM agency_invitations ai
      JOIN agencies a ON ai.agency_id = a.id
      JOIN users u ON ai.invited_by = u.id
      WHERE ai.token = ${token} AND ai.status = 'pending' AND ai.expires_at > NOW()
    `);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return {
      ...result.rows[0],
      agencyName: result.rows[0].agency_name,
      inviterName: result.rows[0].inviter_name,
      inviterEmail: result.rows[0].inviter_email
    };
  }

  async acceptAgencyInvitation(token: string, userId: string): Promise<any> {
    // Obter convite
    const invitation = await this.getAgencyInvitationByToken(token);
    if (!invitation) {
      throw new Error('Convite inválido ou expirado');
    }
    
    // Marcar convite como aceite
    await db.execute(sql`
      UPDATE agency_invitations 
      SET status = 'accepted', accepted_at = NOW(), accepted_by = ${userId}
      WHERE token = ${token}
    `);
    
    // Adicionar utilizador à agência
    await db.execute(sql`
      INSERT INTO agency_members (
        agency_id, user_id, role, invited_by, status, permissions, joined_at
      ) VALUES (
        ${invitation.agency_id}, ${userId}, ${invitation.role}, ${invitation.invited_by},
        'active', 'view_responses,create_responses', NOW()
      )
    `);
    
    // Actualizar utilizador para vincular à agência
    await this.updateUser(userId, { agencyId: invitation.agency_id });
    
    return invitation;
  }

  async inviteAgencyMember(agencyId: string, email: string, role: string, invitedBy: string): Promise<any> {
    // Gerar token único
    const token = crypto.randomBytes(32).toString('hex');
    
    // Criar convite
    const invitation = await this.createAgencyInvitation({
      agencyId,
      email,
      role,
      token,
      invitedBy
    });
    
    return { ...invitation, token };
  }

  async updateAgencyMember(memberId: string, memberData: any): Promise<any> {
    const { role, permissions, status } = memberData;
    
    const result = await db.execute(sql`
      UPDATE agency_members 
      SET 
        role = ${role || sql`role`},
        permissions = ${permissions || sql`permissions`},
        status = ${status || sql`status`},
        updated_at = NOW()
      WHERE id = ${memberId}
      RETURNING *
    `);
    
    return result.rows[0];
  }

  async addAgencyMember(agencyId: string, userId: string): Promise<void> {
    await this.updateUser(userId, { 
      agencyId
    });
  }

  async removeAgencyMember(agencyId: string, userId: string): Promise<void> {
    await this.updateUser(userId, { 
      agencyId: null
    });
  }

  // =====================================
  // SISTEMA DE SUBSCRIÇÕES
  // =====================================

  async createSubscription(subscriptionData: InsertSubscription): Promise<Subscription> {
    const [subscription] = await db.insert(subscriptions).values(subscriptionData).returning();
    return subscription;
  }

  async getSubscription(id: string): Promise<Subscription | undefined> {
    const [subscription] = await db.select().from(subscriptions).where(eq(subscriptions.id, id));
    return subscription;
  }

  async getUserSubscription(userId: string): Promise<Subscription | undefined> {
    const [subscription] = await db.select().from(subscriptions).where(eq(subscriptions.userId, userId));
    return subscription;
  }

  async updateSubscription(id: string, subscriptionData: Partial<InsertSubscription>): Promise<Subscription> {
    const [updated] = await db
      .update(subscriptions)
      .set({ ...subscriptionData, updatedAt: new Date() })
      .where(eq(subscriptions.id, id))
      .returning();
    return updated;
  }

  async cancelSubscription(id: string): Promise<void> {
    await this.updateSubscription(id, { status: "cancelled" });
  }

  // =====================================
  // ESTABELECIMENTOS
  // =====================================

  async createEstablishment(establishmentData: InsertEstablishment): Promise<Establishment> {
    const [establishment] = await db.insert(establishments).values(establishmentData).returning();
    return establishment;
  }

  async getEstablishment(id: string): Promise<Establishment | undefined> {
    const [establishment] = await db.select().from(establishments).where(eq(establishments.id, id));
    return establishment;
  }

  async getUserEstablishments(userId: string): Promise<Establishment[]> {
    return await db.select().from(establishments).where(eq(establishments.userId, userId));
  }

  async updateEstablishment(id: string, establishmentData: Partial<InsertEstablishment>): Promise<Establishment> {
    const [updated] = await db
      .update(establishments)
      .set({ ...establishmentData, updatedAt: new Date() })
      .where(eq(establishments.id, id))
      .returning();
    return updated;
  }

  async deleteEstablishment(id: string): Promise<void> {
    await db.delete(establishments).where(eq(establishments.id, id));
  }

  // =====================================
  // SISTEMA DE CRÉDITOS
  // =====================================

  async createCreditTransaction(transactionData: InsertCreditTransaction): Promise<CreditTransaction> {
    const [transaction] = await db.insert(creditTransactions).values(transactionData).returning();
    return transaction;
  }

  async getCreditTransaction(id: string): Promise<CreditTransaction | undefined> {
    const [transaction] = await db.select().from(creditTransactions).where(eq(creditTransactions.id, id));
    return transaction;
  }

  async getUserCreditTransactions(userId: string, limit = 100): Promise<CreditTransaction[]> {
    return await db
      .select()
      .from(creditTransactions)
      .where(eq(creditTransactions.userId, userId))
      .orderBy(desc(creditTransactions.createdAt))
      .limit(limit);
  }

  async getUserCreditBalance(userId: string): Promise<number> {
    const user = await this.getUser(userId);
    return user?.credits || 0;
  }

  // =====================================
  // PACOTES DE CRÉDITOS
  // =====================================

  async createCreditPackage(packageData: InsertCreditPackage): Promise<CreditPackage> {
    const [creditPackage] = await db.insert(creditPackages).values(packageData).returning();
    return creditPackage;
  }

  async getCreditPackage(id: string): Promise<CreditPackage | undefined> {
    const [creditPackage] = await db.select().from(creditPackages).where(eq(creditPackages.id, id));
    return creditPackage;
  }

  async getAllCreditPackages(): Promise<CreditPackage[]> {
    return await db.select().from(creditPackages).orderBy(asc(creditPackages.sortOrder));
  }

  async getActiveCreditPackages(): Promise<CreditPackage[]> {
    return await db
      .select()
      .from(creditPackages)
      .where(eq(creditPackages.isActive, true))
      .orderBy(asc(creditPackages.sortOrder));
  }

  async updateCreditPackage(id: string, packageData: Partial<InsertCreditPackage>): Promise<CreditPackage> {
    const [updated] = await db
      .update(creditPackages)
      .set({ ...packageData, updatedAt: new Date() })
      .where(eq(creditPackages.id, id))
      .returning();
    return updated;
  }

  // =====================================
  // SISTEMA DE REFERÊNCIAS
  // =====================================

  async createReferral(referralData: InsertReferral): Promise<Referral> {
    const [referral] = await db.insert(referrals).values(referralData).returning();
    return referral;
  }

  async getReferral(id: string): Promise<Referral | undefined> {
    const [referral] = await db.select().from(referrals).where(eq(referrals.id, id));
    return referral;
  }

  async getReferralByCode(code: string): Promise<Referral | undefined> {
    const [referral] = await db.select().from(referrals).where(eq(referrals.referralCode, code));
    return referral;
  }

  async getUserReferrals(userId: string): Promise<Referral[]> {
    return await db.select().from(referrals).where(eq(referrals.referrerId, userId));
  }

  async updateReferral(id: string, referralData: Partial<InsertReferral>): Promise<Referral> {
    const [updated] = await db
      .update(referrals)
      .set({ ...referralData })
      .where(eq(referrals.id, id))
      .returning();
    return updated;
  }

  async processReferralSignup(referralCode: string, newUserId: string): Promise<void> {
    const referral = await this.getReferralByCode(referralCode);
    if (!referral) throw new Error("Código de referência inválido");
    
    await this.addCreditsToUser(referral.referrerId, 25, "Referência bem-sucedida");
    await this.addCreditsToUser(newUserId, 25, "Bónus de registo via referência");
    
    await this.updateReferral(referral.id, {
      referredUserId: newUserId,
      status: "completed",
      completedAt: new Date(),
    });
  }

  // =====================================
  // LEADS MANAGEMENT
  // =====================================

  async createLead(leadData: InsertLead): Promise<Lead> {
    const [lead] = await db.insert(leads).values(leadData).returning();
    return lead;
  }

  async getLead(id: string): Promise<Lead | undefined> {
    const [lead] = await db.select().from(leads).where(eq(leads.id, id));
    return lead;
  }

  async getAllLeads(): Promise<Lead[]> {
    return await db.select().from(leads).orderBy(desc(leads.createdAt));
  }

  async updateLead(id: string, leadData: Partial<InsertLead>): Promise<Lead> {
    const [updated] = await db
      .update(leads)
      .set({ ...leadData, updatedAt: new Date() })
      .where(eq(leads.id, id))
      .returning();
    return updated;
  }

  async deleteLead(id: string): Promise<void> {
    await db.delete(leads).where(eq(leads.id, id));
  }

  async searchLeads(searchTerm: string): Promise<Lead[]> {
    return await db
      .select()
      .from(leads)
      .where(
        sql`(
          LOWER(${leads.companyName}) LIKE LOWER(${`%${searchTerm}%`}) OR
          LOWER(${leads.contactName}) LIKE LOWER(${`%${searchTerm}%`}) OR
          LOWER(${leads.email}) LIKE LOWER(${`%${searchTerm}%`})
        )`
      )
      .orderBy(desc(leads.createdAt));
  }

  async getLeadsByStatus(status: string): Promise<Lead[]> {
    return await db
      .select()
      .from(leads)
      .where(eq(leads.status, status))
      .orderBy(desc(leads.createdAt));
  }

  async getLeads(offset: number = 0, limit: number = 50): Promise<Lead[]> {
    return await db
      .select()
      .from(leads)
      .orderBy(desc(leads.createdAt))
      .limit(limit)
      .offset(offset);
  }

  async getLeadsCount(): Promise<number> {
    const [result] = await db.select({ count: count() }).from(leads);
    return result.count;
  }

  async getLeadsByEmailStatus(emailStatus: string): Promise<Lead[]> {
    return await db
      .select()
      .from(leads)
      .where(eq(leads.emailStatus, emailStatus))
      .orderBy(desc(leads.createdAt));
  }

  async updateLeadEmailStatus(id: string, emailStatus: string, timestamp: Date): Promise<Lead> {
    const updateData: any = { emailStatus, updatedAt: new Date() };
    
    if (emailStatus === 'first_sent') {
      updateData.firstEmailSentAt = timestamp;
    } else if (emailStatus === 'second_sent') {
      updateData.secondEmailSentAt = timestamp;
    } else if (emailStatus === 'third_sent') {
      updateData.thirdEmailSentAt = timestamp;
    }

    const [updated] = await db
      .update(leads)
      .set(updateData)
      .where(eq(leads.id, id))
      .returning();
    return updated;
  }

  async getLeadsForEmailSequence(): Promise<Lead[]> {
    // Encontra leads que precisam de emails automáticos
    return await db
      .select()
      .from(leads)
      .where(
        sql`(
          (${leads.emailStatus} = 'pending' AND ${leads.firstEmailSentAt} IS NULL) OR
          (${leads.emailStatus} = 'first_sent' AND ${leads.firstEmailSentAt} <= NOW() - INTERVAL '7 days' AND ${leads.secondEmailSentAt} IS NULL) OR
          (${leads.emailStatus} = 'second_sent' AND ${leads.secondEmailSentAt} <= NOW() - INTERVAL '30 days' AND ${leads.thirdEmailSentAt} IS NULL)
        )`
      )
      .orderBy(desc(leads.createdAt));
  }

  async checkLeadExists(email: string): Promise<boolean> {
    const [existingLead] = await db.select({ id: leads.id }).from(leads).where(eq(leads.email, email.toLowerCase()));
    const [existingUser] = await db.select({ id: users.id }).from(users).where(eq(users.email, email.toLowerCase()));
    return !!(existingLead || existingUser);
  }

  async importLeadsFromCSV(csvData: any[]): Promise<{ imported: number; skipped: number; errors: string[] }> {
    // Processar CSV usando Promise.allSettled para melhor performance
    const rowPromises = csvData.map(async (row, index) => {
      try {
        if (!row.email || !row.companyName) {
          return { status: 'error', error: `Linha ${index + 1}: falta email ou nome da empresa` };
        }

        const exists = await this.checkLeadExists(row.email);
        if (exists) {
          return { status: 'skipped' };
        }

        await this.createLead({
          companyName: row.companyName,
          contactName: row.contactName || '',
          email: row.email.toLowerCase(),
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
    
    return results
      .filter(result => result.status === 'fulfilled')
      .map(result => (result as PromiseFulfilledResult<any>).value)
      .reduce(
        (acc, result) => {
          if (result.status === 'imported') acc.imported++;
          else if (result.status === 'skipped') acc.skipped++;
          else if (result.status === 'error') acc.errors.push(result.error);
          return acc;
        },
        { imported: 0, skipped: 0, errors: [] as string[] }
      );
  }

  async exportLeadsToCSV(): Promise<string> {
    const allLeads = await this.getAllLeads();
    
    if (allLeads.length === 0) {
      return 'companyName,contactName,email,phone,website,industry,region,businessType,status,emailStatus,createdAt\n';
    }

    const headers = 'companyName,contactName,email,phone,website,industry,region,businessType,status,emailStatus,createdAt\n';
    const rows = allLeads.map(lead => 
      `"${lead.companyName}","${lead.contactName || ''}","${lead.email}","${lead.phone || ''}","${lead.website || ''}","${lead.industry || ''}","${lead.region || ''}","${lead.businessType || ''}","${lead.status}","${lead.emailStatus}","${lead.createdAt}"`
    ).join('\n');

    return headers + rows;
  }

  // =====================================
  // ESTATÍSTICAS DO SISTEMA
  // =====================================

  async getTotalUsers(): Promise<number> {
    const [result] = await db.select({ count: count() }).from(users);
    return result.count;
  }

  async getTotalActiveUsers(): Promise<number> {
    const [result] = await db
      .select({ count: count() })
      .from(users)
      .where(eq(users.isActive, true));
    return result.count;
  }

  async getUserStats(userId: string): Promise<any> {
    const user = await this.getUser(userId);
    const transactions = await this.getUserCreditTransactions(userId, 100);
    const establishments = await this.getUserEstablishments(userId);

    return {
      user,
      totalCreditsUsed: transactions
        .filter(t => t.type === "usage")
        .reduce((sum, t) => sum + Math.abs(t.amount), 0),
      establishments: establishments.length,
      recentTransactions: transactions.slice(0, 10),
    };
  }

  async getSystemStats(): Promise<any> {
    const totalUsers = await this.getTotalUsers();
    const totalActiveUsers = await this.getTotalActiveUsers();

    const planStats = await db
      .select({ 
        planType: subscriptions.planType, 
        count: count() 
      })
      .from(subscriptions)
      .groupBy(subscriptions.planType);

    return {
      totalUsers,
      totalActiveUsers,
      planStats,
      systemHealth: "operational",
      lastUpdated: new Date(),
    };
  }

  // =====================================
  // CSV UPLOAD (STUB)
  // =====================================

  async createCsvUpload(uploadData: any): Promise<any> {
    return { id: "csv-upload-id", ...uploadData };
  }

  async getCsvUpload(id: string): Promise<any> {
    return { id, status: "processed" };
  }

  // =====================================
  // SISTEMA DE FATURAÇÃO
  // =====================================

  async getInvoiceSettings(userId: string): Promise<InvoiceSettings | undefined> {
    const [settings] = await db.select().from(invoiceSettings).where(eq(invoiceSettings.userId, userId));
    return settings;
  }

  async createInvoiceSettings(settingsData: InsertInvoiceSettings): Promise<InvoiceSettings> {
    const [settings] = await db.insert(invoiceSettings).values(settingsData).returning();
    return settings;
  }

  async updateInvoiceSettings(userId: string, settingsData: Partial<InsertInvoiceSettings>): Promise<InvoiceSettings> {
    const [updated] = await db
      .update(invoiceSettings)
      .set({ ...settingsData, updatedAt: new Date() })
      .where(eq(invoiceSettings.userId, userId))
      .returning();
    return updated;
  }

  async createInvoice(invoiceData: InsertInvoice): Promise<Invoice> {
    const [invoice] = await db.insert(invoices).values(invoiceData).returning();
    return invoice;
  }

  async getInvoice(id: number): Promise<Invoice | undefined> {
    const [invoice] = await db.select().from(invoices).where(eq(invoices.id, id));
    return invoice;
  }

  async getInvoiceWithDetails(id: number): Promise<Invoice & { items: InvoiceItem[] } | undefined> {
    const invoice = await this.getInvoice(id);
    if (!invoice) return undefined;

    const items = await db.select().from(invoiceItems).where(eq(invoiceItems.invoiceId, id));
    return { ...invoice, items };
  }

  async updateInvoiceStatus(id: number, status: string): Promise<Invoice> {
    const [updated] = await db
      .update(invoices)
      .set({ status, updatedAt: new Date() })
      .where(eq(invoices.id, id))
      .returning();
    return updated;
  }

  async updateInvoiceSequence(settingsId: number, sequence: number): Promise<void> {
    await db
      .update(invoiceSettings)
      .set({ invoiceSequence: sequence })
      .where(eq(invoiceSettings.id, settingsId));
  }

  async updateInvoicePdfPath(id: number, pdfPath: string): Promise<Invoice> {
    const [updated] = await db
      .update(invoices)
      .set({ pdfPath, updatedAt: new Date() })
      .where(eq(invoices.id, id))
      .returning();
    return updated;
  }

  async updateInvoiceEmailSent(id: number, emailSent: boolean): Promise<Invoice> {
    const [updated] = await db
      .update(invoices)
      .set({ 
        emailSent, 
        emailSentAt: emailSent ? new Date() : null,
        updatedAt: new Date() 
      })
      .where(eq(invoices.id, id))
      .returning();
    return updated;
  }

  async updateInvoiceATData(id: number, atDocumentId: string, atQrCode?: string): Promise<Invoice> {
    const [updated] = await db
      .update(invoices)
      .set({ 
        atDocumentId,
        atQrCode,
        atSubmittedAt: new Date(),
        updatedAt: new Date() 
      })
      .where(eq(invoices.id, id))
      .returning();
    return updated;
  }

  async updateInvoiceATError(id: number, atError: string): Promise<Invoice> {
    const [updated] = await db
      .update(invoices)
      .set({ atError, updatedAt: new Date() })
      .where(eq(invoices.id, id))
      .returning();
    return updated;
  }

  async createInvoiceItem(itemData: InsertInvoiceItem): Promise<InvoiceItem> {
    const [item] = await db.insert(invoiceItems).values(itemData).returning();
    return item;
  }

  async createInvoiceAuditLog(logData: any): Promise<void> {
    // Stub implementation
    console.log("Invoice audit log:", logData);
  }

  async createAuditLog(logData: any): Promise<void> {
    // Stub implementation for audit logging
    console.log("Audit log:", {
      userId: logData.userId,
      action: logData.action,
      resourceType: logData.resourceType,
      resourceId: logData.resourceId,
      details: logData.details,
      timestamp: new Date().toISOString()
    });
  }
  
  // === IMPLEMENTAÇÕES DOS MÉTODOS EM FALTA ===
  
  async getCreditPackages(): Promise<CreditPackage[]> {
    return await db.select().from(creditPackages);
  }
  
  async updateUserPlan(userId: string, plan: string): Promise<User> {
    return await this.updateUser(userId, { selectedPlan: plan, subscriptionPlan: plan });
  }
  
  async updateUserStripeCustomerId(userId: string, customerId: string): Promise<User> {
    return await this.updateUser(userId, { stripeCustomerId: customerId });
  }
  
  async updateUserStripeInfo(userId: string, info: any): Promise<User> {
    return await this.updateUser(userId, { 
      stripeCustomerId: info.customerId,
      stripeSubscriptionId: info.subscriptionId
    });
  }
  
  async setPasswordResetToken(userId: string, token: string, expires: Date): Promise<void> {
    await this.updateUser(userId, { 
      passwordResetToken: token,
      passwordResetExpires: expires
    });
  }
  
  async getUserByPasswordResetToken(token: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.passwordResetToken, token));
    return user;
  }

  async getUserByEmailVerificationToken(token: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.emailVerificationToken, token));
    return user;
  }
  
  async resetUserPassword(userId: string, newPassword: string): Promise<void> {
    await this.updateUser(userId, { 
      password: newPassword
    });
  }
  
  // === MÉTODOS STUB SIMPLIFICADOS ===
  
  async getBusinessProfile(userId: string): Promise<any> {
    const user = await this.getUser(userId);
    return user ? {
      id: user.id,
      companyName: user.companyName || '',
      companyAddress: user.companyAddress || '',
      companyPhone: user.companyPhone || '',
      nif: user.nif
    } : null;
  }
  
  async createBusinessProfile(data: any): Promise<any> {
    return { id: Date.now(), ...data };
  }
  
  async updateBusinessProfile(id: string, data: any): Promise<any> {
    return { id, ...data };
  }
  
  async createAiResponse(data: any): Promise<any> {
    return { id: Date.now(), ...data, createdAt: new Date() };
  }
  
  async getUserAiResponses(userId: string, limit?: number): Promise<any[]> {
    return [];
  }
  
  async updateAiResponse(id: string, data: any): Promise<any> {
    return { id, ...data };
  }
  
  async getPageContent(page: string): Promise<any> {
    return { page, content: '' };
  }
  
  async updatePageContent(page: string, content: string): Promise<any> {
    return { page, content };
  }
  
  async createPageContent(data: any): Promise<any> {
    return { id: Date.now(), ...data };
  }
  
  async getAllPageContents(): Promise<any[]> {
    return [];
  }
  
  async createSentimentAnalysis(data: any): Promise<any> {
    return { id: Date.now(), ...data };
  }
  
  async getSentimentAnalysisByUser(userId: string): Promise<any[]> {
    return [];
  }
  
  async createEngagementPrediction(data: any): Promise<any> {
    return { id: Date.now(), ...data };
  }
  
  async getInteractionHistoryByUser(userId: string): Promise<any[]> {
    return [];
  }
  
  async createLinkedinBusinessConfig(data: any): Promise<any> {
    return { id: Date.now(), ...data };
  }
  
  async getLinkedinBusinessConfigByUser(userId: string): Promise<any> {
    return null;
  }
  
  async createCrmContact(data: any): Promise<any> {
    return { id: Date.now(), ...data };
  }
  
  async getCrmContactsByUser(userId: string): Promise<any[]> {
    return [];
  }
  
  async getSalesPipelineByUser(userId: string): Promise<any[]> {
    return [];
  }

  // =====================================
  // MÉTODOS PARA EMAIL SEQUENCES
  // =====================================

  async createEmailSequence(data: InsertEmailSequence): Promise<EmailSequence> {
    const [emailSequence] = await db.insert(emailSequences).values(data).returning();
    return emailSequence;
  }

  async getPendingEmailSequences(beforeDate: Date): Promise<EmailSequence[]> {
    return await db
      .select()
      .from(emailSequences)
      .where(
        and(
          eq(emailSequences.status, 'pending'),
          lte(emailSequences.scheduledFor, beforeDate)
        )
      )
      .orderBy(emailSequences.scheduledFor);
  }

  async updateEmailSequenceStatus(
    id: number, 
    status: 'pending' | 'sent' | 'failed' | 'cancelled',
    sentAt?: Date | null,
    errorMessage?: string
  ): Promise<void> {
    const updateData: any = {
      status,
      updatedAt: new Date(),
    };
    
    if (sentAt) updateData.sentAt = sentAt;
    if (errorMessage) updateData.errorMessage = errorMessage;
    
    await db
      .update(emailSequences)
      .set(updateData)
      .where(eq(emailSequences.id, id));
  }

  async cancelEmailSequenceForUser(userId: string): Promise<void> {
    await db
      .update(emailSequences)
      .set({
        status: 'cancelled',
        updatedAt: new Date()
      })
      .where(
        and(
          eq(emailSequences.userId, userId),
          eq(emailSequences.status, 'pending')
        )
      );
  }

  async getEmailSequenceStats(): Promise<{
    total: number;
    pending: number;
    sent: number;
    failed: number;
    cancelled: number;
  }> {
    const stats = await db
      .select({
        status: emailSequences.status,
        count: sql<number>`count(*)`
      })
      .from(emailSequences)
      .groupBy(emailSequences.status);
    
    const result = {
      total: 0,
      pending: 0,
      sent: 0,
      failed: 0,
      cancelled: 0
    };
    
    stats.forEach(stat => {
      const count = Number(stat.count);
      result.total += count;
      if (stat.status === 'pending') result.pending = count;
      else if (stat.status === 'sent') result.sent = count;
      else if (stat.status === 'failed') result.failed = count;
      else if (stat.status === 'cancelled') result.cancelled = count;
    });
    
    return result;
  }

  async getUserEmailSequences(userId: string): Promise<EmailSequence[]> {
    return await db
      .select()
      .from(emailSequences)
      .where(eq(emailSequences.userId, userId))
      .orderBy(emailSequences.scheduledFor);
  }

}

// =====================================
// EXPORTAR INSTÂNCIA
// =====================================

export const storage = new DatabaseStorage();