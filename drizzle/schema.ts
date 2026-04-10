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
