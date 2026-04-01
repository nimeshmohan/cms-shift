import { useRoute } from "wouter";
import { useJob } from "@/hooks/use-jobs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import {
  ArrowLeft, CheckCircle2, AlertCircle, Clock, Link as LinkIcon,
  Download, FileSpreadsheet, RefreshCw,
} from "lucide-react";
import type { JobLog } from "@shared/routes";

// ── CSV helpers ───────────────────────────────────────────────────────────────

function escCsv(v: string) {
  if (v.includes(",") || v.includes('"') || v.includes("\n")) {
    return `"${v.replace(/"/g, '""')}"`;
  }
  return v;
}

function buildCsv(logs: any[]): string {
  const rows: string[] = ["Source URL,Status,Webflow Item ID,Webflow Slug,Error"];
  for (const log of logs) {
    rows.push([
      escCsv(log.url || ""),
      escCsv(log.status || ""),
      escCsv(log.webflowItemId || ""),
      escCsv(log.webflowSlug || ""),
      escCsv(log.message || ""),
    ].join(","));
  }
  return rows.join("\n");
}

function downloadCsv(csv: string, filename: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function JobViewPage() {
  const [, params] = useRoute("/jobs/:id");
  const jobId = params?.id || "";
  const { data: job, isLoading, error } = useJob(jobId);

  if (isLoading) {
    return (
      <div className="p-8 max-w-5xl mx-auto space-y-5 animate-pulse">
        <div className="h-10 bg-muted rounded w-1/4" />
        <div className="h-48 bg-muted rounded-xl" />
        <div className="h-96 bg-muted rounded-xl" />
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="p-8">
        <div className="bg-destructive/10 text-destructive p-4 rounded-xl border border-destructive/20">
          Job not found.
        </div>
      </div>
    );
  }

  const progress = job.totalUrls > 0 ? (job.processed / job.totalUrls) * 100 : 0;
  const isRunning = job.status === "pending" || job.status === "processing";
  const logs = (job.logs as any[]) || [];
  const successLogs = logs.filter((l) => l.status === "success");
  const errorLogs = logs.filter((l) => l.status === "error");

  const handleDownloadCsv = () => {
    const csv = buildCsv(logs);
    downloadCsv(csv, `webflow-import-job-${job.id}.csv`);
  };

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 space-y-7">

      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Link href="/jobs">
            <Button variant="ghost" size="icon" className="rounded-full shrink-0">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-3">
              Import Job #{job.id}
              {isRunning && (
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-primary" />
                </span>
              )}
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Status: <span className="capitalize font-semibold text-foreground">{job.status}</span>
              {isRunning && <span className="ml-2 text-xs text-primary animate-pulse">Processing…</span>}
            </p>
          </div>
        </div>

        {/* CSV download — shown when at least one success */}
        {successLogs.length > 0 && (
          <Button onClick={handleDownloadCsv} className="gap-2 shrink-0" variant="outline">
            <FileSpreadsheet className="w-4 h-4 text-green-600" />
            Download CSV
            <Badge className="bg-green-100 text-green-700 border-green-200 text-xs ml-1">{successLogs.length} rows</Badge>
          </Button>
        )}
      </div>

      {/* Stats */}
      <Card className="border-border/60 shadow-sm overflow-hidden">
        <CardContent className="p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {[
              { label: "Total URLs",  value: job.totalUrls,    icon: LinkIcon,     cls: "bg-secondary/50 border-border/50",              textCls: "" },
              { label: "Success",     value: job.successCount, icon: CheckCircle2, cls: "bg-emerald-50 border-emerald-100",               textCls: "text-emerald-700" },
              { label: "Failed",      value: job.errorCount,   icon: AlertCircle,  cls: "bg-red-50 border-red-100",                       textCls: "text-red-700" },
              { label: "Processed",   value: job.processed,    icon: Clock,        cls: "bg-blue-50 border-blue-100",                     textCls: "text-blue-700" },
            ].map((s) => (
              <div key={s.label} className={`${s.cls} p-4 rounded-xl border`}>
                <div className={`flex items-center gap-2 text-xs font-bold uppercase tracking-wider mb-2 ${s.textCls || "text-muted-foreground"}`}>
                  <s.icon className="w-3.5 h-3.5" /> {s.label}
                </div>
                <div className={`text-3xl font-bold ${s.textCls}`}>{s.value}</div>
              </div>
            ))}
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-semibold">
              <span>Progress</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-3 rounded-full" />
          </div>
        </CardContent>
      </Card>

      {/* CSV info banner when complete */}
      {job.status === "completed" && successLogs.length > 0 && (
        <div className="rounded-xl border border-green-200 bg-green-50 p-4 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-start gap-3">
            <FileSpreadsheet className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-green-800 text-sm">Import complete — CSV ready</p>
              <p className="text-xs text-green-700 mt-0.5">
                {successLogs.length} item{successLogs.length !== 1 ? "s" : ""} imported successfully.
                Download the CSV to see each source URL mapped to its Webflow CMS item slug.
              </p>
            </div>
          </div>
          <Button onClick={handleDownloadCsv} size="sm" className="bg-green-600 hover:bg-green-700 text-white gap-2 shrink-0">
            <Download className="w-4 h-4" /> Download CSV
          </Button>
        </div>
      )}

      {/* Logs */}
      <Card className="border-border/60">
        <CardHeader className="bg-muted/20 border-b border-border/40 flex flex-row items-center justify-between py-3 px-5">
          <CardTitle className="text-base">Execution Logs</CardTitle>
          <div className="flex items-center gap-2">
            {successLogs.length > 0 && <Badge className="bg-green-50 text-green-700 border-green-200">{successLogs.length} success</Badge>}
            {errorLogs.length > 0 && <Badge className="bg-red-50 text-red-700 border-red-200">{errorLogs.length} failed</Badge>}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {logs.length === 0 ? (
            <div className="p-10 text-center text-muted-foreground text-sm">
              {isRunning ? (
                <span className="flex items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin" /> Waiting for first result…
                </span>
              ) : "No logs generated."}
            </div>
          ) : (
            <div className="divide-y divide-border/40 max-h-[600px] overflow-auto">
              {logs.map((log: any, idx: number) => (
                <div key={idx} className="p-4 flex flex-col md:flex-row md:items-start gap-3 hover:bg-muted/10 transition-colors">
                  {/* Status badge */}
                  <div className="shrink-0">
                    {log.status === "success"
                      ? <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white w-20 justify-center text-xs">Success</Badge>
                      : <Badge variant="destructive" className="w-20 justify-center text-xs">Error</Badge>}
                  </div>

                  {/* URL + message */}
                  <div className="flex-1 min-w-0 space-y-1">
                    <p className="text-sm font-mono text-foreground truncate" title={log.url}>{log.url}</p>
                    {log.message && (
                      <p className="text-xs text-red-600 bg-red-50 px-2 py-1 rounded border border-red-100">{log.message}</p>
                    )}
                    {log.webflowSlug && (
                      <p className="text-xs text-muted-foreground">
                        Webflow slug: <code className="bg-muted px-1.5 py-0.5 rounded font-mono text-foreground">{log.webflowSlug}</code>
                      </p>
                    )}
                  </div>

                  {/* Item ID pill */}
                  {log.webflowItemId && (
                    <div className="shrink-0 text-[10px] font-mono bg-secondary px-2 py-1.5 rounded border text-muted-foreground leading-tight">
                      <span className="text-[9px] uppercase font-bold block text-muted-foreground/70 mb-0.5">Item ID</span>
                      {log.webflowItemId.substring(0, 12)}…
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

    </div>
  );
}
