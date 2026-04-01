import { z } from "zod";
import { insertTemplateSchema, templates, importJobs } from "./schema";

export const errorSchemas = {
  validation: z.object({ message: z.string(), field: z.string().optional() }),
  notFound: z.object({ message: z.string() }),
  internal: z.object({ message: z.string() }),
};

export const NestedFieldSchema = z.object({
  key: z.string(),
  selector: z.string(),
  type: z.enum(["text", "link", "image", "attribute"]).default("text"),
  attribute: z.string().optional(),
});

export const RefConfigSchema = z.object({
  refCollectionId: z.string(),
  refCollectionName: z.string().optional(),
  refNameField: z.string().default("name"),
  refSlugField: z.string().default("slug"),
  // Nested field mapping for MultiReference
  parentSelector: z.string().optional(),
  nestedFields: z.array(NestedFieldSchema).optional(),
  // Pre-selected item IDs for static multi-ref (from the item picker UI)
  staticItemIds: z.array(z.string()).optional(),
});

export const MultiRefConfigSchema = RefConfigSchema; // backward compat alias

export const MappingRuleSchema: z.ZodType<any> = z.object({
  webflowFieldId: z.string(),
  webflowFieldName: z.string(),
  fieldSlug: z.string(),
  fieldType: z.string(),
  htmlSelector: z.string().default(""),
  // For Reference / MultiReference
  multiRefConfig: RefConfigSchema.optional(),
  // For RichText — CSS selectors whose matching elements get removed before import
  excludeSelectors: z.array(z.string()).optional(),
  // Static value — assigned directly without any selector
  staticValue: z.string().optional(),
});

export type RefConfig = z.infer<typeof RefConfigSchema>;
export type MultiRefConfig = RefConfig;
export type MappingRule = z.infer<typeof MappingRuleSchema>;

export const api = {
  templates: {
    list: { method: "GET" as const, path: "/api/templates" as const, responses: { 200: z.array(z.custom<typeof templates.$inferSelect>()) } },
    get: { method: "GET" as const, path: "/api/templates/:id" as const, responses: { 200: z.custom<typeof templates.$inferSelect>(), 404: errorSchemas.notFound } },
    create: { method: "POST" as const, path: "/api/templates" as const, input: insertTemplateSchema, responses: { 201: z.custom<typeof templates.$inferSelect>(), 400: errorSchemas.validation } },
    update: { method: "PUT" as const, path: "/api/templates/:id" as const, input: insertTemplateSchema.partial(), responses: { 200: z.custom<typeof templates.$inferSelect>(), 400: errorSchemas.validation, 404: errorSchemas.notFound } },
    delete: { method: "DELETE" as const, path: "/api/templates/:id" as const, responses: { 204: z.void(), 404: errorSchemas.notFound } },
  },
  webflow: {
    getCollections: {
      method: "POST" as const,
      path: "/api/webflow/collections" as const,
      input: z.object({ token: z.string() }),
      responses: { 200: z.array(z.object({ id: z.string(), name: z.string() })) },
    },
    getFields: {
      method: "POST" as const,
      path: "/api/webflow/collections/:id/fields" as const,
      input: z.object({ token: z.string() }),
      responses: {
        200: z.array(z.object({
          id: z.string(),
          name: z.string(),
          slug: z.string(),
          type: z.string(),
          validations: z.object({ collectionId: z.string().optional() }).optional(),
        })),
      },
    },
  },
  scraper: {
    preview: {
      method: "POST" as const,
      path: "/api/scraper/preview" as const,
      input: z.object({ url: z.string() }),
      responses: { 200: z.object({ html: z.string() }) },
    },
  },
  jobs: {
    create: {
      method: "POST" as const,
      path: "/api/jobs" as const,
      input: z.object({
        token: z.string(),
        collectionId: z.string(),
        urls: z.array(z.string()),
        mappingRules: z.array(MappingRuleSchema),
        cleanupRules: z.array(z.string()).optional(),
      }),
      responses: { 201: z.custom<typeof importJobs.$inferSelect>(), 400: errorSchemas.validation },
    },
    get: { method: "GET" as const, path: "/api/jobs/:id" as const, responses: { 200: z.custom<typeof importJobs.$inferSelect>(), 404: errorSchemas.notFound } },
    list: { method: "GET" as const, path: "/api/jobs" as const, responses: { 200: z.array(z.custom<typeof importJobs.$inferSelect>()) } },
  },
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) url = url.replace(`:${key}`, String(value));
    });
  }
  return url;
}

export type JobLog = { url: string; status: "success" | "error"; message?: string; webflowItemId?: string };
