import { z } from "zod";

// ── Template Types ──────────────────────────────────────────────────────

export interface Template {
  id: string;
  userId: string;
  name: string;
  collectionId: string;
  collectionName: string;
  mappingRules: any[];
  cleanupRules: any[];
  createdAt: Date;
}

export const insertTemplateSchema = z.object({
  userId: z.string(),
  name: z.string(),
  collectionId: z.string(),
  collectionName: z.string(),
  mappingRules: z.array(z.any()).default([]),
  cleanupRules: z.array(z.any()).default([]),
});

export type InsertTemplate = z.infer<typeof insertTemplateSchema>;
export type CreateTemplateRequest = InsertTemplate;
export type UpdateTemplateRequest = Partial<InsertTemplate>;

// ── Import Job Types ────────────────────────────────────────────────────

export interface ImportJob {
  id: string;
  userId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  totalUrls: number;
  processed: number;
  successCount: number;
  errorCount: number;
  logs: any[];
  createdAt: Date;
}

export const insertJobSchema = z.object({
  userId: z.string(),
  status: z.enum(['pending', 'processing', 'completed', 'failed']),
  totalUrls: z.number().default(0),
  processed: z.number().default(0),
  successCount: z.number().default(0),
  errorCount: z.number().default(0),
  logs: z.array(z.any()).default([]),
});

export type InsertJob = z.infer<typeof insertJobSchema>;
