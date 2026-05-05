
import { pgTable, text, serial, integer, boolean, timestamp, jsonb, decimal, date, index, uniqueIndex } from "drizzle-orm/pg-core";
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
  currentPeriodStart: timestamp("current_period_start"),
  currentPeriodEnd: timestamp("current_period_end"),
  creditsUsedThisPeriod: integer("credits_used_this_period").default(0),
  
  // Tokens
  emailVerificationToken: text("email_verification_token"),
  passwordResetToken: text("password_reset_token"),
  passwordResetExpires: timestamp("password_reset_expires"),
  
  // Meta
  profileImageUrl: text("profile_image_url"),
  lastLoginAt: timestamp("last_login_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => {
  return {
    emailIdx: uniqueIndex("email_idx").on(table.email),
    stripeCustomerIdx: index("stripe_customer_idx").on(table.stripeCustomerId),
  };
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
}, (table) => {
  return {
    agencyUserIdx: index("agency_user_idx").on(table.agencyId, table.userId),
  };
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
}, (table) => {
  return {
    tokenIdx: index("token_idx").on(table.token),
    emailAgencyIdx: index("email_agency_idx").on(table.email, table.agencyId),
  };
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
  logoUrl: text("logo_url"),
  type: text("type"),
  brandTone: text("brand_tone"),
  responseGuidelines: text("response_guidelines"),
  forbiddenPhrases: text("forbidden_phrases"),
  platformIds: jsonb("platform_ids"), 
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => {
  return {
    userIdIdx: index("establishment_user_id_idx").on(table.userId),
  };
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
}, (table) => {
  return {
    estIdIdx: index("review_establishment_id_idx").on(table.establishmentId),
  };
});

export const responses = pgTable("responses", {
  id: serial("id").primaryKey(),
  reviewId: integer("review_id"),
  userId: integer("user_id").notNull(),
  variationNumber: integer("variation_number"),
  responseText: text("response_text").notNull(),
  tone: text("tone"),
  language: text("language"),
  originalMessage: text("original_message"),
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
  approvalStatus: text("approval_status").default("pending"), // pending, approved, edited, discarded
  originalResponseText: text("original_response_text"),
  editCount: integer("edit_count").default(0),
  attemptsCount: integer("attempts_count").default(1),
  approvedAt: timestamp("approved_at"),
  learningMeta: jsonb("learning_meta"),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => {
  return {
    userResponsesIdx: index("user_responses_idx").on(table.userId),
    reviewResponseIdx: index("review_response_idx").on(table.reviewId),
  };
});

export const responseLearningPatterns = pgTable("response_learning_patterns", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  language: text("language").notNull(),
  tone: text("tone").notNull(),
  sentiment: text("sentiment").notNull(),
  openingStyle: text("opening_style"),
  closingStyle: text("closing_style"),
  preferredPhrases: jsonb("preferred_phrases"),
  avoidedPhrases: jsonb("avoided_phrases"),
  editCount: integer("edit_count").default(1),
  lastEditedAt: timestamp("last_edited_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => {
  return {
    learningLookupIdx: index("learning_lookup_idx").on(table.userId, table.language, table.tone, table.sentiment),
  };
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
}, (table) => {
  return {
    userRulesIdx: index("user_automation_rules_idx").on(table.userId),
  };
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
}, (table) => {
  return {
    userTxIdx: index("user_credit_tx_idx").on(table.userId),
    createdAtIdx: index("credit_tx_created_at_idx").on(table.createdAt),
  };
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
}, (table) => {
  return {
    userSubIdx: index("user_subscription_idx").on(table.userId),
  };
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
}, (table) => {
  return {
    leadEmailIdx: index("lead_email_idx").on(table.email),
    leadStatusIdx: index("lead_status_idx").on(table.status),
    emailStatusIdx: index("email_status_idx").on(table.emailStatus),
  };
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
}, (table) => {
  return {
    userSeqIdx: index("user_email_sequence_idx").on(table.userId),
    scheduledAtIdx: index("email_sequence_scheduled_idx").on(table.scheduledAt),
  };
});

// --- Invoicing ---
export const invoices = pgTable("invoices", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  settingsId: integer("settings_id"),
  invoiceNumber: text("invoice_number").notNull(),
  invoiceSeries: text("invoice_series"),
  invoiceSequenceNumber: integer("invoice_sequence_number"),
  
  customerName: text("customer_name").notNull(),
  customerVatNumber: text("customer_vat_number"),
  customerAddress: text("customer_address"),
  customerPostalCode: text("customer_postal_code"),
  customerCity: text("customer_city"),
  customerCountry: text("customer_country"),
  customerEmail: text("customer_email"),
  
  issueDate: timestamp("issue_date").notNull(),
  dueDate: timestamp("due_date").notNull(),
  
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull(),
  vatAmount: decimal("vat_amount", { precision: 10, scale: 2 }).notNull(),
  withholdingAmount: decimal("withholding_amount", { precision: 10, scale: 2 }).default("0.00"),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  currency: text("currency").default("EUR"),
  
  paymentMethod: text("payment_method"),
  paymentReference: text("payment_reference"),
  paymentDate: timestamp("payment_date"),
  
  status: text("status").default("draft"),
  notes: text("notes"),
  metadata: jsonb("metadata"),
  
  atDocumentId: text("at_document_id"),
  atValidationCode: text("at_validation_code"),
  atQrCode: text("at_qr_code"),
  atSubmittedAt: timestamp("at_submitted_at"),
  atError: text("at_error"),
  
  pdfPath: text("pdf_path"),
  emailSent: boolean("email_sent").default(false),
  emailSentAt: timestamp("email_sent_at"),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => {
  return {
    userInvoiceIdx: index("user_invoice_idx").on(table.userId),
    invoiceNumberIdx: uniqueIndex("invoice_number_idx").on(table.invoiceNumber),
  };
});

export const invoiceItems = pgTable("invoice_items", {
  id: serial("id").primaryKey(),
  invoiceId: integer("invoice_id").notNull(),
  description: text("description").notNull(),
  quantity: decimal("quantity", { precision: 10, scale: 2 }).notNull(),
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
  vatRate: decimal("vat_rate", { precision: 5, scale: 2 }).notNull(),
  lineTotal: decimal("line_total", { precision: 10, scale: 2 }).notNull(),
  vatAmount: decimal("vat_amount", { precision: 10, scale: 2 }).notNull(),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  productCode: text("product_code"),
  productCategory: text("product_category"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => {
  return {
    invoiceItemsIdx: index("invoice_items_idx").on(table.invoiceId),
  };
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
  withholdingTaxRate: decimal("withholding_tax_rate", { precision: 5, scale: 2 }).default("0.00"),
  invoiceSequence: integer("invoice_sequence").default(1),
  atUsername: text("at_username"),
  atPassword: text("at_password"),
  atTestMode: boolean("at_test_mode").default(true),
  invoiceEmailEnabled: boolean("invoice_email_enabled").default(true),
  defaultVatRate: decimal("default_vat_rate", { precision: 5, scale: 2 }).default("23.00"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// --- Referrals ---
export const referrals = pgTable("referrals", {
  id: serial("id").primaryKey(),
  referrerId: integer("referrer_id").notNull(),
  referredUserId: integer("referred_user_id"),
  referralCode: text("referral_code").notNull().unique(),
  email: text("email"),
  status: text("status").default("pending"),
  rewardAmount: integer("reward_amount").default(0),
  creditsEarned: integer("credits_earned").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
}, (table) => {
  return {
    referrerIdx: index("referrer_idx").on(table.referrerId),
    referralCodeIdx: uniqueIndex("referral_code_idx").on(table.referralCode),
  };
});

export const referralRewards = pgTable("referral_rewards", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  referralId: integer("referral_id").notNull(),
  type: text("type").notNull(), // 'signup_bonus', 'referrer_bonus'
  credits: integer("credits").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
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

export const socialPlatformConnections = pgTable("social_platform_connections", {
  id: serial("id").primaryKey(),
  userExternalId: text("user_external_id").notNull(), // Clerk user ID
  establishmentId: integer("establishment_id"),
  platform: text("platform").notNull(),
  status: text("status").default("connected"),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  tokenExpiresAt: timestamp("token_expires_at"),
  meta: jsonb("meta"),
  lastSyncAt: timestamp("last_sync_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => {
  return {
    userPlatformIdx: uniqueIndex("social_platform_user_unique").on(table.userExternalId, table.platform, table.establishmentId),
    platformIdx: index("social_platform_platform_idx").on(table.platform),
  };
});

export const oauthStates = pgTable("oauth_states", {
  id: serial("id").primaryKey(),
  state: text("state").notNull(),
  userExternalId: text("user_external_id").notNull(),
  platform: text("platform").notNull(),
  establishmentId: integer("establishment_id"),
  meta: jsonb("meta"),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => {
  return {
    stateIdx: uniqueIndex("oauth_states_state_unique").on(table.state),
    expiresIdx: index("oauth_states_expires_idx").on(table.expiresAt),
  };
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

// --- Quality Feedback ---
export const qualityFeedback = pgTable("quality_feedback", {
  id: serial("id").primaryKey(),
  responseId: integer("response_id"), // Linked to responses
  userId: integer("user_id").notNull(),
  rating: integer("rating").notNull(),
  sentiment: text("sentiment").notNull(),
  categories: text("categories"), // JSON string
  improvements: text("improvements"), // JSON string
  comment: text("comment"),
  isUseful: boolean("is_useful"),
  platform: text("platform"),
  responseTime: integer("response_time"), // milliseconds
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
export const insertReferralRewardSchema = createInsertSchema(referralRewards);
export const insertLeadSchema = createInsertSchema(leads);
export const insertInvoiceSchema = createInsertSchema(invoices);
export const insertInvoiceItemSchema = createInsertSchema(invoiceItems);
export const insertInvoiceSettingsSchema = createInsertSchema(invoiceSettings);
export const insertSubscriptionSchema = createInsertSchema(subscriptions);
export const insertEmailSequenceSchema = createInsertSchema(emailSequences);
export const insertAutomationRuleSchema = createInsertSchema(automationRules);
export const insertQualityFeedbackSchema = createInsertSchema(qualityFeedback);

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

export type ReferralReward = typeof referralRewards.$inferSelect;
export type InsertReferralReward = typeof referralRewards.$inferInsert;

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

export type QualityFeedback = typeof qualityFeedback.$inferSelect;
export type InsertQualityFeedback = typeof qualityFeedback.$inferInsert;

export type SocialPlatformConnection = typeof socialPlatformConnections.$inferSelect;
export type InsertSocialPlatformConnection = typeof socialPlatformConnections.$inferInsert;
export type ResponseLearningPattern = typeof responseLearningPatterns.$inferSelect;
export type InsertResponseLearningPattern = typeof responseLearningPatterns.$inferInsert;
