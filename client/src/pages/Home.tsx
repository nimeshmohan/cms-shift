import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { Sparkles, ArrowRight, Zap, Database, GitBranch, Clock, FileText, Globe } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export default function Home() {
  const { currentUser, loading } = useAuth();

  // Determine where "Get Started" should go
  const getStartedLink = "/extract"; // Always public — guest restrictions handled inside the wizard

  return (
    <div className="flex flex-col min-h-screen">
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative py-20 lg:py-28 overflow-hidden bg-background">
        {/* Ambient blobs */}
        <div className="absolute inset-0 z-0 pointer-events-none">
          <div className="absolute top-10 left-1/4 w-80 h-80 bg-primary/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-72 h-72 bg-primary/5 rounded-full blur-3xl" />
        </div>

        <div className="container mx-auto px-4 relative z-10 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>

            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-bold tracking-wide mb-7 border border-primary/20">
              <Sparkles className="w-3.5 h-3.5" />
              Webflow CMS Automation
            </div>

            {/* Headline — compact & punchy */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.1] mb-5">
              Scrape any page.
              <br />
              <span className="text-primary">Publish to Webflow CMS.</span>
              <br />
              <span className="text-muted-foreground font-medium text-3xl sm:text-4xl lg:text-5xl">No code. Seconds.</span>
            </h1>

            {/* Sub-copy */}
            <p className="text-lg text-muted-foreground mb-10 max-w-xl mx-auto">
              Point it at URLs, map CSS selectors to fields, and watch your CMS fill itself — including reference fields, rich text, and images.
            </p>

            {/* Single CTA - dynamic based on auth status */}
            <Link href={getStartedLink}>
              <Button size="lg" className="h-13 px-8 text-base gap-2 shadow-xl shadow-primary/20 hover:shadow-2xl hover:-translate-y-0.5 transition-all">
                Get Started <ArrowRight className="w-5 h-5" />
              </Button>
            </Link>

            {/* Social proof / stats row */}
            <div className="flex flex-wrap items-center justify-center gap-6 mt-10 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5"><Clock className="w-4 h-4 text-primary" /> Import in seconds</span>
              <span className="flex items-center gap-1.5"><Database className="w-4 h-4 text-primary" /> All field types</span>
              <span className="flex items-center gap-1.5"><GitBranch className="w-4 h-4 text-primary" /> Auto-creates references</span>
              <span className="flex items-center gap-1.5"><FileText className="w-4 h-4 text-primary" /> CSV export included</span>
            </div>
          </motion.div>

          {/* Mock UI card */}
          <motion.div
            initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.25 }}
            className="mt-16 max-w-4xl mx-auto"
          >
            <div className="rounded-2xl border border-border bg-card shadow-2xl overflow-hidden">
              {/* Fake browser bar */}
              <div className="flex items-center gap-2 px-4 py-3 bg-muted/60 border-b border-border/60">
                <span className="w-3 h-3 rounded-full bg-red-400" />
                <span className="w-3 h-3 rounded-full bg-yellow-400" />
                <span className="w-3 h-3 rounded-full bg-green-400" />
                <div className="flex-1 mx-4 bg-background rounded-md px-3 py-1.5 text-xs font-mono text-muted-foreground border border-border/40">
                  https://yourblog.com/posts/article-1
                </div>
              </div>
              {/* Fake content */}
              <div className="p-6 space-y-4 bg-gradient-to-br from-muted/20 to-background">
                <div className="flex items-start gap-4">
                  <div className="flex-1 space-y-3">
                    <div className="h-6 bg-primary/10 rounded-lg w-3/4" />
                    <div className="h-3 bg-muted rounded w-full" />
                    <div className="h-3 bg-muted rounded w-5/6" />
                    <div className="h-3 bg-muted rounded w-4/5" />
                  </div>
                  <div className="w-24 h-20 bg-primary/10 rounded-xl shrink-0" />
                </div>
                <div className="flex gap-2 pt-1">
                  {["Category A", "Category B"].map((t) => (
                    <span key={t} className="px-2 py-0.5 rounded-md bg-purple-100 text-purple-700 text-xs font-semibold border border-purple-200">{t}</span>
                  ))}
                </div>
                {/* Arrow */}
                <div className="flex items-center justify-center py-2">
                  <div className="flex items-center gap-3 text-xs text-muted-foreground font-semibold">
                    <div className="h-px w-8 bg-border" />
                    <Zap className="w-4 h-4 text-primary" />
                    <span className="text-primary">Imported to Webflow CMS</span>
                    <Zap className="w-4 h-4 text-primary" />
                    <div className="h-px w-8 bg-border" />
                  </div>
                </div>
                <div className="rounded-lg border border-green-200 bg-green-50 p-3 flex items-center gap-3">
                  <Globe className="w-4 h-4 text-green-600 shrink-0" />
                  <span className="text-xs text-green-700 font-mono">✓ Item created → webflow.io/cms/posts/article-1</span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Features ──────────────────────────────────────────────────────── */}
      <section className="py-20 bg-muted/30 border-t border-border/40">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-2xl font-bold mb-2">Everything you need</h2>
            <p className="text-muted-foreground text-sm max-w-md mx-auto">Handles the hard parts of CMS migration so you don't have to.</p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 max-w-5xl mx-auto">
            {[
              { icon: Zap, color: "text-yellow-500", bg: "bg-yellow-50 border-yellow-100", title: "CSS Selector Mapping", desc: "Pinpoint exactly what to extract from any page with familiar CSS selectors." },
              { icon: Database, color: "text-blue-500", bg: "bg-blue-50 border-blue-100", title: "All Field Types", desc: "Plain text, rich text, images, links, references — all handled correctly." },
              { icon: GitBranch, color: "text-purple-500", bg: "bg-purple-50 border-purple-100", title: "Auto References", desc: "Categories & tags are looked up or created in referenced collections automatically." },
              { icon: FileText, color: "text-green-500", bg: "bg-green-50 border-green-100", title: "CSV Export", desc: "Download a CSV mapping each source URL to its new Webflow CMS item URL." },
            ].map((f) => (
              <div key={f.title} className="p-6 rounded-2xl bg-background border border-border hover:shadow-md transition-shadow">
                <div className={`w-10 h-10 ${f.bg} border rounded-xl flex items-center justify-center mb-4`}>
                  <f.icon className={`w-5 h-5 ${f.color}`} />
                </div>
                <h3 className="font-bold text-sm mb-1.5">{f.title}</h3>
                <p className="text-muted-foreground text-xs leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      <footer className="py-6 border-t border-border/40 bg-muted/20">
        <div className="container mx-auto px-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
            <p>© {new Date().getFullYear()} CMS Shift. All rights reserved.</p>
            <p>Developed by <span className="font-semibold text-foreground">Nimesh</span></p>
          </div>
        </div>
      </footer>
    </div>
  );
}
