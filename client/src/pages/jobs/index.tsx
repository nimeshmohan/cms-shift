import { Link } from "wouter";
import { useJobs } from "@/hooks/use-jobs";
import { format } from "date-fns";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw, PlayCircle, Plus } from "lucide-react";
import { Progress } from "@/components/ui/progress";

export default function JobsPage() {
  const { data: jobs, isLoading, error, refetch } = useJobs();

  if (isLoading) {
    return (
      <div className="p-8 flex justify-center items-center h-full">
        <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-destructive/10 text-destructive p-4 rounded-xl border border-destructive/20">
          Failed to load jobs.
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Jobs History</h1>
          <p className="text-muted-foreground mt-1">Track the status of your import jobs.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4 mr-2" /> Refresh
          </Button>
          <Link href="/">
            <Button className="shadow-lg shadow-primary/20">
              <Plus className="w-4 h-4 mr-2" /> New Import
            </Button>
          </Link>
        </div>
      </div>

      {!jobs?.length ? (
        <Card className="border-dashed border-2 bg-muted/10 text-center py-16">
          <CardContent>
            <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
              <PlayCircle className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-semibold mb-2">No jobs yet</h3>
            <p className="text-muted-foreground mb-6 max-w-sm mx-auto">You haven't run any import jobs. Start your first import to see it here.</p>
            <Link href="/">
              <Button>Start First Import</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {jobs.map((job) => {
            const progress = job.totalUrls > 0 ? (job.processed / job.totalUrls) * 100 : 0;
            
            return (
              <Card key={job.id} className="hover:shadow-md transition-shadow border-border/60">
                <CardContent className="p-6 flex flex-col md:flex-row md:items-center gap-6">
                  <div className="md:w-48 shrink-0">
                    <div className="text-sm text-muted-foreground mb-1">Job #{job.id}</div>
                    <div className="font-medium text-foreground">
                      {job.createdAt ? format(new Date(job.createdAt), "MMM d, yyyy HH:mm") : "Unknown date"}
                    </div>
                  </div>
                  
                  <div className="flex-1 space-y-3">
                    <div className="flex justify-between items-center text-sm">
                      <span className="font-semibold">{job.processed} / {job.totalUrls} URLs Processed</span>
                      <span className="text-muted-foreground font-mono">{Math.round(progress)}%</span>
                    </div>
                    <Progress value={progress} className="h-2" />
                    <div className="flex gap-4 text-sm text-muted-foreground">
                      <span className="text-emerald-500 font-medium">{job.successCount} Successful</span>
                      <span className="text-destructive font-medium">{job.errorCount} Failed</span>
                    </div>
                  </div>
                  
                  <div className="shrink-0 flex items-center gap-4">
                    <Badge variant={
                      job.status === 'completed' ? 'default' : 
                      job.status === 'failed' ? 'destructive' : 
                      'secondary'
                    } className="capitalize">
                      {job.status}
                    </Badge>
                    <Link href={`/jobs/${job.id}`}>
                      <Button variant="ghost">View Details</Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
