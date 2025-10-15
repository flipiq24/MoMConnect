import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User schema for login
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Property schema for wholesale analysis
export const properties = pgTable("properties", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  address: text("address").notNull(),
  
  // Risk assessment fields
  daysInMLS: text("days_in_mls"),
  purchasePriceRange: text("purchase_price_range"),
  valueSubjectToPermits: text("value_subject_to_permits"),
  valueSubjectToADU: text("value_subject_to_adu"),
  wholesalePriceVsAsking: text("wholesale_price_vs_asking"),
  arvConfidence: text("arv_confidence"),
  roiForTimeEffort: text("roi_for_time_effort"),
  zoning: text("zoning"),
  rehabLevel: text("rehab_level"),
  areaDesirability: text("area_desirability"),
  obsolescencesIssues: text("obsolescences_issues"),
  occupancy: text("occupancy"),
  
  // Financial data
  purchasePrice: integer("purchase_price"),
  estimatedRehab: integer("estimated_rehab"),
  arv: integer("arv"),
  
  // Calculated fields
  totalScore: integer("total_score").default(0),
  emdRecommendation: text("emd_recommendation"),
  successChance: integer("success_chance"),
  
  // Zillow/property data
  zillowData: jsonb("zillow_data"),
  
  // AI Analysis
  aiAnalysis: jsonb("ai_analysis"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Zod schemas for validation
export const insertUserSchema = createInsertSchema(users).pick({
  name: true,
  email: true,
});

export const insertPropertySchema = createInsertSchema(properties).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  totalScore: true,
  emdRecommendation: true,
  successChance: true,
}).extend({
  email: z.string().email(),
});

export const updatePropertySchema = insertPropertySchema.partial().extend({
  id: z.string(),
});

// TypeScript types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertProperty = z.infer<typeof insertPropertySchema>;
export type UpdateProperty = z.infer<typeof updatePropertySchema>;
export type Property = typeof properties.$inferSelect;

// Scoring rules type
export interface ScoringRules {
  [key: string]: {
    [option: string]: number;
  };
}

// AI Analysis type
export interface AIAnalysis {
  summary: string;
  strengths: string[];
  concerns: string[];
  recommendation: string;
  breakdown: {
    field: string;
    value: string;
    points: number;
  }[];
}

// Zillow data type
export interface ZillowData {
  address: string;
  zpid: string;
  price: number;
  bedrooms: number;
  bathrooms: number;
  sqft: number;
  lotSize: number;
  yearBuilt: number;
  zestimate: number;
}

// EMD Recommendation type
export interface EMDRecommendation {
  emd: 'Yes EMD' | 'TBD' | 'No EMD';
  chance: number;
}
