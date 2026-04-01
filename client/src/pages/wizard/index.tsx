import { useState, useCallback, useEffect } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight, ArrowLeft, Key, Layers, Globe, MousePointer2, Play,
  CheckCircle2, Sparkles, GitBranch, AlertTriangle, Plus, X,
  Loader2, ChevronDown, ChevronUp, Eye, EyeOff, FileText,
  Link2, Hash, ToggleLeft, List, Database, Image as ImageIcon,
  Settings2, Info, LogIn, Paperclip, User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useWebflowCollections, useWebflowFields, useWebflowCollectionItems } from "@/hooks/use-webflow";
import { useCreateJob } from "@/hooks/use-jobs";
import { useTemplates, useCreateTemplate } from "@/hooks/use-templates";
import { usePreviewScrape, useDiscoverUrls } from "@/hooks/use-scraper";
import { useAuth } from "@/contexts/AuthContext";

// ─── Types ────────────────────────────────────────────────────────────────────

type RefConfig = {
  refCollectionId: string;
  refCollectionName: string;
  refNameField: string;
  refSlugField: string;
  parentSelector?: string;
  nestedFields?: NestedField[];
  staticItemIds?: string[];   // pre-selected Webflow item IDs from the picker
};

type NestedField = {
  key: string;
  selector: string;
  type: "text" | "link" | "image" | "attribute";
  attribute?: string;
};

type MappingRule = {
  webflowFieldId: string;
  webflowFieldName: string;
  fieldSlug: string;
  fieldType: string;
  htmlSelector: string;
  multiRefConfig?: RefConfig;
  excludeSelectors?: string[];
  staticValue?: string;
};

// ─── Field type visual helpers ────────────────────────────────────────────────

const FIELD_META: Record<string, { icon: any; color: string; bg: string; border: string; label: string }> = {
  PlainText:      { icon: Hash,       color: "text-blue-600",   bg: "bg-blue-50",    border: "border-blue-200",   label: "Plain Text" },
  RichText:       { icon: FileText,   color: "text-green-600",  bg: "bg-green-50",   border: "border-green-200",  label: "Rich Text" },
  Image:          { icon: ImageIcon,  color: "text-orange-600", bg: "bg-orange-50",  border: "border-orange-200", label: "Image" },
  Link:           { icon: Link2,      color: "text-cyan-600",   bg: "bg-cyan-50",    border: "border-cyan-200",   label: "Link" },
  MultiReference: { icon: List,       color: "text-purple-600", bg: "bg-purple-50",  border: "border-purple-200", label: "Multi-Ref" },
  Reference:      { icon: Database,   color: "text-violet-600", bg: "bg-violet-50",  border: "border-violet-200", label: "Reference" },
  Bool:           { icon: ToggleLeft, color: "text-pink-600",   bg: "bg-pink-50",    border: "border-pink-200",   label: "Boolean" },
  File:           { icon: Paperclip,  color: "text-gray-600",   bg: "bg-gray-50",    border: "border-gray-200",   label: "File" },
};

function FieldBadge({ type }: { type: string }) {
  const m = FIELD_META[type] || { icon: Hash, color: "text-gray-600", bg: "bg-gray-50", border: "border-gray-200", label: type };
  const Icon = m.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold border ${m.color} ${m.bg} ${m.border}`}>
      <Icon className="w-3 h-3" /> {m.label}
    </span>
  );
}

// ─── MultiRef Config Panel (with nested fields UI + item picker) ──────────────

function RefConfigPanel({ rule, idx, allCollections, token, onUpdate }: {
  rule: MappingRule; idx: number;
  allCollections: { id: string; name: string }[];
  token: string;
  onUpdate: (i: number, r: MappingRule) => void;
}) {
  const cfg = rule.multiRefConfig;
  const isConfigured = !!cfg?.refCollectionId?.trim();
  const selectorSet = !!rule.htmlSelector?.trim() || !!rule.staticValue?.trim();
  const isStaticMode = !!rule.staticValue?.trim() || (!rule.htmlSelector?.trim() && rule.staticValue !== undefined);
  const [showNested, setShowNested] = useState((cfg?.nestedFields?.length ?? 0) > 0);

  // Items fetched from the referenced collection
  const [refItems, setRefItems] = useState<Array<{ id: string; name: string; slug: string }>>([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [itemsError, setItemsError] = useState<string | null>(null);
  const [itemSearch, setItemSearch] = useState("");
  const fetchItems = useWebflowCollectionItems();

  // Selected item IDs for static multi-ref
  const selectedIds: string[] = cfg?.staticItemIds ?? [];

  const patch = (p: Partial<RefConfig & { staticItemIds?: string[] }>) =>
    onUpdate(idx, {
      ...rule,
      multiRefConfig: {
        refCollectionId: cfg?.refCollectionId ?? "",
        refCollectionName: cfg?.refCollectionName ?? "",
        refNameField: cfg?.refNameField ?? "name",
        refSlugField: cfg?.refSlugField ?? "slug",
        parentSelector: cfg?.parentSelector ?? "",
        nestedFields: cfg?.nestedFields ?? [],
        staticItemIds: cfg?.staticItemIds ?? [],
        ...p,
      },
    });

  const pickCollection = async (id: string) => {
    const found = allCollections.find((c) => c.id === id);
    patch({ refCollectionId: id, refCollectionName: found?.name ?? id, staticItemIds: [] });
    // Auto-fetch items from this collection
    if (token && id) {
      setLoadingItems(true);
      setItemsError(null);
      setRefItems([]);
      try {
        const items = await fetchItems.mutateAsync({ token, collectionId: id });
        setRefItems(items);
      } catch (e: any) {
        setItemsError(e.message);
      } finally {
        setLoadingItems(false);
      }
    }
  };

  // Toggle a specific item in/out of the static selection
  const toggleItem = (itemId: string) => {
    const isMulti = rule.fieldType === "MultiReference";
    if (isMulti) {
      const next = selectedIds.includes(itemId)
        ? selectedIds.filter((id) => id !== itemId)
        : [...selectedIds, itemId];
      patch({ staticItemIds: next });
      // Update staticValue with comma-separated IDs
      onUpdate(idx, {
        ...rule,
        staticValue: next.join(","),
        multiRefConfig: {
          ...(rule.multiRefConfig as any),
          refCollectionId: cfg?.refCollectionId ?? "",
          refCollectionName: cfg?.refCollectionName ?? "",
          refNameField: cfg?.refNameField ?? "name",
          refSlugField: cfg?.refSlugField ?? "slug",
          parentSelector: cfg?.parentSelector ?? "",
          nestedFields: cfg?.nestedFields ?? [],
          staticItemIds: next,
        },
      });
    } else {
      // Single reference — only one allowed
      const next = selectedIds.includes(itemId) ? [] : [itemId];
      onUpdate(idx, {
        ...rule,
        staticValue: next[0] ?? "",
        multiRefConfig: {
          ...(rule.multiRefConfig as any),
          refCollectionId: cfg?.refCollectionId ?? "",
          refCollectionName: cfg?.refCollectionName ?? "",
          refNameField: cfg?.refNameField ?? "name",
          refSlugField: cfg?.refSlugField ?? "slug",
          parentSelector: cfg?.parentSelector ?? "",
          nestedFields: cfg?.nestedFields ?? [],
          staticItemIds: next,
        },
      });
    }
  };

  // Nested fields CRUD
  const addNestedField = () => {
    const nf: NestedField = { key: "", selector: "", type: "text" };
    patch({ nestedFields: [...(cfg?.nestedFields ?? []), nf] });
    setShowNested(true);
  };
  const updateNestedField = (ni: number, val: Partial<NestedField>) => {
    const updated = (cfg?.nestedFields ?? []).map((f, i) => i === ni ? { ...f, ...val } : f);
    patch({ nestedFields: updated });
  };
  const removeNestedField = (ni: number) => {
    patch({ nestedFields: (cfg?.nestedFields ?? []).filter((_, i) => i !== ni) });
  };

  const filteredItems = refItems.filter(
    (it) => !itemSearch || it.name.toLowerCase().includes(itemSearch.toLowerCase()) || it.slug.toLowerCase().includes(itemSearch.toLowerCase())
  );

  return (
    <div className={`mt-3 rounded-lg border-l-4 pl-4 pr-4 py-3 space-y-3 transition-colors
      ${!selectorSet ? "border-l-gray-200 bg-gray-50/50 opacity-60" :
        isConfigured ? "border-l-purple-400 bg-purple-50/50" : "border-l-amber-400 bg-amber-50/50"}`}>

      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
          <GitBranch className="w-3.5 h-3.5" /> Referenced Collection
        </span>
        {!selectorSet ? (
          <span className="text-[10px] text-muted-foreground italic">Set a selector or static value above first</span>
        ) : isConfigured ? (
          <span className="text-[10px] text-green-600 font-semibold flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Configured</span>
        ) : (
          <span className="text-[10px] text-amber-600 font-semibold flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Required</span>
        )}
      </div>

      {/* Collection dropdown */}
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">Collection <span className="text-red-500">*</span></Label>
        {allCollections.length > 0 ? (
          <Select value={cfg?.refCollectionId ?? ""} onValueChange={pickCollection}>
            <SelectTrigger className={`h-9 bg-white text-sm ${selectorSet && !isConfigured ? "border-amber-400 ring-1 ring-amber-300" : ""}`}>
              <SelectValue placeholder="Select the referenced collection…" />
            </SelectTrigger>
            <SelectContent>
              {allCollections.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  <span className="flex items-center gap-2">
                    <Database className="w-3 h-3 text-muted-foreground shrink-0" />
                    <span>{c.name}</span>
                    <span className="text-[10px] text-muted-foreground font-mono ml-auto">{c.id.slice(-6)}</span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <Input
            placeholder="Collection ID e.g. 65aa8000abc…"
            value={cfg?.refCollectionId ?? ""}
            onChange={(e) => patch({ refCollectionId: e.target.value })}
            className="h-9 font-mono text-xs bg-white"
          />
        )}
      </div>

      {/* ── Item picker — shown when using static value AND collection selected ── */}
      {isStaticMode && isConfigured && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs text-muted-foreground flex items-center gap-1">
              <List className="w-3 h-3" />
              {rule.fieldType === "MultiReference" ? "Pick items (multi-select)" : "Pick item"}
            </Label>
            {loadingItems && <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />}
            {!loadingItems && refItems.length === 0 && isConfigured && token && (
              <button type="button" onClick={() => pickCollection(cfg!.refCollectionId)}
                className="text-[10px] text-purple-600 underline hover:text-purple-800">
                Load items
              </button>
            )}
            {selectedIds.length > 0 && (
              <Badge className="bg-purple-100 text-purple-700 border-purple-200 text-[10px] h-4 px-1.5">{selectedIds.length} selected</Badge>
            )}
          </div>

          {itemsError && (
            <p className="text-[10px] text-red-600 bg-red-50 border border-red-200 rounded px-2 py-1">{itemsError}</p>
          )}

          {refItems.length > 0 && (
            <div className="border rounded-lg bg-white overflow-hidden">
              <div className="border-b px-2 py-1.5">
                <Input
                  value={itemSearch}
                  onChange={(e) => setItemSearch(e.target.value)}
                  placeholder="Search items…"
                  className="h-6 text-xs border-0 shadow-none focus-visible:ring-0 p-0"
                />
              </div>
              <div className="max-h-40 overflow-y-auto divide-y">
                {filteredItems.length === 0 ? (
                  <p className="text-[10px] text-muted-foreground text-center py-3">No items match "{itemSearch}"</p>
                ) : filteredItems.map((item) => {
                  const selected = selectedIds.includes(item.id);
                  return (
                    <button key={item.id} type="button"
                      onClick={() => toggleItem(item.id)}
                      className={`w-full flex items-center gap-2 px-3 py-2 text-left text-xs hover:bg-muted/50 transition-colors ${selected ? "bg-purple-50" : ""}`}>
                      <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors
                        ${selected ? "bg-purple-600 border-purple-600" : "border-border"}`}>
                        {selected && <CheckCircle2 className="w-2.5 h-2.5 text-white" />}
                      </div>
                      <span className="flex-1 font-medium truncate">{item.name}</span>
                      <span className="text-[10px] text-muted-foreground font-mono shrink-0">{item.id.slice(-6)}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {refItems.length === 0 && !loadingItems && !itemsError && isConfigured && (
            <p className="text-[10px] text-muted-foreground bg-purple-50 border border-purple-200 rounded px-2 py-1.5">
              Click <strong>Load items</strong> above to browse and pick items from this collection.
            </p>
          )}

          {selectedIds.length > 0 && (
            <div className="text-[10px] text-muted-foreground">
              Selected IDs: <code className="font-mono text-purple-700 break-all">{selectedIds.join(", ")}</code>
            </div>
          )}
        </div>
      )}

      {/* Name + Slug fields — only needed in selector/scrape mode */}
      {!isStaticMode && (
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Name field</Label>
            <Input value={cfg?.refNameField ?? "name"} onChange={(e) => patch({ refNameField: e.target.value })}
              className="h-8 font-mono text-xs bg-white" placeholder="name" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Slug field</Label>
            <Input value={cfg?.refSlugField ?? "slug"} onChange={(e) => patch({ refSlugField: e.target.value })}
              className="h-8 font-mono text-xs bg-white" placeholder="slug" />
          </div>
        </div>
      )}

      {/* ── Nested fields section — only in selector/scrape mode ──────────── */}
      {!isStaticMode && (
        <div className="border-t border-purple-200/60 pt-2 space-y-2">
          <button type="button"
            onClick={() => (cfg?.nestedFields?.length ?? 0) > 0 ? setShowNested(o => !o) : addNestedField()}
            className="w-full flex items-center justify-between text-xs font-semibold text-purple-700 hover:text-purple-900 transition-colors">
            <span className="flex items-center gap-1.5">
              <Settings2 className="w-3.5 h-3.5" />
              Nested Field Mapping
              {(cfg?.nestedFields?.length ?? 0) > 0 && (
                <Badge className="bg-purple-100 text-purple-700 border-purple-200 text-[10px] h-4 px-1.5">{cfg!.nestedFields!.length} fields</Badge>
              )}
            </span>
            <span className="flex items-center gap-1 text-muted-foreground text-[10px]">
              {(cfg?.nestedFields?.length ?? 0) > 0
                ? (showNested ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)
                : <><Plus className="w-3 h-3" /> Add sub-fields</>}
            </span>
          </button>

          <AnimatePresence initial={false}>
            {showNested && (
              <motion.div key="nested" initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                <div className="space-y-2 pt-1">
                  <p className="text-[10px] text-muted-foreground bg-purple-50 border border-purple-200 rounded p-2">
                    Map child fields inside each parent container. Use <strong>Parent selector</strong> to loop containers, then map each child field inside them.
                  </p>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Parent container selector <span className="text-[10px] text-purple-500">(optional)</span></Label>
                    <Input value={cfg?.parentSelector ?? ""} onChange={(e) => patch({ parentSelector: e.target.value })}
                      placeholder="e.g. .team-list .member" className="h-8 font-mono text-xs bg-white" />
                  </div>
                  {(cfg?.nestedFields ?? []).map((nf, ni) => (
                    <div key={ni} className="rounded-md border bg-white p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-purple-700">Field #{ni + 1}</span>
                        <button type="button" onClick={() => removeNestedField(ni)} className="text-muted-foreground hover:text-red-500 transition-colors">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label className="text-[10px] text-muted-foreground">Field key (slug)</Label>
                          <Input value={nf.key} onChange={(e) => updateNestedField(ni, { key: e.target.value })}
                            placeholder="e.g. name" className="h-7 font-mono text-xs" />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[10px] text-muted-foreground">Field type</Label>
                          <Select value={nf.type} onValueChange={(v: any) => updateNestedField(ni, { type: v })}>
                            <SelectTrigger className="h-7 text-xs bg-white"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="text">Text</SelectItem>
                              <SelectItem value="link">Link (href)</SelectItem>
                              <SelectItem value="image">Image (src)</SelectItem>
                              <SelectItem value="attribute">Attribute</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] text-muted-foreground">CSS Selector (relative to parent)</Label>
                        <Input value={nf.selector} onChange={(e) => updateNestedField(ni, { selector: e.target.value })}
                          placeholder="e.g. .member-name" className="h-7 font-mono text-xs" />
                      </div>
                      {nf.type === "attribute" && (
                        <div className="space-y-1">
                          <Label className="text-[10px] text-muted-foreground">Attribute name</Label>
                          <Input value={nf.attribute ?? ""} onChange={(e) => updateNestedField(ni, { attribute: e.target.value })}
                            placeholder="e.g. data-id" className="h-7 font-mono text-xs" />
                        </div>
                      )}
                    </div>
                  ))}
                  <Button variant="outline" size="sm" className="h-7 text-xs gap-1 border-dashed w-full" onClick={addNestedField}>
                    <Plus className="w-3 h-3" /> Add nested field
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {isConfigured && !isStaticMode && !showNested && (cfg?.nestedFields?.length ?? 0) === 0 && (
        <div className="flex items-start gap-2 text-[11px] text-muted-foreground bg-white rounded-md border p-2.5">
          <Info className="w-3.5 h-3.5 mt-0.5 shrink-0 text-purple-400" />
          <span>Extracts <strong>text</strong> of each matched element, looks it up in <strong>{cfg?.refCollectionName || cfg?.refCollectionId}</strong>, auto-creates if missing.</span>
        </div>
      )}
    </div>
  );
}

// ─── RichText Exclude Selectors Panel ─────────────────────────────────────────

function ExcludePanel({ rule, idx, onUpdate }: {
  rule: MappingRule; idx: number;
  onUpdate: (i: number, r: MappingRule) => void;
}) {
  const [open, setOpen] = useState((rule.excludeSelectors?.length ?? 0) > 0);
  const sels = rule.excludeSelectors ?? [];

  const add = () => { onUpdate(idx, { ...rule, excludeSelectors: [...sels, ""] }); setOpen(true); };
  const update = (si: number, val: string) => { const n = [...sels]; n[si] = val; onUpdate(idx, { ...rule, excludeSelectors: n }); };
  const remove = (si: number) => { onUpdate(idx, { ...rule, excludeSelectors: sels.filter((_, i) => i !== si) }); };

  return (
    <div className="mt-3 rounded-lg border border-dashed border-red-200 bg-red-50/40 p-3 space-y-2">
      <button type="button" onClick={() => sels.length ? setOpen((o) => !o) : add()}
        className="w-full flex items-center justify-between text-xs font-semibold text-red-600 hover:text-red-700 transition-colors">
        <span className="flex items-center gap-1.5">
          <X className="w-3.5 h-3.5" />
          Exclude Content Selectors
          {sels.length > 0 && <Badge className="bg-red-100 text-red-600 border-red-200 text-[10px] h-4 px-1.5">{sels.length}</Badge>}
        </span>
        <span className="flex items-center gap-1 text-muted-foreground">
          {sels.length > 0 ? (open ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />) : <Plus className="w-3 h-3" />}
        </span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div key="body" initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="space-y-2 pt-1">
              <p className="text-[10px] text-muted-foreground">
                Full CSS selectors — including complex/nth-child ones — for elements to <strong>remove before extracting</strong>.
                Each entry can contain comma-separated selectors.
                E.g. <code className="bg-white px-1 rounded border">body &gt; section:nth-child(7) &gt; div &gt; div &gt; section.guides &gt; div &gt; div.col-md-9.blog-body &gt; p:nth-child(2)</code>
              </p>
              {sels.map((sel, si) => (
                <div key={si} className="flex items-center gap-2">
                  <Input value={sel} onChange={(e) => update(si, e.target.value)}
                    placeholder="e.g. .author-bio, body > section:nth-child(7) > div > div > p"
                    className="h-8 font-mono text-xs bg-white flex-1" />
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-red-500 shrink-0" onClick={() => remove(si)}>
                    <X className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ))}
              <Button variant="outline" size="sm" className="h-7 text-xs gap-1 border-dashed" onClick={add}>
                <Plus className="w-3 h-3" /> Add Selector
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!open && sels.length === 0 && (
        <p className="text-[10px] text-muted-foreground">Click to add CSS selectors to strip before import (supports full CSS including :nth-child)</p>
      )}
    </div>
  );
}

// ─── Single Field Row ─────────────────────────────────────────────────────────

function FieldRow({ rule, idx, allCollections, token, onUpdate }: {
  rule: MappingRule; idx: number;
  allCollections: { id: string; name: string }[];
  token: string;
  onUpdate: (i: number, r: MappingRule) => void;
}) {
  const isRef = rule.fieldType === "Reference" || rule.fieldType === "MultiReference";
  const isRich = rule.fieldType === "RichText";
  const isFile = rule.fieldType === "File";
  const mapped = !!rule.htmlSelector?.trim() || !!rule.staticValue?.trim();
  const m = FIELD_META[rule.fieldType] || FIELD_META.PlainText;
  const [useStatic, setUseStatic] = useState(!!rule.staticValue?.trim());

  const refWarning = isRef && !useStatic && mapped && !rule.multiRefConfig?.refCollectionId?.trim();

  const toggleStatic = () => {
    const next = !useStatic;
    setUseStatic(next);
    if (next) {
      onUpdate(idx, { ...rule, htmlSelector: "", staticValue: "" });
    } else {
      onUpdate(idx, { ...rule, staticValue: undefined });
    }
  };

  return (
    <div className={`rounded-xl border-2 transition-all bg-white
      ${refWarning ? "border-amber-300 shadow-sm shadow-amber-100" :
        mapped ? "border-border" : "border-dashed border-border/50"}`}>
      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2 flex-wrap min-w-0">
            <div className={`w-7 h-7 rounded-md flex items-center justify-center ${m.bg} ${m.border} border`}>
              <m.icon className={`w-3.5 h-3.5 ${m.color}`} />
            </div>
            <span className="font-semibold text-sm">{rule.webflowFieldName}</span>
            <FieldBadge type={rule.fieldType} />
            <span className="text-[10px] font-mono text-muted-foreground">{rule.fieldSlug}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button type="button" onClick={toggleStatic}
              className="text-[10px] text-muted-foreground underline hover:text-foreground whitespace-nowrap">
              {useStatic ? "Use CSS selector" : isRef ? "Pick from collection" : "Use static value"}
            </button>
            {mapped && !refWarning && <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5" />}
            {refWarning && <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5" />}
          </div>
        </div>

        {/* Input area */}
        {useStatic ? (
          !isRef && (
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">
                Static Value <span className="text-[10px] text-blue-500">— used directly for every URL, no scraping needed</span>
              </Label>
              <Input
                value={rule.staticValue ?? ""}
                onChange={(e) => onUpdate(idx, { ...rule, staticValue: e.target.value, htmlSelector: "" })}
                placeholder="e.g. website, true"
                className="font-mono text-sm h-9"
              />
            </div>
          )
        ) : (
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">
              CSS Selector
              {isRef && <span className="ml-1 text-purple-500 text-[10px]">— matches container/label elements; text extracted automatically</span>}
              {rule.fieldType === "Link" && <span className="ml-1 text-cyan-500 text-[10px]">— href attribute is used</span>}
              {rule.fieldType === "Image" && <span className="ml-1 text-orange-500 text-[10px]">— src attribute is used</span>}
              {isFile && <span className="ml-1 text-gray-500 text-[10px]">— href or src of the file link/element</span>}
              {isRich && <span className="ml-1 text-green-600 text-[10px]">— full innerHTML extracted; use Exclude below to strip noise</span>}
              <span className="ml-1 text-gray-400 text-[10px]">— also supports meta[name="description"]</span>
            </Label>
            <Input
              value={rule.htmlSelector}
              onChange={(e) => onUpdate(idx, { ...rule, htmlSelector: e.target.value })}
              placeholder={
                rule.fieldType === "MultiReference" ? `e.g. .post-categories a` :
                rule.fieldType === "Reference" ? `e.g. .post-author` :
                rule.fieldType === "Image" ? `e.g. .featured-image img` :
                rule.fieldType === "RichText" ? `e.g. .col-md-9.blog-body` :
                rule.fieldType === "Link" ? `e.g. a.read-more` :
                rule.fieldType === "File" ? `e.g. a.download-link` :
                `e.g. .post-${rule.fieldSlug}`
              }
              className="font-mono text-sm h-9"
            />
          </div>
        )}

        {/* Sub-panels */}
        {isRef && <RefConfigPanel rule={rule} idx={idx} allCollections={allCollections} token={token} onUpdate={onUpdate} />}
        {isRich && !useStatic && <ExcludePanel rule={rule} idx={idx} onUpdate={onUpdate} />}
      </div>
    </div>
  );
}
// ─── Step indicator ───────────────────────────────────────────────────────────

const STEPS = [
  { id: 1, title: "Connect",    icon: Key },
  { id: 2, title: "Collection", icon: Layers },
  { id: 3, title: "URLs",       icon: Globe },
  { id: 4, title: "Mapping",    icon: MousePointer2 },
  { id: 5, title: "Review",     icon: Play },
];

function StepBar({ current }: { current: number }) {
  return (
    <div className="mb-10">
      <div className="flex items-center justify-between relative">
        {/* connector line */}
        <div className="absolute top-5 left-5 right-5 h-0.5 bg-border z-0" />
        <div
          className="absolute top-5 left-5 h-0.5 z-0 bg-primary transition-all duration-500"
          style={{ width: `${((current - 1) / (STEPS.length - 1)) * 100}%` }}
        />
        {STEPS.map((s) => {
          const done = s.id < current, active = s.id === current;
          return (
            <div key={s.id} className="flex flex-col items-center gap-2 z-10">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300 text-sm font-bold
                ${active  ? "bg-primary border-primary text-white shadow-lg shadow-primary/30 scale-110" :
                  done    ? "bg-primary border-primary text-white" :
                            "bg-white border-border text-muted-foreground"}`}>
                {done ? <CheckCircle2 className="w-5 h-5" /> : <s.icon className="w-4 h-4" />}
              </div>
              <span className={`text-[11px] font-semibold hidden sm:block ${active ? "text-primary" : done ? "text-foreground" : "text-muted-foreground"}`}>
                {s.title}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main Wizard ───────────────────────────────────────────────────────────────

export default function WizardPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { currentUser } = useAuth();

  const [step, setStep]           = useState(1);
  const [token, setToken]         = useState("");
  const [showToken, setShowToken] = useState(false);
  const [collectionId, setCollectionId]     = useState("");
  const [collectionName, setCollectionName] = useState("");
  const [urlsInput, setUrlsInput]   = useState("");
  const [mappingRules, setMappingRules] = useState<MappingRule[]>([]);
  const [saveTemplate, setSaveTemplate]     = useState(false);
  const [templateName, setTemplateName]     = useState("");
  const [selectedTplId, setSelectedTplId]   = useState("none");
  const [previewHtml, setPreviewHtml]       = useState<string | null>(null);
  const [validationErrs, setValidationErrs] = useState<string[]>([]);
  const [collections, setCollections]       = useState<{ id: string; name: string }[]>([]);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [loginPromptReason, setLoginPromptReason] = useState<"url_limit" | "save_template">("url_limit");
  // For guests: show inline result after import instead of navigating to /jobs/:id
  const [guestResult, setGuestResult] = useState<{ jobId: string; urlCount: number } | null>(null);

  const GUEST_URL_LIMIT = 5;

  const fetchCollections = useWebflowCollections();
  const fetchFields      = useWebflowFields();
  const createJob        = useCreateJob();
  const createTpl        = useCreateTemplate();
  const previewScrape    = usePreviewScrape();
  const discoverUrls     = useDiscoverUrls();
  
  // URL Discovery state
  const [showDiscoverModal, setShowDiscoverModal] = useState(false);
  const [discoverDomain, setDiscoverDomain] = useState("");
  const [discoveredUrls, setDiscoveredUrls] = useState<Array<{ url: string; title?: string; selected: boolean }>>([]);
  const [selectAll, setSelectAll] = useState(false);
  const [urlSearchFilter, setUrlSearchFilter] = useState("");
  const { data: templates = [] } = useTemplates();

  const next = () => setStep((s) => Math.min(5, s + 1));
  const back = () => setStep((s) => Math.max(1, s - 1));

  const updateRule = useCallback((idx: number, updated: MappingRule) => {
    setMappingRules((prev) => { const n = [...prev]; n[idx] = updated; return n; });
  }, []);

  // ── Step 1: Connect ──────────────────────────────────────────────────────────
  const handleConnect = async () => {
    if (!token.trim()) { toast({ title: "API token required", variant: "destructive" }); return; }
    try {
      const data = await fetchCollections.mutateAsync(token);
      setCollections(data);
      next();
    } catch (e: any) { toast({ title: "Connection failed", description: e.message, variant: "destructive" }); }
  };

  // ── Step 2: Select collection ────────────────────────────────────────────────
  const handleSelectCollection = async () => {
    if (!collectionId) { toast({ title: "Select a collection", variant: "destructive" }); return; }
    try {
      const fields = await fetchFields.mutateAsync({ token, collectionId });
      setMappingRules(fields.map((f: any) => {
        const isRef = f.type === "Reference" || f.type === "MultiReference";
        // Webflow API returns f.validations.collectionId for reference fields
        const autoRefId = f.validations?.collectionId ?? "";
        const autoRefName = autoRefId ? (collections.find((c) => c.id === autoRefId)?.name ?? "") : "";
        return {
          webflowFieldId: f.id,
          webflowFieldName: f.name,
          fieldSlug: f.slug,
          fieldType: f.type,
          htmlSelector: "",
          ...(isRef ? { multiRefConfig: { refCollectionId: autoRefId, refCollectionName: autoRefName, refNameField: "name", refSlugField: "slug" } } : {}),
          ...(f.type === "RichText" ? { excludeSelectors: [] } : {}),
        };
      }));
      next();
    } catch (e: any) { toast({ title: "Failed to load fields", description: e.message, variant: "destructive" }); }
  };

  // ── Step 3: URLs ─────────────────────────────────────────────────────────────
  const urlLines = urlsInput.split("\n").map((s) => s.trim()).filter(Boolean);

  const handlePreview = async () => {
    if (!urlLines.length) return;
    try {
      const r = await previewScrape.mutateAsync(urlLines[0]);
      setPreviewHtml(r.html);
    } catch (e: any) { toast({ title: "Preview failed", description: e.message, variant: "destructive" }); }
  };

  // ── URL Discovery ────────────────────────────────────────────────────────────
  const handleDiscoverUrls = async () => {
    if (!discoverDomain.trim()) {
      toast({ title: "Enter a domain", description: "e.g., yourblog.com", variant: "destructive" });
      return;
    }
    
    try {
      const urls = await discoverUrls.mutateAsync(discoverDomain);
      setDiscoveredUrls(urls.map(u => ({ ...u, selected: false })));
      toast({ title: "Found URLs", description: `Discovered ${urls.length} URLs from the domain` });
    } catch (e: any) {
      toast({ title: "Discovery failed", description: e.message, variant: "destructive" });
    }
  };

  const handleToggleSelectAll = () => {
    const newValue = !selectAll;
    setSelectAll(newValue);
    setDiscoveredUrls(prev => prev.map(u => ({ ...u, selected: newValue })));
  };

  const handleToggleUrl = (index: number) => {
    setDiscoveredUrls(prev => {
      const updated = [...prev];
      updated[index].selected = !updated[index].selected;
      
      // Update selectAll state based on whether all are selected
      const allSelected = updated.every(u => u.selected);
      setSelectAll(allSelected);
      
      return updated;
    });
  };

  const handleAddSelectedUrls = () => {
    const selectedUrls = discoveredUrls.filter(u => u.selected);
    if (selectedUrls.length === 0) {
      toast({ title: "No URLs selected", variant: "destructive" });
      return;
    }

    const newUrls = selectedUrls.map(u => u.url).join('\n');
    setUrlsInput(prev => prev ? `${prev}\n${newUrls}` : newUrls);
    
    setShowDiscoverModal(false);
    setDiscoveredUrls([]);
    setDiscoverDomain("");
    setSelectAll(false);
    setUrlSearchFilter("");
    
    toast({ title: "URLs added", description: `Added ${selectedUrls.length} URLs` });
  };

  // ── Step 4: Mapping ──────────────────────────────────────────────────────────
  // Only error if a ref field HAS a selector but NO collection configured
  const validate = (): string[] => {
    const errs: string[] = [];
    for (const r of mappingRules) {
      const isRef = r.fieldType === "Reference" || r.fieldType === "MultiReference";
      if (isRef && r.htmlSelector?.trim() && !r.multiRefConfig?.refCollectionId?.trim()) {
        errs.push(`"${r.webflowFieldName}": Select the referenced collection (or clear the CSS selector to skip this field).`);
      }
    }
    return errs;
  };

  const handleMappingNext = () => {
    const errs = validate();
    if (errs.length) { setValidationErrs(errs); toast({ title: "Fix reference fields", description: errs[0], variant: "destructive" }); return; }
    setValidationErrs([]);
    next();
  };

  const applyTemplate = (id: string) => {
    setSelectedTplId(id);
    if (id === "none") return;
    const tpl = templates.find((t) => t.id.toString() === id);
    if (!tpl) return;
    const tplRules = tpl.mappingRules as MappingRule[];
    setMappingRules((prev) => prev.map((p) => {
      const found = tplRules.find((tr) => tr.webflowFieldId === p.webflowFieldId);
      return found ? { ...p, htmlSelector: found.htmlSelector, multiRefConfig: found.multiRefConfig ?? p.multiRefConfig, excludeSelectors: found.excludeSelectors ?? p.excludeSelectors } : p;
    }));
    toast({ title: "Template applied", description: tpl.name });
  };

  // ── Step 5: Start import ─────────────────────────────────────────────────────
  const handleImport = async () => {
    const errs = validate();
    if (errs.length) { toast({ title: "Validation failed", description: errs[0], variant: "destructive" }); return; }
    const active = mappingRules.filter((m) => m.htmlSelector.trim() || m.staticValue?.trim());

    // ── Guest restrictions — show login dialog, never silently fail ──────────
    if (!currentUser) {
      if (urlLines.length > GUEST_URL_LIMIT) {
        setLoginPromptReason("url_limit");
        setShowLoginPrompt(true);
        return;
      }
      if (saveTemplate) {
        setLoginPromptReason("save_template");
        setShowLoginPrompt(true);
        return;
      }
    }

    try {
      if (currentUser && saveTemplate && templateName.trim()) {
        await createTpl.mutateAsync({ name: templateName, collectionId, collectionName, mappingRules: active, cleanupRules: [] });
      }
      const job = await createJob.mutateAsync({ token, collectionId, urls: urlLines, mappingRules: active });
      toast({ title: "Import started!" });

      if (currentUser) {
        // Logged-in users: navigate to the job progress page
        setLocation(`/jobs/${job.id}`);
      } else {
        // Guests: stay on extract page and show an inline result summary
        // (navigating to /jobs/:id would redirect them to /login)
        setGuestResult({ jobId: job.id, urlCount: urlLines.length });
        setStep(6); // synthetic "done" step for guests
      }
    } catch (e: any) { toast({ title: "Failed", description: e.message, variant: "destructive" }); }
  };

  // ── Derived counts ────────────────────────────────────────────────────────────
  const mappedCount = mappingRules.filter((m) => m.htmlSelector.trim() || m.staticValue?.trim()).length;
  const refRules    = mappingRules.filter((r) => r.fieldType === "Reference" || r.fieldType === "MultiReference");

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      {step <= 5 && <StepBar current={step} />}

      <AnimatePresence mode="wait">
        <motion.div key={step}
          initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.18 }}>

          {/* ═══════════════════ STEP 1: CONNECT ═══════════════════ */}
          {step === 1 && (
            <Card className="shadow-lg border-border/60">
              <CardHeader className="border-b bg-gradient-to-br from-primary/5 to-transparent">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Key className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle>Connect to Webflow</CardTitle>
                    <CardDescription>Enter your API token to load your collections</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-7 space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="token">Webflow API Token</Label>
                  <div className="relative">
                    <Input id="token" type={showToken ? "text" : "password"} placeholder="Paste your token here…"
                      value={token} onChange={(e) => setToken(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleConnect()}
                      className="h-11 pr-11 font-mono" />
                    <button type="button" onClick={() => setShowToken((s) => !s)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                      {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Webflow → Site Settings → Integrations → API Access → Generate Token
                  </p>
                </div>

                <div className="rounded-xl bg-muted/40 border p-4 space-y-2 text-sm">
                  <p className="font-semibold text-sm">What gets fetched automatically</p>
                  <div className="space-y-1 text-muted-foreground">
                    <p>✦ All your CMS collections</p>
                    <p>✦ All field types including Reference and MultiReference</p>
                    <p>✦ Referenced collection IDs — no manual entry needed</p>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button size="lg" onClick={handleConnect} disabled={fetchCollections.isPending} className="min-w-36">
                    {fetchCollections.isPending
                      ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Connecting…</>
                      : <>Connect <ArrowRight className="w-4 h-4 ml-2" /></>}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* ═══════════════════ STEP 2: COLLECTION ═══════════════════ */}
          {step === 2 && (
            <Card className="shadow-lg border-border/60">
              <CardHeader className="border-b bg-gradient-to-br from-primary/5 to-transparent">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Layers className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle>Select Collection</CardTitle>
                    <CardDescription>Choose the CMS collection to import into</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-7 space-y-5">
                {collections.length === 0
                  ? <p className="text-center text-muted-foreground py-10">No collections found for this token.</p>
                  : (
                    <div className="grid gap-2.5 sm:grid-cols-2 max-h-[400px] overflow-y-auto pr-1">
                      {collections.map((c) => {
                        const selected = collectionId === c.id;
                        return (
                          <button key={c.id} type="button"
                            onClick={() => { setCollectionId(c.id); setCollectionName(c.name); }}
                            className={`p-3.5 rounded-xl border-2 text-left flex items-center gap-3 transition-all
                              ${selected ? "border-primary bg-primary/5 shadow-sm" : "border-border hover:border-primary/40 hover:bg-muted/20"}`}>
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${selected ? "bg-primary/10" : "bg-muted"}`}>
                              <Layers className={`w-4 h-4 ${selected ? "text-primary" : "text-muted-foreground"}`} />
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-sm truncate">{c.name}</p>
                              <p className="text-[10px] text-muted-foreground font-mono truncate">{c.id}</p>
                            </div>
                            {selected && <CheckCircle2 className="w-4 h-4 text-primary ml-auto shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  )}

                <div className="flex justify-between pt-2 border-t">
                  <Button variant="ghost" onClick={back}><ArrowLeft className="w-4 h-4 mr-2" /> Back</Button>
                  <Button size="lg" onClick={handleSelectCollection} disabled={fetchFields.isPending || !collectionId} className="min-w-36">
                    {fetchFields.isPending
                      ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Loading fields…</>
                      : <>Continue <ArrowRight className="w-4 h-4 ml-2" /></>}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* ═══════════════════ STEP 3: URLs ═══════════════════ */}
          {step === 3 && (
            <Card className="shadow-lg border-border/60">
              <CardHeader className="border-b bg-gradient-to-br from-primary/5 to-transparent">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Globe className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle>Source URLs</CardTitle>
                    <CardDescription>One URL per line — each will become a CMS item</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-7 space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Page URLs</Label>
                  <div className="flex items-center gap-2">
                    {urlLines.length > 0 && (
                      <Badge variant="secondary" className="text-xs">{urlLines.length} URL{urlLines.length !== 1 ? "s" : ""}</Badge>
                    )}
                    <Button variant="outline" size="sm" onClick={() => setShowDiscoverModal(true)}
                      className="h-8 gap-1.5 text-xs">
                      <Sparkles className="w-3 h-3" />
                      Discover URLs
                    </Button>
                    <Button variant="outline" size="sm" onClick={handlePreview}
                      disabled={previewScrape.isPending || !urlLines.length} className="h-8 gap-1.5 text-xs">
                      {previewScrape.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Eye className="w-3 h-3" />}
                      Preview HTML
                    </Button>
                  </div>
                </div>

                <Textarea value={urlsInput} onChange={(e) => setUrlsInput(e.target.value)}
                  placeholder={"https://yourblog.com/posts/first-article\nhttps://yourblog.com/posts/second-article"}
                  className="min-h-[200px] font-mono text-sm" />

                {/* Guest limit warning */}
                {!currentUser && urlLines.length > 0 && (
                  <div className={`rounded-lg border px-4 py-3 text-xs flex items-start gap-2 ${urlLines.length > GUEST_URL_LIMIT ? "border-red-300 bg-red-50 text-red-700" : "border-amber-200 bg-amber-50 text-amber-700"}`}>
                    <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                    <span>
                      {urlLines.length > GUEST_URL_LIMIT
                        ? <>You have <strong>{urlLines.length} URLs</strong> — guests are limited to <strong>{GUEST_URL_LIMIT}</strong>. <button type="button" onClick={() => setShowLoginPrompt(true)} className="underline font-semibold">Log in to continue.</button></>
                        : <>Guests can extract up to <strong>{GUEST_URL_LIMIT} URLs</strong>. You have {urlLines.length}. <button type="button" onClick={() => setLocation("/login")} className="underline">Log in</button> for unlimited access.</>
                      }
                    </span>
                  </div>
                )}

                {previewHtml && (
                  <div className="rounded-xl border overflow-hidden">
                    <div className="flex items-center justify-between bg-muted px-4 py-2 border-b">
                      <span className="text-xs font-semibold flex items-center gap-1.5"><Globe className="w-3.5 h-3.5" /> HTML Preview — first URL</span>
                      <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => setPreviewHtml(null)}>Close</Button>
                    </div>
                    <pre className="max-h-56 overflow-auto p-3 text-[10px] font-mono text-muted-foreground bg-muted/20 whitespace-pre-wrap break-all leading-relaxed">
                      {previewHtml.slice(0, 4000)}{previewHtml.length > 4000 ? "\n\n…[truncated]" : ""}
                    </pre>
                  </div>
                )}

                <div className="flex justify-between pt-2 border-t">
                  <Button variant="ghost" onClick={back}><ArrowLeft className="w-4 h-4 mr-2" /> Back</Button>
                  <Button size="lg" onClick={() => { if (!urlLines.length) { toast({ title: "Enter at least one URL", variant: "destructive" }); return; } next(); }} disabled={!urlsInput.trim()}>
                    Continue <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* ═══════════════════ STEP 4: MAPPING ═══════════════════ */}
          {step === 4 && (
            <Card className="shadow-lg border-border/60">
              <CardHeader className="border-b bg-gradient-to-br from-primary/5 to-transparent">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <MousePointer2 className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle>Map Fields</CardTitle>
                      <CardDescription>Set a CSS selector for each field you want to import</CardDescription>
                    </div>
                  </div>
                  {/* Template selector */}
                  {templates.filter((t) => t.collectionId === collectionId).length > 0 && (
                    <Select value={selectedTplId} onValueChange={applyTemplate}>
                      <SelectTrigger className="w-48 h-9 text-sm"><SelectValue placeholder="Apply template…" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No template</SelectItem>
                        {templates.filter((t) => t.collectionId === collectionId).map((t) => (
                          <SelectItem key={t.id} value={t.id.toString()}>{t.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                {/* Stats */}
                <div className="flex flex-wrap gap-2 mt-3">
                  <Badge variant="outline">{mappingRules.length} fields</Badge>
                  {refRules.length > 0 && <Badge className="bg-purple-50 text-purple-700 border-purple-200">{refRules.length} reference</Badge>}
                  {mappedCount > 0 && <Badge className="bg-green-50 text-green-700 border-green-200">{mappedCount} mapped</Badge>}
                  {mappingRules.length - mappedCount > 0 && <Badge variant="outline" className="text-muted-foreground">{mappingRules.length - mappedCount} skipped</Badge>}
                </div>
              </CardHeader>

              <CardContent className="pt-6 space-y-5">
                {/* Validation errors */}
                {validationErrs.length > 0 && (
                  <div className="rounded-xl border border-destructive/30 bg-red-50 p-4">
                    <p className="font-semibold text-sm text-destructive flex items-center gap-2 mb-2">
                      <AlertTriangle className="w-4 h-4" /> Fix before continuing
                    </p>
                    <ul className="text-sm text-destructive/80 space-y-1 list-disc list-inside">
                      {validationErrs.map((e, i) => <li key={i}>{e}</li>)}
                    </ul>
                  </div>
                )}

                {/* Info banner */}
                <div className="rounded-lg bg-blue-50 border border-blue-200 px-4 py-3 text-xs text-blue-700 flex items-start gap-2">
                  <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                  <span>Leave a field's selector empty to skip it. Fields with no selector are not imported.</span>
                </div>

                {/* Ref fields first */}
                {refRules.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <GitBranch className="w-4 h-4 text-purple-500" />
                      <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Reference Fields</span>
                      <div className="flex-1 h-px bg-border" />
                    </div>
                    {mappingRules.map((rule, idx) => {
                      if (rule.fieldType !== "Reference" && rule.fieldType !== "MultiReference") return null;
                      return <FieldRow key={rule.webflowFieldId} rule={rule} idx={idx} allCollections={collections} token={token} onUpdate={updateRule} />;
                    })}
                  </div>
                )}

                {/* All other fields */}
                <div className="space-y-3">
                  {refRules.length > 0 && (
                    <div className="flex items-center gap-2">
                      <MousePointer2 className="w-4 h-4 text-muted-foreground" />
                      <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Other Fields</span>
                      <div className="flex-1 h-px bg-border" />
                    </div>
                  )}
                  {mappingRules.map((rule, idx) => {
                    if (rule.fieldType === "Reference" || rule.fieldType === "MultiReference") return null;
                    return <FieldRow key={rule.webflowFieldId} rule={rule} idx={idx} allCollections={collections} token={token} onUpdate={updateRule} />;
                  })}
                </div>

                <div className="flex justify-between pt-4 border-t">
                  <Button variant="ghost" onClick={back}><ArrowLeft className="w-4 h-4 mr-2" /> Back</Button>
                  <Button size="lg" onClick={handleMappingNext}>Review Import <ArrowRight className="w-4 h-4 ml-2" /></Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* ═══════════════════ STEP 5: REVIEW ═══════════════════ */}
          {step === 5 && (
            <Card className="shadow-lg border-border/60">
              <CardHeader className="border-b bg-gradient-to-br from-primary/5 to-transparent text-center">
                <div className="mx-auto w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mb-3">
                  <Sparkles className="w-7 h-7 text-primary" />
                </div>
                <CardTitle className="text-2xl">Ready to Import</CardTitle>
                <CardDescription className="mt-1">Review everything below, then start</CardDescription>
              </CardHeader>
              <CardContent className="pt-7 space-y-6">

                {/* Stats row */}
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: "Collection", value: collectionName },
                    { label: "URLs", value: urlLines.length },
                    { label: "Fields", value: `${mappedCount} mapped` },
                  ].map((s) => (
                    <div key={s.label} className="rounded-xl border bg-muted/30 p-4 text-center">
                      <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mb-1">{s.label}</p>
                      <p className="font-bold text-lg leading-tight">{s.value}</p>
                    </div>
                  ))}
                </div>

                {/* Reference fields summary */}
                {refRules.filter((r) => r.htmlSelector.trim()).length > 0 && (
                  <div className="rounded-xl border border-purple-200 bg-purple-50 p-4 space-y-3">
                    <p className="text-sm font-bold text-purple-700 flex items-center gap-2">
                      <GitBranch className="w-4 h-4" /> Reference Fields
                    </p>
                    {refRules.filter((r) => r.htmlSelector.trim()).map((rule) => (
                      <div key={rule.webflowFieldId} className="bg-white rounded-lg border p-3 text-xs space-y-1.5">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{rule.webflowFieldName}</span>
                          <FieldBadge type={rule.fieldType} />
                        </div>
                        <div className="grid grid-cols-2 gap-1 text-muted-foreground">
                          <span>Selector: <code className="text-foreground font-mono">{rule.htmlSelector}</code></span>
                          <span>Collection: <code className="text-foreground font-mono">{rule.multiRefConfig?.refCollectionName || rule.multiRefConfig?.refCollectionId || "—"}</code></span>
                          <span>Name field: <code className="text-foreground font-mono">{rule.multiRefConfig?.refNameField || "name"}</code></span>
                          <span>Slug field: <code className="text-foreground font-mono">{rule.multiRefConfig?.refSlugField || "slug"}</code></span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* All mapped fields */}
                <div className="rounded-xl border overflow-hidden">
                  <div className="bg-muted/50 border-b px-4 py-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                    Mapped Fields ({mappedCount})
                  </div>
                  <div className="divide-y max-h-60 overflow-y-auto">
                    {mappingRules.filter((m) => m.htmlSelector.trim()).length === 0
                      ? <p className="p-4 text-sm text-muted-foreground text-center">No fields mapped</p>
                      : mappingRules.filter((m) => m.htmlSelector.trim()).map((rule) => (
                        <div key={rule.webflowFieldId} className="px-4 py-2.5 flex items-center gap-3 text-sm">
                          <FieldBadge type={rule.fieldType} />
                          <span className="font-medium flex-1 truncate">{rule.webflowFieldName}</span>
                          <code className="text-xs text-muted-foreground truncate max-w-[180px] font-mono">{rule.htmlSelector}</code>
                          {(rule.excludeSelectors?.filter(Boolean).length ?? 0) > 0 && (
                            <Badge className="bg-red-50 text-red-600 border-red-200 text-[10px] h-4 px-1.5 shrink-0">
                              {rule.excludeSelectors!.filter(Boolean).length} excl.
                            </Badge>
                          )}
                        </div>
                      ))}
                  </div>
                </div>

                {/* Save as template */}
                <div className="rounded-xl border bg-muted/20 p-4">
                  <div className="flex items-start gap-3">
                    <Checkbox
                      id="tpl"
                      checked={saveTemplate}
                      onCheckedChange={(c) => {
                        if (!currentUser && c) {
                          setLoginPromptReason("save_template");
                          setShowLoginPrompt(true);
                          return;
                        }
                        setSaveTemplate(!!c);
                      }}
                      className="mt-0.5"
                    />
                    <div className="space-y-1.5 flex-1">
                      <Label htmlFor="tpl" className={`font-semibold cursor-pointer text-sm ${!currentUser ? "text-muted-foreground" : ""}`}>
                        Save as Template
                        {!currentUser && <span className="ml-2 text-[10px] text-amber-600 font-normal">(login required)</span>}
                      </Label>
                      <p className="text-xs text-muted-foreground">Save these selectors and configs for future imports from the same site.</p>
                      <AnimatePresence>
                        {saveTemplate && currentUser && (
                          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
                            <Input value={templateName} onChange={(e) => setTemplateName(e.target.value)}
                              placeholder="Template name e.g. Company Blog"
                              className="max-w-xs h-9 mt-1 bg-white" />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between pt-2 border-t">
                  <Button variant="ghost" onClick={back}><ArrowLeft className="w-4 h-4 mr-2" /> Back</Button>
                  <Button size="lg"
                    className="px-8 shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/25 hover:-translate-y-0.5 transition-all"
                    onClick={handleImport}
                    disabled={createJob.isPending || mappedCount === 0 || (saveTemplate && !templateName.trim())}>
                    {createJob.isPending
                      ? <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Starting…</>
                      : <><Sparkles className="w-5 h-5 mr-2" /> Start Import</>}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* ═══════════════════ STEP 6: GUEST RESULT ═══════════════════ */}
          {step === 6 && guestResult && (
            <Card className="shadow-lg border-border/60">
              <CardHeader className="border-b bg-gradient-to-br from-green-500/5 to-transparent text-center">
                <div className="mx-auto w-14 h-14 bg-green-500/10 rounded-2xl flex items-center justify-center mb-3">
                  <CheckCircle2 className="w-7 h-7 text-green-600" />
                </div>
                <CardTitle className="text-2xl">Import Started!</CardTitle>
                <CardDescription className="mt-1">
                  Your {guestResult.urlCount} URL{guestResult.urlCount !== 1 ? "s are" : " is"} being pushed to Webflow CMS.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-7 space-y-5">

                {/* Success info */}
                <div className="rounded-xl border border-green-200 bg-green-50 p-4 space-y-2 text-sm">
                  <p className="font-semibold text-green-800 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" /> Pushing to Webflow CMS now
                  </p>
                  <p className="text-green-700">
                    Your content is being scraped and pushed directly to your Webflow collection — no login needed for up to {GUEST_URL_LIMIT} URLs.
                  </p>
                </div>

                <div className="rounded-xl border bg-muted/30 p-4 space-y-3 text-sm">
                  <p className="font-semibold">What's happening:</p>
                  <div className="space-y-1.5 text-muted-foreground">
                    <p>✦ Scraping content from your {guestResult.urlCount} URL{guestResult.urlCount !== 1 ? "s" : ""}</p>
                    <p>✦ Mapping fields to your Webflow collection</p>
                    <p>✦ Creating CMS items in Webflow</p>
                  </div>
                </div>

                {/* Upsell — optional, not blocking */}
                <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-4 text-sm text-blue-700 space-y-1">
                  <p className="font-semibold">Want job history &amp; unlimited URLs?</p>
                  <p className="text-xs">Create a free account to track import progress, view logs, and process more than {GUEST_URL_LIMIT} URLs at once.</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Button variant="outline" onClick={() => { setStep(1); setGuestResult(null); setUrlsInput(""); }}>
                    Start New Import
                  </Button>
                  <Button onClick={() => setLocation("/signup")} className="gap-2">
                    <User className="w-4 h-4" />
                    Create Free Account
                  </Button>
                </div>
                <div className="text-center">
                  <button type="button" onClick={() => setLocation("/login")}
                    className="text-xs text-muted-foreground underline hover:text-foreground">
                    Already have an account? Log in →
                  </button>
                </div>
              </CardContent>
            </Card>
          )}

        </motion.div>
      </AnimatePresence>

      {/* URL Discovery Modal */}
      <Dialog open={showDiscoverModal} onOpenChange={setShowDiscoverModal}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              Discover URLs from Domain
            </DialogTitle>
            <DialogDescription>
              Automatically find all pages from sitemap.xml or by crawling the homepage
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 flex-1 overflow-auto">
            {/* Domain Input */}
            <div className="flex gap-2">
              <Input
                placeholder="e.g., yourblog.com or https://yourblog.com"
                value={discoverDomain}
                onChange={(e) => setDiscoverDomain(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !discoverUrls.isPending) {
                    handleDiscoverUrls();
                  }
                }}
                className="flex-1"
              />
              <Button
                onClick={handleDiscoverUrls}
                disabled={discoverUrls.isPending || !discoverDomain.trim()}
              >
                {discoverUrls.isPending ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Discovering...</>
                ) : (
                  <><Globe className="w-4 h-4 mr-2" /> Discover</>
                )}
              </Button>
            </div>

            {/* Discovered URLs List */}
            {discoveredUrls.length > 0 && (
              <div className="space-y-3">
                {/* Search and Select All Controls */}
                <div className="space-y-2 border-b pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={selectAll}
                        onCheckedChange={handleToggleSelectAll}
                        id="select-all"
                      />
                      <Label htmlFor="select-all" className="cursor-pointer font-semibold">
                        Select All
                      </Label>
                    </div>
                    <Badge variant="secondary" className="text-sm">
                      {discoveredUrls.filter(u => u.selected).length} selected / {discoveredUrls.length} total
                    </Badge>
                  </div>
                  
                  {/* Search Filter */}
                  <Input
                    placeholder="Filter URLs... (e.g., /blog/, 2024, product)"
                    value={urlSearchFilter}
                    onChange={(e) => setUrlSearchFilter(e.target.value)}
                    className="text-sm"
                  />
                </div>

                {/* URL List with Filter */}
                <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                  {(() => {
                    const filtered = discoveredUrls.filter(item => 
                      !urlSearchFilter || item.url.toLowerCase().includes(urlSearchFilter.toLowerCase())
                    );
                    
                    if (filtered.length === 0) {
                      return (
                        <div className="text-center py-8 text-muted-foreground">
                          <p>No URLs match your filter "{urlSearchFilter}"</p>
                        </div>
                      );
                    }
                    
                    return filtered.map((item, originalIndex) => {
                      // Find the original index in the full array
                      const index = discoveredUrls.findIndex(u => u.url === item.url);
                      
                      return (
                        <div
                          key={index}
                          className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
                            item.selected ? 'bg-primary/5 border-primary/30' : 'bg-background hover:bg-muted/50'
                          }`}
                        >
                          <Checkbox
                            checked={item.selected}
                            onCheckedChange={() => handleToggleUrl(index)}
                            id={`url-${index}`}
                          />
                          <Label
                            htmlFor={`url-${index}`}
                            className="flex-1 cursor-pointer space-y-1"
                          >
                            {item.title && (
                              <div className="font-medium text-sm">{item.title}</div>
                            )}
                            <div className="text-xs text-muted-foreground font-mono break-all">
                              {item.url}
                            </div>
                          </Label>
                        </div>
                      );
                    });
                  })()}
                </div>
                
                {urlSearchFilter && (
                  <p className="text-xs text-muted-foreground text-center">
                    Showing {discoveredUrls.filter(u => u.url.toLowerCase().includes(urlSearchFilter.toLowerCase())).length} of {discoveredUrls.length} URLs
                  </p>
                )}
              </div>
            )}

            {discoveredUrls.length === 0 && !discoverUrls.isPending && discoverDomain && (
              <div className="text-center py-8 text-muted-foreground">
                <Globe className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No URLs discovered yet. Click "Discover" to start.</p>
              </div>
            )}
          </div>

          <DialogFooter className="border-t pt-4">
            <Button variant="outline" onClick={() => setShowDiscoverModal(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAddSelectedUrls}
              disabled={discoveredUrls.filter(u => u.selected).length === 0}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Selected ({discoveredUrls.filter(u => u.selected).length})
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Login Prompt Dialog (url limit or save template) ── */}
      <Dialog open={showLoginPrompt} onOpenChange={setShowLoginPrompt}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <LogIn className="w-5 h-5 text-primary" />
              {loginPromptReason === "save_template" ? "Login to Save Templates" : "Login Required"}
            </DialogTitle>
            <DialogDescription>
              {loginPromptReason === "save_template"
                ? "Saving mapping templates requires a free account so your templates are stored securely."
                : <>You've entered <strong>{urlLines.length} URLs</strong>. Guest access is limited to <strong>{GUEST_URL_LIMIT} URLs</strong> per request.</>
              }
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-lg bg-muted/40 border p-4 space-y-2 text-sm text-muted-foreground">
            <p className="font-semibold text-foreground">With a free account you get:</p>
            <p>✦ Unlimited URLs per extraction</p>
            <p>✦ Save &amp; reuse mapping templates</p>
            <p>✦ Full job history &amp; logs</p>
          </div>
          <DialogFooter className="gap-2 flex-wrap">
            <Button variant="outline" onClick={() => setShowLoginPrompt(false)} className="flex-1">
              Cancel
            </Button>
            <Button variant="outline" onClick={() => setLocation("/signup")} className="flex-1">
              Register Free
            </Button>
            <Button onClick={() => setLocation("/login")} className="flex-1">
              <LogIn className="w-4 h-4 mr-2" /> Log In
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Guest: also prompt login when trying to save template from checkbox ── */}
    </div>
  );
}
