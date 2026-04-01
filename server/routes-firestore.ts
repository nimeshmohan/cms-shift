import type { Express, Request } from "express";
import type { Server } from "http";
import { firestoreStorage } from "./storage-simple";
import { JSDOM } from "jsdom";
import { discoverUrls } from "./url-discovery";
import { normalizeDate } from "../shared/date-utils";

// Extend Express Request to include userId
interface AuthRequest extends Request {
  userId?: string;
}

function requireAuth(req: AuthRequest, res: any, next: any) {
  const userId = req.headers['x-user-id'] as string;
  if (!userId) return res.status(401).json({ message: "Unauthorized - No user ID" });
  req.userId = userId;
  next();
}

function optionalAuth(req: AuthRequest, res: any, next: any) {
  const userId = req.headers['x-user-id'] as string;
  req.userId = userId || undefined;
  next();
}

export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {

  // ── Health Check ────────────────────────────────────────────────────────────
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString(), service: "crawlix", version: "2.0.0", storage: "firestore" });
  });

  // ── Templates ───────────────────────────────────────────────────────────────
  app.get("/api/templates", requireAuth, async (req: AuthRequest, res) => {
    try { res.json(await firestoreStorage.getTemplates(req.userId!)); }
    catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.get("/api/templates/:id", requireAuth, async (req: AuthRequest, res) => {
    try {
      const t = await firestoreStorage.getTemplate(req.params.id, req.userId!);
      if (!t) return res.status(404).json({ message: "Not found" });
      res.json(t);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.post("/api/templates", requireAuth, async (req: AuthRequest, res) => {
    try {
      const t = await firestoreStorage.createTemplate({ ...req.body, userId: req.userId! });
      res.status(201).json(t);
    } catch (e: any) { res.status(400).json({ message: e.message }); }
  });

  app.put("/api/templates/:id", requireAuth, async (req: AuthRequest, res) => {
    try { res.json(await firestoreStorage.updateTemplate(req.params.id, req.userId!, req.body)); }
    catch (e: any) { res.status(400).json({ message: e.message }); }
  });

  app.delete("/api/templates/:id", requireAuth, async (req: AuthRequest, res) => {
    try { await firestoreStorage.deleteTemplate(req.params.id, req.userId!); res.status(204).send(); }
    catch (e: any) { res.status(400).json({ message: e.message }); }
  });

  // ── Jobs ────────────────────────────────────────────────────────────────────
  app.get("/api/jobs", requireAuth, async (req: AuthRequest, res) => {
    try { res.json(await firestoreStorage.getJobs(req.userId!)); }
    catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.get("/api/jobs/:id", requireAuth, async (req: AuthRequest, res) => {
    try {
      const job = await firestoreStorage.getJob(req.params.id, req.userId!);
      if (!job) return res.status(404).json({ message: "Not found" });
      res.json(job);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  // PUBLIC: /api/jobs works without login (guests limited to 5 URLs)
  app.post("/api/jobs", optionalAuth, async (req: AuthRequest, res) => {
    try {
      const input = req.body;
      const urlCount = input.urls?.length || 0;

      // Enforce 5-URL limit for guests
      if (!req.userId && urlCount > 5) {
        return res.status(403).json({
          message: "Please login or register to extract more than 5 URLs at once",
          requiresAuth: true,
          limit: 5,
          requested: urlCount,
        });
      }

      // Anonymous users — temp job, no DB persistence
      if (!req.userId) {
        const tempJobId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const tempJob = {
          id: tempJobId,
          userId: "anonymous",
          status: "pending" as const,
          totalUrls: urlCount,
          processed: 0,
          successCount: 0,
          errorCount: 0,
          logs: [],
        };
        res.status(201).json(tempJob);
        processJobAnon(tempJobId, input).catch(console.error);
        return;
      }

      // Authenticated users — persist to DB
      const jobData = {
        userId: req.userId!,
        status: "pending" as const,
        totalUrls: urlCount,
        processed: 0,
        successCount: 0,
        errorCount: 0,
        logs: [],
      };
      const job = await firestoreStorage.createJob(jobData);
      res.status(201).json(job);
      processJob(job.id, req.userId!, input).catch(console.error);
    } catch (e: any) { res.status(400).json({ message: e.message }); }
  });

  // ── Webflow: collections ────────────────────────────────────────────────────
  app.post("/api/webflow/collections", optionalAuth, async (req: AuthRequest, res) => {
    try {
      const { token } = req.body;
      const r = await fetch("https://api.webflow.com/v2/sites", { headers: { Authorization: `Bearer ${token}` } });
      if (!r.ok) throw new Error("Failed to fetch Webflow sites — check your API token");
      const d = await r.json();
      let cols: any[] = [];
      for (const site of d.sites || []) {
        const cr = await fetch(`https://api.webflow.com/v2/sites/${site.id}/collections`, { headers: { Authorization: `Bearer ${token}` } });
        if (cr.ok) cols.push(...((await cr.json()).collections || []));
      }
      res.json(cols.map((c: any) => ({ id: c.id, name: c.displayName || c.name })));
    } catch (e: any) { res.status(400).json({ message: e.message }); }
  });

  // ── Webflow: fields ─────────────────────────────────────────────────────────
  app.post("/api/webflow/collections/:id/fields", optionalAuth, async (req: AuthRequest, res) => {
    try {
      const { token } = req.body;
      const r = await fetch(`https://api.webflow.com/v2/collections/${req.params.id}`, { headers: { Authorization: `Bearer ${token}` } });
      if (!r.ok) throw new Error("Failed to fetch collection fields");
      const d = await r.json();
      res.json((d.fields || []).map((f: any) => ({
        id: f.id,
        name: f.displayName || f.name,
        slug: f.slug,
        type: f.type,
        validations: f.validations || {},
      })));
    } catch (e: any) { res.status(400).json({ message: e.message }); }
  });

  // ── Webflow: fetch all items from a referenced collection ──────────────────
  // Used by the UI to show a dropdown of existing items for Reference fields
  app.post("/api/webflow/collections/:id/items", optionalAuth, async (req: AuthRequest, res) => {
    try {
      const { token } = req.body;
      const colId = req.params.id;
      const items = await fetchAllItems(token, colId);
      // Return id + name so the UI can display them
      res.json(items.map((i: any) => ({
        id: i.id,
        name: i.fieldData?.name || i.fieldData?.title || i.fieldData?.slug || i.id,
        slug: i.fieldData?.slug || "",
      })));
    } catch (e: any) { res.status(400).json({ message: e.message }); }
  });

  // ── Scraper preview (public) ─────────────────────────────────────────────────
  app.post("/api/scraper/preview", optionalAuth, async (req: AuthRequest, res) => {
    try {
      const { url } = req.body;
      const response = await fetch(url);
      const html = await response.text();
      res.json({ html });
    } catch (e: any) { res.status(400).json({ message: e.message }); }
  });

  // ── URL Discovery (public) ──────────────────────────────────────────────────
  app.post("/api/scraper/discover", optionalAuth, async (req: AuthRequest, res) => {
    try {
      const { domain } = req.body;
      if (!domain) return res.status(400).json({ message: "Domain is required" });
      const urls = await discoverUrls(domain);
      res.json({ urls });
    } catch (e: any) { res.status(400).json({ message: e.message }); }
  });

  return httpServer;
}

// ── Utils ─────────────────────────────────────────────────────────────────────

function slugify(t: string) {
  return t.toString().toLowerCase().trim()
    .replace(/\s+/g, "-").replace(/[^\w-]+/g, "").replace(/--+/g, "-");
}

async function fetchAllItems(token: string, colId: string): Promise<any[]> {
  const all: any[] = [];
  let offset = 0;
  while (true) {
    const r = await fetch(`https://api.webflow.com/v2/collections/${colId}/items?limit=100&offset=${offset}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!r.ok) break;
    const items: any[] = (await r.json()).items || [];
    all.push(...items);
    if (items.length < 100) break;
    offset += 100;
  }
  return all;
}

async function resolveRefItems(
  token: string,
  names: string[],
  cfg: { refCollectionId: string; refNameField?: string; refSlugField?: string }
): Promise<string[]> {
  const { refCollectionId, refNameField = "name", refSlugField = "slug" } = cfg;
  const ids: string[] = [];
  const existing = await fetchAllItems(token, refCollectionId);

  for (const name of names) {
    const slug = slugify(name);
    const found = existing.find((i: any) =>
      i.fieldData?.[refSlugField]?.toLowerCase() === slug ||
      i.fieldData?.[refNameField]?.toLowerCase() === name.toLowerCase()
    );
    if (found) {
      ids.push(found.id);
    } else {
      const cr = await fetch(`https://api.webflow.com/v2/collections/${refCollectionId}/items`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ isArchived: false, isDraft: false, fieldData: { [refNameField]: name, [refSlugField]: slug } }),
      });
      if (cr.ok) {
        const ni = await cr.json();
        ids.push(ni.id);
        existing.push(ni);
      } else {
        console.error(`[ref] Failed to create "${name}":`, await cr.text());
      }
    }
  }
  return ids;
}

function validateRules(rules: any[]): string[] {
  const errs: string[] = [];
  for (const rule of rules) {
    const isRef = rule.fieldType === "MultiReference" || rule.fieldType === "Reference";
    // Only error if a ref field has a selector AND no collection — static values bypass this
    if (isRef && rule.htmlSelector?.trim() && !rule.staticValue && !rule.multiRefConfig?.refCollectionId?.trim()) {
      errs.push(`"${rule.webflowFieldName}": Referenced collection is required when a CSS selector is set.`);
    }
  }
  return errs;
}

// ── Shared extraction logic ───────────────────────────────────────────────────
// Used by both processJob (auth) and processJobAnon (guest)

async function extractFields(document: any, baseUrl: string, input: any, withWebflow: boolean): Promise<{ fieldData: any; fieldLog: any }> {
  const fieldData: any = {};
  const fieldLog: Record<string, any> = {};

  for (const rule of input.mappingRules) {

    // ── Static value — for ref fields, resolve name→ID; for others assign directly ─
    if (rule.staticValue !== undefined && rule.staticValue !== null && rule.staticValue !== "") {
      const isRef = rule.fieldType === "MultiReference" || rule.fieldType === "Reference";

      if (isRef && withWebflow) {
        const cfg = rule.multiRefConfig;
        if (!cfg?.refCollectionId?.trim()) {
          // No collection configured — can't resolve. Skip with warning.
          fieldLog[rule.fieldSlug] = { skipped: true, reason: "static value on ref field but no refCollectionId set" };
          continue;
        }

        // The static value may be:
        //   a) A Webflow item ID directly (long hex string ~24 chars)
        //   b) An item name/slug to look up
        //   c) A comma-separated list of names or IDs (for MultiReference)
        const rawValues = rule.staticValue.split(",").map((v: string) => v.trim()).filter(Boolean);
        const resolvedIds: string[] = [];

        for (const val of rawValues) {
          // If it looks like a Webflow item ID (alphanumeric, 20-30 chars), use directly
          if (/^[a-f0-9]{20,}$/i.test(val)) {
            resolvedIds.push(val);
          } else {
            // Resolve name → ID
            const ids = await resolveRefItems(input.token, [val], {
              refCollectionId: cfg.refCollectionId,
              refNameField: cfg.refNameField || "name",
              refSlugField: cfg.refSlugField || "slug",
            });
            resolvedIds.push(...ids);
          }
        }

        if (resolvedIds.length > 0) {
          fieldData[rule.fieldSlug] = rule.fieldType === "MultiReference" ? resolvedIds : resolvedIds[0];
          fieldLog[rule.fieldSlug] = { staticValue: rule.staticValue, resolvedIds };
        } else {
          fieldLog[rule.fieldSlug] = { skipped: true, reason: `static value "${rule.staticValue}" could not be resolved to a Webflow item` };
        }
      } else {
        // Non-ref field or anon mode — assign directly
        fieldData[rule.fieldSlug] = rule.staticValue;
        fieldLog[rule.fieldSlug] = { staticValue: rule.staticValue };
      }
      continue;
    }

    if (!rule.htmlSelector?.trim()) continue;

    // ── Meta tag detection ──────────────────────────────────────────────
    // meta[name="description"], meta[property="og:title"], etc.
    const isMetaSelector = /^meta\s*\[/.test(rule.htmlSelector.trim());

    // Build flat exclude list — supports comma-separated entries per item
    // and full CSS including :nth-child, descendant combinators, etc.
    const excludeSelectors: string[] = (rule.excludeSelectors || [])
      .flatMap((s: string) => s.split(",").map((p: string) => p.trim()))
      .filter(Boolean);

    // Always query from the real document so complex selectors like
    // body > section:nth-child(7) > div work correctly.
    // For meta tags, they live in <head> not <body>.
    const elements = document.querySelectorAll(rule.htmlSelector);

    if (elements.length === 0) {
      fieldLog[rule.fieldSlug] = { skipped: true, reason: "selector matched nothing" };
      continue;
    }

    // ── MultiReference ──────────────────────────────────────────────────
    if (rule.fieldType === "MultiReference") {
      const cfg = rule.multiRefConfig;
      const hasNestedMapping = cfg?.nestedFields && Array.isArray(cfg.nestedFields) && cfg.nestedFields.length > 0;
      const hasParentSelector = !!cfg?.parentSelector?.trim();

      // Parent containers: explicit parentSelector, or fall back to matched elements
      const parents: any[] = hasParentSelector
        ? Array.from(document.querySelectorAll(cfg.parentSelector))
        : Array.from(elements);

      if (hasNestedMapping) {
        // ── Nested field mapping: query child selectors within each parent ──
        const structuredItems: any[] = [];

        parents.forEach((parent: any) => {
          const item: any = {};
          for (const nestedField of cfg.nestedFields) {
            try {
              const childEls = parent.querySelectorAll(nestedField.selector);
              if (childEls.length === 0) { item[nestedField.key] = null; continue; }
              const childEl = childEls[0];

              if (nestedField.type === "attribute") {
                item[nestedField.key] = childEl.getAttribute(nestedField.attribute || "value") ?? null;
              } else if (nestedField.type === "link") {
                const href = childEl.getAttribute("href");
                item[nestedField.key] = href
                  ? (href.startsWith("http") ? href : new URL(href, baseUrl).href)
                  : childEl.textContent?.trim() ?? null;
              } else if (nestedField.type === "image") {
                const src = childEl.tagName === "IMG" ? childEl.src : childEl.getAttribute("src");
                item[nestedField.key] = src
                  ? (src.startsWith("http") ? src : new URL(src, baseUrl).href)
                  : null;
              } else {
                // text (default)
                item[nestedField.key] = childEl.textContent?.trim() ?? null;
              }
            } catch (err) {
              console.warn(`[multi-ref] nested "${nestedField.key}" error:`, err);
              item[nestedField.key] = null;
            }
          }
          if (Object.keys(item).length > 0) structuredItems.push(item);
        });

        if (withWebflow && cfg?.refCollectionId && structuredItems.length > 0) {
          const names = structuredItems
            .map((it: any) => it.name || it[cfg.nestedFields[0]?.key] || Object.values(it)[0])
            .filter(Boolean) as string[];
          if (names.length) {
            const ids = await resolveRefItems(input.token, names, {
              refCollectionId: cfg.refCollectionId,
              refNameField: cfg.refNameField || "name",
              refSlugField: cfg.refSlugField || "slug",
            });
            fieldData[rule.fieldSlug] = ids;
            fieldLog[rule.fieldSlug] = { extractedItems: structuredItems, resolvedIds: ids };
          } else {
            fieldLog[rule.fieldSlug] = { skipped: true, reason: "no names from nested fields" };
          }
        } else {
          fieldData[rule.fieldSlug] = structuredItems;
          fieldLog[rule.fieldSlug] = { extractedItems: structuredItems, note: withWebflow ? "no ref collection" : "anon extract" };
        }
      } else {
        // ── Simple: extract textContent of each parent ──────────────────
        const names = parents.map((el: any) => el.textContent?.trim()).filter(Boolean) as string[];

        if (withWebflow && cfg?.refCollectionId && names.length) {
          const ids = await resolveRefItems(input.token, names, {
            refCollectionId: cfg.refCollectionId,
            refNameField: cfg.refNameField || "name",
            refSlugField: cfg.refSlugField || "slug",
          });
          fieldData[rule.fieldSlug] = ids;
          fieldLog[rule.fieldSlug] = { extractedNames: names, resolvedIds: ids };
        } else if (names.length) {
          fieldData[rule.fieldSlug] = names;
          fieldLog[rule.fieldSlug] = { extractedNames: names };
        }
      }

    // ── Single Reference ────────────────────────────────────────────────
    } else if (rule.fieldType === "Reference") {
      const name = (elements[0] as any).textContent?.trim();
      const cfg = rule.multiRefConfig;
      if (withWebflow && cfg?.refCollectionId && name) {
        const ids = await resolveRefItems(input.token, [name], {
          refCollectionId: cfg.refCollectionId,
          refNameField: cfg.refNameField || "name",
          refSlugField: cfg.refSlugField || "slug",
        });
        if (ids.length) {
          fieldData[rule.fieldSlug] = ids[0];
          fieldLog[rule.fieldSlug] = { extractedName: name, resolvedId: ids[0] };
        }
      } else if (name) {
        fieldData[rule.fieldSlug] = name;
        fieldLog[rule.fieldSlug] = { extractedName: name, note: "anon extract / no collection" };
      }

    // ── Image ───────────────────────────────────────────────────────────
    } else if (rule.fieldType === "Image") {
      const el = elements[0] as any;
      const src = el.tagName === "IMG" ? el.src : el.getAttribute("src");
      if (src) {
        const v = src.startsWith("http") ? src : new URL(src, baseUrl).href;
        fieldData[rule.fieldSlug] = v;
        fieldLog[rule.fieldSlug] = { value: v };
      }

    // ── File ─────────────────────────────────────────────────────────────
    // Webflow File fields accept a URL. Try href → src → data-src → textContent.
    } else if (rule.fieldType === "File") {
      const el = elements[0] as any;
      const raw =
        el.getAttribute("href") ||
        el.getAttribute("src") ||
        el.getAttribute("data-src") ||
        el.getAttribute("data-url") ||
        el.getAttribute("data-file");

      if (raw) {
        const v = raw.startsWith("http") ? raw : new URL(raw, baseUrl).href;
        fieldData[rule.fieldSlug] = v;
        fieldLog[rule.fieldSlug] = { value: v };
      } else {
        // Fall back to textContent if it looks like a URL
        const t = el.textContent?.trim();
        if (t && (t.startsWith("http://") || t.startsWith("https://") || t.startsWith("/"))) {
          const v = t.startsWith("http") ? t : new URL(t, baseUrl).href;
          fieldData[rule.fieldSlug] = v;
          fieldLog[rule.fieldSlug] = { value: v, note: "from textContent" };
        } else {
          fieldLog[rule.fieldSlug] = { skipped: true, reason: "no file URL found on element" };
        }
      }

    // ── Meta tag ────────────────────────────────────────────────────────
    } else if (isMetaSelector) {
      const el = elements[0] as any;
      const content = el.getAttribute("content");
      if (content !== null) {
        fieldData[rule.fieldSlug] = content;
        fieldLog[rule.fieldSlug] = { metaContent: content };
      } else {
        fieldLog[rule.fieldSlug] = { skipped: true, reason: "meta content attribute missing" };
      }

    // ── RichText — innerHTML with correct exclude handling ────────────────
    // Strategy for complex selectors (body > section:nth-child(7) > ...):
    // 1. Query each exclude selector from the REAL document (full context works)
    // 2. For each matched exclude node, find which rich-text container owns it
    // 3. Clone the container, then query within the clone using a RELATIVE
    //    selector derived by stripping all ancestor parts above the container.
    //    Simple selectors (.class, #id, tag) also work directly on the clone.
    } else if (rule.fieldType === "RichText") {
      const richEls = Array.from(elements) as any[];

      // Pre-compute: for each exclude selector, collect the nodes to remove
      // as {containerIndex, outerHTML} pairs so we can match them in the clone.
      // We use outerHTML matching as a reliable identity key inside the clone.
      type RemoveEntry = { containerIdx: number; outerHTML: string };
      const toRemove: RemoveEntry[] = [];

      for (const sel of excludeSelectors) {
        try {
          const matched = Array.from(document.querySelectorAll(sel)) as any[];
          for (const node of matched) {
            // Find which richEl contains this node
            const cIdx = richEls.findIndex((re: any) => re.contains ? re.contains(node) : false);
            if (cIdx !== -1) {
              toRemove.push({ containerIdx: cIdx, outerHTML: (node as any).outerHTML });
            }
          }
        } catch (err) {
          console.warn(`[richtext] invalid exclude selector: "${sel}"`, err);
        }
      }

      const combinedParts: string[] = [];

      for (let ci = 0; ci < richEls.length; ci++) {
        const el = richEls[ci];
        const clone = el.cloneNode(true) as any;

        // Remove nodes identified from the real document by matching outerHTML
        for (const entry of toRemove) {
          if (entry.containerIdx !== ci) continue;
          try {
            // Walk all descendants and remove those whose outerHTML matches
            const all = Array.from(clone.querySelectorAll("*")) as any[];
            for (const node of all) {
              if (node.outerHTML === entry.outerHTML) {
                node.parentNode?.removeChild(node);
                break; // remove first match only
              }
            }
          } catch (_) {}
        }

        // Also run simple (non-ancestor-dependent) selectors directly on clone
        // so class-based excludes like .author-bio still work
        for (const sel of excludeSelectors) {
          // If selector has no ancestor combinators (no ">", " ", "+", "~")
          // that would depend on document context, run it directly on clone too
          const isSimple = !/[>+~\s]/.test(sel.trim());
          if (isSimple) {
            try {
              clone.querySelectorAll(sel).forEach((c: any) => c.parentNode?.removeChild(c));
            } catch (_) {}
          }
        }

        // Legacy class-based cleanup
        const legacyClasses = [
          "entry-post-share-wrap",
          "author-name",
          "author-biographical-info",
          ...(input.cleanupRules || []),
        ];
        for (const cls of legacyClasses) {
          try {
            const s = cls.includes(".") || cls.includes("#") || cls.includes("[") ? cls : `.${cls}`;
            clone.querySelectorAll(s).forEach((c: any) => c.parentNode?.removeChild(c));
          } catch (_) {}
        }

        // Make image srcs absolute
        clone.querySelectorAll("img").forEach((img: any) => {
          const s = img.getAttribute("src");
          if (s && !s.startsWith("http")) {
            try { img.setAttribute("src", new URL(s, baseUrl).href); } catch (_) {}
          }
        });

        combinedParts.push(clone.innerHTML);
      }

      const combined = combinedParts.join("");
      fieldData[rule.fieldSlug] = combined;
      fieldLog[rule.fieldSlug] = { htmlLength: combined.length, elementCount: richEls.length, excludedSelectors: excludeSelectors };

    // ── Link ─────────────────────────────────────────────────────────────
    } else if (rule.fieldType === "Link") {
      const el = elements[0] as any;
      const href = el.getAttribute("href");
      if (href) {
        const v = href.startsWith("http") ? href : new URL(href, baseUrl).href;
        fieldData[rule.fieldSlug] = v;
        fieldLog[rule.fieldSlug] = { value: v };
      } else {
        fieldData[rule.fieldSlug] = el.textContent?.trim();
        fieldLog[rule.fieldSlug] = { note: "no href, used text" };
      }

    // ── Date / DateTime ──────────────────────────────────────────────────
    } else if (rule.fieldType === "Date" || rule.fieldType === "DateTime") {
      const rawValue = (elements[0] as any).textContent?.trim();
      if (rawValue) {
        const normalized = normalizeDate(rawValue);
        if (normalized) {
          fieldData[rule.fieldSlug] = normalized;
          fieldLog[rule.fieldSlug] = { rawValue, normalized };
        } else {
          fieldLog[rule.fieldSlug] = { rawValue, error: "failed to parse date" };
          console.warn(`[date] Failed to normalize "${rawValue}" for ${rule.fieldSlug}`);
        }
      } else {
        fieldLog[rule.fieldSlug] = { skipped: true, reason: "no date value found" };
      }

    // ── PlainText / everything else ──────────────────────────────────────
    } else {
      const v = (elements[0] as any).textContent?.trim();
      fieldData[rule.fieldSlug] = v;
      fieldLog[rule.fieldSlug] = { value: v };
    }
  }

  return { fieldData, fieldLog };
}

// ── Job processor (authenticated — pushes to Webflow) ─────────────────────────

async function processJob(jobId: string, userId: string, input: any) {
  try {
    const errs = validateRules(input.mappingRules || []);
    if (errs.length) {
      await firestoreStorage.updateJob(jobId, userId, {
        status: "failed",
        logs: [{ url: "validation", status: "error", message: errs.join(" | ") }],
      });
      return;
    }

    await firestoreStorage.updateJob(jobId, userId, { status: "processing" });
    let successCount = 0, errorCount = 0, processed = 0, logs: any[] = [];

    for (const url of input.urls) {
      try {
        const response = await fetch(url);
        const html = await response.text();
        const { window: { document } } = new JSDOM(html);
        const baseUrl = new URL(url).origin;

        const { fieldData, fieldLog } = await extractFields(document, baseUrl, input, true);

        if (!fieldData.name && fieldData.Name) fieldData.name = fieldData.Name;
        if (!fieldData.name) fieldData.name = "Imported Item " + new Date().toISOString();
        if (!fieldData.slug) fieldData.slug = slugify(fieldData.name);

        const wfr = await fetch(`https://api.webflow.com/v2/collections/${input.collectionId}/items`, {
          method: "POST",
          headers: { Authorization: `Bearer ${input.token}`, "Content-Type": "application/json" },
          body: JSON.stringify({ isArchived: false, isDraft: false, fieldData }),
        });

        if (!wfr.ok) throw new Error("Webflow API error: " + await wfr.text());

        const wfItem = await wfr.json();
        successCount++;
        logs.push({ url, status: "success", webflowItemId: wfItem.id, webflowSlug: fieldData.slug, fields: fieldLog });
      } catch (err: any) {
        errorCount++;
        logs.push({ url, status: "error", message: err.message });
      }

      processed++;
      await firestoreStorage.updateJob(jobId, userId, { processed, successCount, errorCount, logs });
    }

    await firestoreStorage.updateJob(jobId, userId, { status: "completed" });
  } catch (err: any) {
    await firestoreStorage.updateJob(jobId, userId, { status: "failed" });
  }
}

// ── Job processor for anonymous users (no DB persistence) ─────────────────────

async function processJobAnon(jobId: string, input: any) {
  // Guest users (≤5 URLs) get full Webflow push — same as authenticated users.
  // The only differences are: no DB persistence and no template saving.
  try {
    const errs = validateRules(input.mappingRules || []);
    if (errs.length) {
      console.error(`[job-anon] Validation failed for ${jobId}:`, errs);
      return;
    }

    let successCount = 0, errorCount = 0, processed = 0;

    for (const url of input.urls) {
      try {
        const response = await fetch(url);
        const html = await response.text();
        const { window: { document } } = new JSDOM(html);
        const baseUrl = new URL(url).origin;

        // withWebflow: true — guest users get full extraction + Webflow push
        const { fieldData, fieldLog } = await extractFields(document, baseUrl, input, true);

        if (!fieldData.name && fieldData.Name) fieldData.name = fieldData.Name;
        if (!fieldData.name) fieldData.name = "Imported Item " + new Date().toISOString();
        if (!fieldData.slug) fieldData.slug = slugify(fieldData.name);

        const wfr = await fetch(`https://api.webflow.com/v2/collections/${input.collectionId}/items`, {
          method: "POST",
          headers: { Authorization: `Bearer ${input.token}`, "Content-Type": "application/json" },
          body: JSON.stringify({ isArchived: false, isDraft: false, fieldData }),
        });

        if (!wfr.ok) throw new Error("Webflow API error: " + await wfr.text());

        successCount++;
        console.log(`[job-anon] ${jobId} pushed to Webflow: ${url}`);
      } catch (err: any) {
        errorCount++;
        console.error(`[job-anon] ${jobId} error on ${url}:`, err.message);
      }
      processed++;
    }

    console.log(`[job-anon] ${jobId} completed: ${successCount}/${processed} pushed to Webflow`);
  } catch (err: any) {
    console.error(`[job-anon] ${jobId} failed:`, err.message);
  }
}
