import {
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  bigint,
} from "drizzle-orm/mysql-core";

// ─── Users ───────────────────────────────────────────────────────────────────

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─── Scenarios ───────────────────────────────────────────────────────────────

export const scenarios = mysqlTable("scenarios", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  title: varchar("title", { length: 512 }).notNull(),
  fileName: varchar("fileName", { length: 512 }).notNull(),
  fileUrl: text("fileUrl").notNull(),
  fileKey: varchar("fileKey", { length: 512 }).notNull(),
  fileSize: bigint("fileSize", { mode: "number" }).default(0),
  status: mysqlEnum("status", ["uploading", "processing", "completed", "error"])
    .default("uploading")
    .notNull(),
  errorMessage: text("errorMessage"),
  synopsis: text("synopsis"),
  sceneCount: int("sceneCount").default(0),
  characterCount: int("characterCount").default(0),
  locationCount: int("locationCount").default(0),
  screenwriterName: varchar("screenwriterName", { length: 256 }),
  screenwriterEmail: varchar("screenwriterEmail", { length: 256 }),
  screenwriterPhone: varchar("screenwriterPhone", { length: 20 }),
  durationSeconds: int("durationSeconds").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Scenario = typeof scenarios.$inferSelect;
export type InsertScenario = typeof scenarios.$inferInsert;

// ─── Scenes ──────────────────────────────────────────────────────────────────

export const scenes = mysqlTable("scenes", {
  id: int("id").autoincrement().primaryKey(),
  scenarioId: int("scenarioId").notNull(),
  sceneNumber: int("sceneNumber").notNull(),
  intExt: varchar("intExt", { length: 32 }),
  location: varchar("location", { length: 512 }),
  dayNight: varchar("dayNight", { length: 32 }),
  description: text("description"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Scene = typeof scenes.$inferSelect;
export type InsertScene = typeof scenes.$inferInsert;

// ─── Characters ──────────────────────────────────────────────────────────────

export const characters = mysqlTable("characters", {
  id: int("id").autoincrement().primaryKey(),
  scenarioId: int("scenarioId").notNull(),
  name: varchar("name", { length: 256 }).notNull(),
  gender: mysqlEnum("gender", ["male", "female", "unknown"]).default("unknown").notNull(),
  age: mysqlEnum("age", ["adult", "child", "unknown"]).default("unknown").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Character = typeof characters.$inferSelect;
export type InsertCharacter = typeof characters.$inferInsert;

// ─── Scene–Characters junction ───────────────────────────────────────────────

export const sceneCharacters = mysqlTable("scene_characters", {
  id: int("id").autoincrement().primaryKey(),
  sceneId: int("sceneId").notNull(),
  characterId: int("characterId").notNull(),
});

export type SceneCharacter = typeof sceneCharacters.$inferSelect;
export type InsertSceneCharacter = typeof sceneCharacters.$inferInsert;

// ─── Dialogues ───────────────────────────────────────────────────────────────

export const dialogues = mysqlTable("dialogues", {
  id: int("id").autoincrement().primaryKey(),
  sceneId: int("sceneId").notNull(),
  characterId: int("characterId"),
  text: text("text"),
  orderIndex: int("orderIndex").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Dialogue = typeof dialogues.$inferSelect;
export type InsertDialogue = typeof dialogues.$inferInsert;

// ─── Props (Accessoires) ─────────────────────────────────────────────────────

export const props = mysqlTable("props", {
  id: int("id").autoincrement().primaryKey(),
  scenarioId: int("scenarioId").notNull(),
  name: varchar("name", { length: 256 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Prop = typeof props.$inferSelect;
export type InsertProp = typeof props.$inferInsert;

// ─── Scene–Props junction ────────────────────────────────────────────────────

export const sceneProps = mysqlTable("scene_props", {
  id: int("id").autoincrement().primaryKey(),
  sceneId: int("sceneId").notNull(),
  propId: int("propId").notNull(),
});

export type SceneProp = typeof sceneProps.$inferSelect;
export type InsertSceneProp = typeof sceneProps.$inferInsert;

// ─── Sequences ───────────────────────────────────────────────────────────────

export const sequences = mysqlTable("sequences", {
  id: int("id").autoincrement().primaryKey(),
  scenarioId: int("scenarioId").notNull(),
  name: varchar("name", { length: 256 }).notNull(),
  summary: text("summary"),
  orderIndex: int("orderIndex").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Sequence = typeof sequences.$inferSelect;
export type InsertSequence = typeof sequences.$inferInsert;

// ─── Sequence–Scenes junction ────────────────────────────────────────────────

export const sequenceScenes = mysqlTable("sequence_scenes", {
  id: int("id").autoincrement().primaryKey(),
  sequenceId: int("sequenceId").notNull(),
  sceneId: int("sceneId").notNull(),
  orderIndex: int("orderIndex").default(0),
});

export type SequenceScene = typeof sequenceScenes.$inferSelect;
export type InsertSequenceScene = typeof sequenceScenes.$inferInsert;


// ─── Budgets ─────────────────────────────────────────────────────────────────

export const budgets = mysqlTable("budgets", {
  id: int("id").autoincrement().primaryKey(),
  scenarioId: int("scenarioId").notNull(),
  version: mysqlEnum("version", ["eco", "confort"]).default("eco").notNull(),
  shootingDays: int("shootingDays").default(0),
  pagesPerDay: int("pagesPerDay").default(0),
  totalBudgetEco: int("totalBudgetEco").default(0),
  totalBudgetConfort: int("totalBudgetConfort").default(0),
  content: text("content"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Budget = typeof budgets.$inferSelect;
export type InsertBudget = typeof budgets.$inferInsert;

// ─── Salary Scales (PCINE) ───────────────────────────────────────────────────

export const salaryScales = mysqlTable("salary_scales", {
  id: int("id").autoincrement().primaryKey(),
  role: varchar("role", { length: 256 }).notNull().unique(),
  category: varchar("category", { length: 256 }).notNull(),
  monthlySalary: int("monthlySalary").default(0),
  dailyRate: int("dailyRate").default(0),
  hourlyRate: int("hourlyRate").default(0),
  source: varchar("source", { length: 256 }).default("PCINE mai 2025"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type SalaryScale = typeof salaryScales.$inferSelect;
export type InsertSalaryScale = typeof salaryScales.$inferInsert;

// ─── Clients (Gestion Commerciale) ───────────────────────────────────────────

export const clients = mysqlTable("clients", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  type: mysqlEnum("type", ["particulier", "entreprise"]).default("entreprise").notNull(),
  name: varchar("name", { length: 256 }).notNull(),
  address: text("address"),
  email: varchar("email", { length: 256 }),
  phone: varchar("phone", { length: 20 }),
  siret: varchar("siret", { length: 20 }),
  vatNumber: varchar("vatNumber", { length: 50 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Client = typeof clients.$inferSelect;
export type InsertClient = typeof clients.$inferInsert;

// ─── Products (Gestion Commerciale) ──────────────────────────────────────────

export const products = mysqlTable("products", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 256 }).notNull(),
  description: text("description"),
  priceHT: int("priceHT").default(0),
  vatRate: int("vatRate").default(20),
  unit: mysqlEnum("unit", ["heure", "jour", "forfait"]).default("forfait").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Product = typeof products.$inferSelect;
export type InsertProduct = typeof products.$inferInsert;

// ─── Quotes (Devis) ──────────────────────────────────────────────────────────

export const quotes = mysqlTable("quotes", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  clientId: int("clientId").notNull(),
  number: varchar("number", { length: 32 }).notNull().unique(),
  issueDate: timestamp("issueDate").defaultNow().notNull(),
  validityDate: timestamp("validityDate"),
  status: varchar("status", { length: 32 }).default("brouillon").notNull(),
  totalHT: int("totalHT").default(0),
  totalVAT: int("totalVAT").default(0),
  totalTTC: int("totalTTC").default(0),
  paymentTerms: text("paymentTerms"),
  clientSignature: varchar("clientSignature", { length: 512 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Quote = typeof quotes.$inferSelect;
export type InsertQuote = typeof quotes.$inferInsert;

// ─── Quote Lines ─────────────────────────────────────────────────────────────

export const quoteLines = mysqlTable("quote_lines", {
  id: int("id").autoincrement().primaryKey(),
  quoteId: int("quoteId").notNull(),
  productId: int("productId").notNull(),
  productName: varchar("productName", { length: 256 }),
  quantity: int("quantity").default(1),
  unitPriceHT: int("unitPriceHT").default(0),
  vatRate: int("vatRate").default(20),
  lineTotal: int("lineTotal").default(0),
  orderIndex: int("orderIndex").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type QuoteLine = typeof quoteLines.$inferSelect;
export type InsertQuoteLine = typeof quoteLines.$inferInsert;

// ─── Invoices (Factures) ─────────────────────────────────────────────────────

export const invoices = mysqlTable("invoices", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  clientId: int("clientId").notNull(),
  quoteId: int("quoteId"),
  number: varchar("number", { length: 32 }).notNull().unique(),
  issueDate: timestamp("issueDate").defaultNow().notNull(),
  dueDate: timestamp("dueDate"),
  status: mysqlEnum("status", ["brouillon", "envoyée", "payée", "en retard"]).default("brouillon").notNull(),
  totalHT: int("totalHT").default(0),
  totalVAT: int("totalVAT").default(0),
  totalTTC: int("totalTTC").default(0),
  paymentMethod: varchar("paymentMethod", { length: 64 }),
  paymentDate: timestamp("paymentDate"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Invoice = typeof invoices.$inferSelect;
export type InsertInvoice = typeof invoices.$inferInsert;

// ─── Invoice Lines ───────────────────────────────────────────────────────────

export const invoiceLines = mysqlTable("invoice_lines", {
  id: int("id").autoincrement().primaryKey(),
  invoiceId: int("invoiceId").notNull(),
  productId: int("productId").notNull(),
  productName: varchar("productName", { length: 256 }),
  quantity: int("quantity").default(1),
  unitPriceHT: int("unitPriceHT").default(0),
  vatRate: int("vatRate").default(20),
  lineTotal: int("lineTotal").default(0),
  orderIndex: int("orderIndex").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type InvoiceLine = typeof invoiceLines.$inferSelect;
export type InsertInvoiceLine = typeof invoiceLines.$inferInsert;

// ─── Credits (Avoirs) ────────────────────────────────────────────────────────

export const credits = mysqlTable("credits", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  invoiceId: int("invoiceId").notNull(),
  number: varchar("number", { length: 32 }).notNull().unique(),
  amount: int("amount").default(0),
  reason: text("reason"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Credit = typeof credits.$inferSelect;
export type InsertCredit = typeof credits.$inferInsert;


// ─── Company Settings ────────────────────────────────────────────────────────
export const companySettings = mysqlTable("company_settings", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  companyName: varchar("companyName", { length: 256 }).notNull(),
  tradeName: varchar("tradeName", { length: 256 }),
  siret: varchar("siret", { length: 14 }),
  vatNumber: varchar("vatNumber", { length: 32 }),
  address: text("address"),
  phone: varchar("phone", { length: 20 }),
  email: varchar("email", { length: 256 }),
  website: varchar("website", { length: 256 }),
  logoUrl: text("logoUrl"),
  logoKey: varchar("logoKey", { length: 512 }),
  legalMentions: text("legalMentions"),
  paymentTerms: varchar("paymentTerms", { length: 256 }).default("30 jours net"),
  paymentConditions: text("paymentConditions"),
  bankDetails: text("bankDetails"),
  signature: text("signature"),
  signatureUrl: text("signatureUrl"),
  signatureKey: varchar("signatureKey", { length: 512 }),
  defaultVatRate: int("defaultVatRate").default(20),
  invoicePrefix: varchar("invoicePrefix", { length: 10 }).default("FA"),
  quotePrefix: varchar("quotePrefix", { length: 10 }).default("DV"),
  creditPrefix: varchar("creditPrefix", { length: 10 }).default("AV"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type CompanySettings = typeof companySettings.$inferSelect;
export type InsertCompanySettings = typeof companySettings.$inferInsert;

// ─── Document Counters (numérotation séquentielle irréversible) ───────────────
export const documentCounters = mysqlTable("document_counters", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  prefix: varchar("prefix", { length: 10 }).notNull(),
  year: int("year").notNull(),
  lastSequence: int("lastSequence").default(0).notNull(),
});
