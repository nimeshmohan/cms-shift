import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Zap,
  Database,
  GitBranch,
  FileText,
  Globe,
  CheckCircle2,
  Code2,
  Layers,
  Clock,
  Sparkles,
} from "lucide-react";

export default function Document() {
  return (
    <div className="flex flex-col min-h-full bg-background">
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <section className="border-b border-border/40 bg-card/50">
        <div className="container mx-auto px-4 py-12">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <div className="max-w-3xl">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-2 rounded-lg bg-primary/10">
                  <FileText className="w-5 h-5 text-primary" />
                </div>
                <span className="text-sm font-semibold text-primary uppercase tracking-wider">Documentation</span>
              </div>
              <h1 className="text-4xl font-bold mb-3">CMS Shift Documentation</h1>
              <p className="text-lg text-muted-foreground">
                Learn how to use CMS Shift to automate your content migration and scraping workflow.
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── What is CMS Shift ────────────────────────────────────────────── */}
      <section className="py-12">
        <div className="container mx-auto px-4 max-w-3xl">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}>
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-5 h-5 text-primary" />
                  <CardTitle>What is CMS Shift?</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 text-muted-foreground leading-relaxed">
                <p>
                  CMS Shift is a powerful automation tool that allows you to scrape content from any website and automatically 
                  publish it to your Webflow CMS. No coding required.
                </p>
                <p>
                  Simply point CMS Shift at a URL, map CSS selectors to your CMS fields, and watch as your CMS fills itself 
                  with structured data in seconds. All field types are supported, including reference fields, rich text, 
                  and images.
                </p>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </section>

      {/* ── How to Use ────────────────────────────────────────────────────── */}
      <section className="py-12 bg-muted/30">
        <div className="container mx-auto px-4 max-w-3xl">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }}>
            <div className="mb-8">
              <h2 className="text-2xl font-bold mb-2">How to Use CMS Shift</h2>
              <p className="text-muted-foreground">Follow these steps to get started with content migration:</p>
            </div>

            <div className="space-y-4">
              {[
                {
                  step: "1",
                  title: "Connect Your Webflow Account",
                  description: "Start by authenticating with your Webflow account. CMS Shift will securely access your collections and fields.",
                  icon: Code2,
                },
                {
                  step: "2",
                  title: "Choose Your Target Collection",
                  description: "Select which Webflow collection you want to populate with scraped content.",
                  icon: Database,
                },
                {
                  step: "3",
                  title: "Map CSS Selectors to Fields",
                  description: "Use CSS selectors to tell CMS Shift exactly which elements on the page contain your data. Map each selector to the corresponding Webflow field.",
                  icon: Layers,
                },
                {
                  step: "4",
                  title: "Configure Reference Fields",
                  description: "For reference fields (like categories or tags), set up automatic lookups or creation of referenced items.",
                  icon: GitBranch,
                },
                {
                  step: "5",
                  title: "Preview & Import",
                  description: "Preview the scraped data to ensure accuracy. Once satisfied, click Import to publish items to your Webflow CMS.",
                  icon: CheckCircle2,
                },
                {
                  step: "6",
                  title: "Download Results",
                  description: "Get a CSV export mapping each source URL to its new Webflow CMS item URL for your records.",
                  icon: FileText,
                },
              ].map((item, idx) => {
                const Icon = item.icon;
                return (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.4, delay: 0.3 + idx * 0.05 }}
                  >
                    <Card className="hover:shadow-md transition-shadow">
                      <CardContent className="pt-6">
                        <div className="flex gap-4">
                          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 shrink-0">
                            <Icon className="w-5 h-5 text-primary" />
                          </div>
                          <div className="flex-1">
                            <h3 className="font-semibold text-foreground mb-1">
                              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold mr-2">
                                {item.step}
                              </span>
                              {item.title}
                            </h3>
                            <p className="text-sm text-muted-foreground">{item.description}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Key Features ──────────────────────────────────────────────────── */}
      <section className="py-12">
        <div className="container mx-auto px-4 max-w-3xl">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.3 }}>
            <div className="mb-8">
              <h2 className="text-2xl font-bold mb-2">Key Features</h2>
              <p className="text-muted-foreground">Powerful capabilities to handle complex content migration scenarios:</p>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              {[
                {
                  icon: Zap,
                  title: "CSS Selector Mapping",
                  description: "Pinpoint exactly what to extract from any page with familiar CSS selectors.",
                  color: "text-yellow-600",
                  bg: "bg-yellow-50",
                },
                {
                  icon: Database,
                  title: "All Field Types",
                  description: "Plain text, rich text, images, links, references — all handled correctly.",
                  color: "text-blue-600",
                  bg: "bg-blue-50",
                },
                {
                  icon: GitBranch,
                  title: "Auto References",
                  description: "Categories & tags are looked up or created in referenced collections automatically.",
                  color: "text-purple-600",
                  bg: "bg-purple-50",
                },
                {
                  icon: FileText,
                  title: "CSV Export",
                  description: "Download a CSV mapping each source URL to its new Webflow CMS item URL.",
                  color: "text-green-600",
                  bg: "bg-green-50",
                },
                {
                  icon: Clock,
                  title: "Batch Processing",
                  description: "Import multiple URLs at once. Watch the progress as CMS Shift processes your content.",
                  color: "text-orange-600",
                  bg: "bg-orange-50",
                },
                {
                  icon: Globe,
                  title: "Global Support",
                  description: "Works with any website. Handles dynamic content, paginated lists, and complex structures.",
                  color: "text-cyan-600",
                  bg: "bg-cyan-50",
                },
              ].map((feature, idx) => {
                const Icon = feature.icon;
                return (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.4 + idx * 0.05 }}
                  >
                    <Card className="h-full hover:shadow-md transition-shadow">
                      <CardContent className="pt-6">
                        <div className={`w-10 h-10 ${feature.bg} rounded-lg flex items-center justify-center mb-4`}>
                          <Icon className={`w-5 h-5 ${feature.color}`} />
                        </div>
                        <h3 className="font-semibold text-foreground mb-2">{feature.title}</h3>
                        <p className="text-sm text-muted-foreground">{feature.description}</p>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Tips & Best Practices ──────────────────────────────────────────── */}
      <section className="py-12 bg-muted/30">
        <div className="container mx-auto px-4 max-w-3xl">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.4 }}>
            <div className="mb-8">
              <h2 className="text-2xl font-bold mb-2">Tips & Best Practices</h2>
              <p className="text-muted-foreground">Get the most out of CMS Shift:</p>
            </div>

            <div className="space-y-4">
              <Card>
                <CardContent className="pt-6">
                  <h3 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-primary" />
                    Use Developer Tools to Find Selectors
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Use your browser's Developer Tools (F12) to inspect HTML elements and identify the CSS selectors you need.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <h3 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-primary" />
                    Test with a Single URL First
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Always preview and test your selectors with a single URL before running batch imports on multiple URLs.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <h3 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-primary" />
                    Configure Reference Lookups
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    For category/tag fields, set up proper reference field configuration to avoid duplicate items. Define which field contains the lookup value.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <h3 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-primary" />
                    Exclude Unwanted Elements
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Use exclude selectors to filter out ads, navigation, or other unwanted content from your scraped data.
                  </p>
                </CardContent>
              </Card>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── CTA ────────────────────────────────────────────────────────────── */}
      <section className="py-12">
        <div className="container mx-auto px-4 max-w-3xl text-center">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.5 }}>
            <h2 className="text-2xl font-bold mb-4">Ready to Get Started?</h2>
            <p className="text-muted-foreground mb-8 max-w-md mx-auto">
              Head to the New Import section and start migrating your content to Webflow CMS.
            </p>
            <Link href="/extract">
              <Button size="lg" className="gap-2">
                Start New Import <ArrowRight className="w-5 h-5" />
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
