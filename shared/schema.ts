
import { pgTable, text, serial, integer, boolean, timestamp, jsonb, decimal, date } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// --- Users & Auth ---
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  companyName: text("company_name"),
  companyAddress: text("company_address"),
  phone: text("phone"),
  nif: text("nif"),
  role: text("role").default("user"),
  
  // Status & Permissions
  isActive: boolean("is_active").default(true),
  isAdmin: boolean("is_admin").default(false),
  isSuperAdmin: boolean("is_super_admin").default(false),
  isAgencyOwner: boolean("is_agency_owner").default(false),
  emailVerified: boolean("email_verified").default(false),
  
  // Relations
  agencyId: integer("agency_id"), 
  
  // Subscription & Billing
  credits: integer("credits").default(0),
  selectedPlan: text("selected_plan").default("trial"),
  subscriptionPlan: text("subscription_plan").default("trial"),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  
  // Tokens
  emailVerificationToken: text("email_verification_token"),
  passwordResetToken: text("password_reset_token"),
  passwordResetExpires: timestamp("password_reset_expires"),
  
  // Meta
  profileImageUrl: text("profile_image_url"),
  lastLoginAt: timestamp("last_login_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// --- Agencies ---
export const agencies = pgTable("agencies", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  ownerId: integer("owner_id").notNull(),
  logoUrl: text("logo_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const agencyMembers = pgTable("agency_members", {
  id: serial("id").primaryKey(),
  agencyId: integer("agency_id").notNull(),
  userId: integer("user_id").notNull(),
  role: text("role").default("member"), // admin, member
  status: text("status").default("active"), // active, pending, suspended
  permissions: text("permissions"), // JSON string or comma separated
  invitedBy: integer("invited_by"),
  joinedAt: timestamp("joined_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const agencyInvitations = pgTable("agency_invitations", {
  id: serial("id").primaryKey(),
  agencyId: integer("agency_id").notNull(),
  email: text("email").notNull(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  role: text("role").default("member"),
  token: text("token").notNull(),
  status: text("status").default("pending"), 
  invitedBy: integer("invited_by").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  acceptedAt: timestamp("accepted_at"),
  acceptedBy: integer("accepted_by"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const agencyAdminDelegations = pgTable("agency_admin_delegations", {
  id: serial("id").primaryKey(),
  agencyId: integer("agency_id").notNull(),
  delegatedBy: integer("delegated_by").notNull(),
  delegatedTo: integer("delegated_to").notNull(),
  type: text("type").notNull(), // temporary, permanent
  status: text("status").default("active"),
  startDate: timestamp("start_date").defaultNow(),
  endDate: timestamp("end_date"),
  permissions: jsonb("permissions"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// --- Business & Reviews ---
export const establishments = pgTable("establishments", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  name: text("name").notNull(),
  type: text("type"),
  brandTone: text("brand_tone"),
  responseGuidelines: text("response_guidelines"),
  forbiddenPhrases: text("forbidden_phrases"),
  platformIds: jsonb("platform_ids"), 
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const reviews = pgTable("reviews", {
  id: serial("id").primaryKey(),
  establishmentId: integer("establishment_id"),
  platform: text("platform").notNull(),
  externalId: text("external_id"),
  authorName: text("author_name"),
  rating: integer("rating"),
  reviewText: text("review_text"),
  language: text("language"),
  sentiment: text("sentiment"),
  reviewDate: timestamp("review_date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const responses = pgTable("responses", {
  id: serial("id").primaryKey(),
  reviewId: integer("review_id"),
  userId: integer("user_id").notNull(),
  variationNumber: integer("variation_number"),
  responseText: text("response_text").notNull(),
  tone: text("tone"),
  language: text("language"),
  responseType: text("response_type"), 
  
  // Context
  customerName: text("customer_name"),
  visitDate: text("visit_date"),
  product: text("product"),
  location: text("location"),
  
  // Metadata
  creditsUsed: integer("credits_used").default(1),
  aiModel: text("ai_model"),
  isSelected: boolean("is_selected").default(false),
  isPublished: boolean("is_published").default(false),
  publishedAt: timestamp("published_at"),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const responseTemplates = pgTable("response_templates", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  name: text("name").notNull(),
  content: text("content").notNull(),
  tone: text("tone"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// --- Automation Rules ---
export const automationRules = pgTable("automation_rules", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  name: text("name").notNull(),
  platform: text("platform").notNull(),
  isActive: boolean("is_active").default(true),
  trigger: jsonb("trigger").notNull(), // { type, value, condition }
  action: jsonb("action").notNull(),   // { type, template, delay }
  createdAt: timestamp("created_at").defaultNow().notNull(),
  lastTriggered: timestamp("last_triggered"),
  triggerCount: integer("trigger_count").default(0),
});

// --- Credits & Billing ---
export const creditTransactions = pgTable("credit_transactions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  type: text("type").notNull(), // usage, purchase, bonus, refund, upsell
  amount: integer("amount").notNull(), 
  description: text("description"),
  relatedResponseId: integer("related_response_id"),
  stripePaymentId: text("stripe_payment_id"),
  stripePaymentIntentId: text("stripe_payment_intent_id"),
  packageId: text("package_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const creditPackages = pgTable("credit_packages", {
  id: text("id").primaryKey(), 
  name: text("name").notNull(),
  slug: text("slug"),
  description: text("description"),
  credits: integer("credits").notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  originalPrice: decimal("original_price", { precision: 10, scale: 2 }),
  discount: integer("discount"),
  features: jsonb("features"),
  isPopular: boolean("is_popular").default(false),
  isActive: boolean("is_active").default(true),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const subscriptionPlans = pgTable("subscription_plans", {
  id: text("id").primaryKey(), 
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  description: text("description"),
  priceMonthly: decimal("price_monthly", { precision: 10, scale: 2 }).notNull(),
  priceYearly: decimal("price_yearly", { precision: 10, scale: 2 }).notNull(),
  monthlyResponses: integer("monthly_responses").notNull(),
  maxLocations: integer("max_locations").default(1),
  maxUsers: integer("max_users").default(1),
  features: jsonb("features"),
  byokSupported: boolean("byok_supported").default(false),
  hasApiAccess: boolean("has_api_access").default(false),
  hasPrioritySupport: boolean("has_priority_support").default(false),
  isActive: boolean("is_active").default(true),
  orderIndex: integer("order_index").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const subscriptions = pgTable("subscriptions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  planType: text("plan_type").notNull(),
  status: text("status").default("active"),
  currentPeriodStart: timestamp("current_period_start"),
  currentPeriodEnd: timestamp("current_period_end"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// --- Leads & CRM ---
export const leads = pgTable("leads", {
  id: serial("id").primaryKey(),
  companyName: text("company_name").notNull(),
  contactName: text("contact_name"),
  email: text("email").notNull(),
  phone: text("phone"),
  website: text("website"),
  industry: text("industry"),
  region: text("region"),
  businessType: text("business_type"),
  source: text("source").default("manual"),
  status: text("status").default("novo"), 
  
  // Email Automation
  emailStatus: text("email_status").default("pending"),
  firstEmailSentAt: timestamp("first_email_sent_at"),
  secondEmailSentAt: timestamp("second_email_sent_at"),
  thirdEmailSentAt: timestamp("third_email_sent_at"),
  
  // Scoring
  leadScore: integer("lead_score").default(0),
  aiConfidence: decimal("ai_confidence", { precision: 5, scale: 2 }),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const emailSequences = pgTable("email_sequences", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  status: text("status").default("pending"),
  scheduledAt: timestamp("scheduled_at").notNull(),
  sentAt: timestamp("sent_at"),
  templateId: text("template_id"),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// --- Invoicing ---
export const invoices = pgTable("invoices", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  number: text("number").notNull(),
  customerName: text("customer_name").notNull(),
  customerNif: text("customer_nif"),
  customerAddress: text("customer_address"),
  customerEmail: text("customer_email"),
  date: date("date").notNull(),
  dueDate: date("due_date").notNull(),
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull(),
  tax: decimal("tax", { precision: 10, scale: 2 }).notNull(),
  total: decimal("total", { precision: 10, scale: 2 }).notNull(),
  status: text("status").default("draft"),
  atDocumentId: text("at_document_id"),
  atQrCode: text("at_qr_code"),
  atSubmittedAt: timestamp("at_submitted_at"),
  atError: text("at_error"),
  pdfPath: text("pdf_path"),
  emailSent: boolean("email_sent").default(false),
  emailSentAt: timestamp("email_sent_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const invoiceItems = pgTable("invoice_items", {
  id: serial("id").primaryKey(),
  invoiceId: integer("invoice_id").notNull(),
  description: text("description").notNull(),
  quantity: integer("quantity").notNull(),
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
  taxRate: decimal("tax_rate", { precision: 5, scale: 2 }).notNull(),
  total: decimal("total", { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const invoiceSettings = pgTable("invoice_settings", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  companyName: text("company_name").notNull(),
  companyNif: text("company_nif").notNull(),
  companyAddress: text("company_address").notNull(),
  invoicePrefix: text("invoice_prefix").default("FAT"),
  nextNumber: integer("next_number").default(1),
  vatRate: decimal("vat_rate", { precision: 5, scale: 2 }).default("23.00"),
  invoiceSequence: integer("invoice_sequence").default(1),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// --- Referrals ---
export const referrals = pgTable("referrals", {
  id: serial("id").primaryKey(),
  referrerId: integer("referrer_id").notNull(),
  referredUserId: integer("referred_user_id"),
  referralCode: text("referral_code").notNull().unique(),
  status: text("status").default("pending"),
  rewardAmount: integer("reward_amount").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
});

// --- Content & Social ---
export const pageContents = pgTable("page_contents", {
  id: serial("id").primaryKey(),
  pageKey: text("page_key").notNull().unique(),
  title: text("title"),
  content: text("content"), // JSON string
  metadata: jsonb("metadata"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const corporateSocialAccounts = pgTable("corporate_social_accounts", {
  id: text("id").primaryKey(),
  platform: text("platform").notNull(),
  username: text("username").notNull(),
  accessToken: text("access_token").notNull(),
  refreshToken: text("refresh_token"),
  tokenExpiresAt: timestamp("token_expires_at"),
  followerCount: integer("follower_count").default(0),
  isConnected: boolean("is_connected").default(true),
  isActive: boolean("is_active").default(true),
  profileImageUrl: text("profile_image_url"),
  lastSync: timestamp("last_sync").defaultNow(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const corporatePosts = pgTable("corporate_posts", {
  id: text("id").primaryKey(),
  content: text("content"),
  mediaUrls: jsonb("media_urls"),
  platforms: jsonb("platforms"),
  publishResults: jsonb("publish_results"),
  status: text("status").default("draft"),
  scheduledFor: timestamp("scheduled_for"),
  publishedAt: timestamp("published_at"),
  createdBy: integer("created_by"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// --- Sessions ---
export const sessions = pgTable("session", {
  sid: text("sid").primaryKey(),
  sess: jsonb("sess").notNull(),
  expire: timestamp("expire", { precision: 6 }).notNull(),
});

// Export aliases
export const creditPacks = creditPackages;

// Zod Schemas
export const insertUserSchema = createInsertSchema(users);
export const insertAgencySchema = createInsertSchema(agencies);
export const insertEstablishmentSchema = createInsertSchema(establishments);
export const insertReviewSchema = createInsertSchema(reviews);
export const insertResponseSchema = createInsertSchema(responses);
export const insertCreditTransactionSchema = createInsertSchema(creditTransactions);
export const insertCreditPackageSchema = createInsertSchema(creditPackages);
export const insertReferralSchema = createInsertSchema(referrals);
export const insertLeadSchema = createInsertSchema(leads);
export const insertInvoiceSchema = createInsertSchema(invoices);
export const insertInvoiceItemSchema = createInsertSchema(invoiceItems);
export const insertInvoiceSettingsSchema = createInsertSchema(invoiceSettings);
export const insertSubscriptionSchema = createInsertSchema(subscriptions);
export const insertEmailSequenceSchema = createInsertSchema(emailSequences);
export const insertAutomationRuleSchema = createInsertSchema(automationRules);

// Auth Specific Schemas
export const registerUserSchema = insertUserSchema.pick({
  email: true,
  password: true,
  firstName: true,
  lastName: true,
  companyName: true,
  nif: true,
});

export const loginUserSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export const newRegisterSchema = registerUserSchema.extend({
  phone: z.string().optional(),
  companyAddress: z.string().optional()
});

export const newLoginSchema = loginUserSchema;

export const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

export const resetPasswordSchema = z.object({
  token: z.string(),
  password: z.string().min(8),
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type RegisterData = z.infer<typeof registerUserSchema>;
export type UpdateUser = Partial<InsertUser>;

export type Agency = typeof agencies.$inferSelect;
export type InsertAgency = typeof agencies.$inferInsert;

export type Establishment = typeof establishments.$inferSelect;
export type InsertEstablishment = typeof establishments.$inferInsert;

export type Review = typeof reviews.$inferSelect;
export type InsertReview = typeof reviews.$inferInsert;

export type Response = typeof responses.$inferSelect;
export type InsertResponse = typeof responses.$inferInsert;

export type CreditTransaction = typeof creditTransactions.$inferSelect;
export type InsertCreditTransaction = typeof creditTransactions.$inferInsert;

export type CreditPackage = typeof creditPackages.$inferSelect;
export type InsertCreditPackage = typeof creditPackages.$inferInsert;

export type Referral = typeof referrals.$inferSelect;
export type InsertReferral = typeof referrals.$inferInsert;

export type Lead = typeof leads.$inferSelect;
export type InsertLead = typeof leads.$inferInsert;

export type Invoice = typeof invoices.$inferSelect;
export type InsertInvoice = typeof invoices.$inferInsert;

export type InvoiceItem = typeof invoiceItems.$inferSelect;
export type InsertInvoiceItem = typeof invoiceItems.$inferInsert;

export type InvoiceSettings = typeof invoiceSettings.$inferSelect;
export type InsertInvoiceSettings = typeof invoiceSettings.$inferInsert;

export type Subscription = typeof subscriptions.$inferSelect;
export type InsertSubscription = typeof subscriptions.$inferInsert;

export type EmailSequence = typeof emailSequences.$inferSelect;
export type InsertEmailSequence = typeof emailSequences.$inferInsert;

export type AutomationRule = typeof automationRules.$inferSelect;
export type InsertAutomationRule = typeof automationRules.$inferInsert;
