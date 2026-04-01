import { useState } from "react";
import { Link } from "wouter";
import { useTemplates, useDeleteTemplate } from "@/hooks/use-templates";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LayoutTemplate, Plus, Trash2, Database } from "lucide-react";
import { format } from "date-fns";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";

export default function TemplatesPage() {
  const { data: templates, isLoading } = useTemplates();
  const deleteTemplate = useDeleteTemplate();
  const { toast } = useToast();
  
  const [templateToDelete, setTemplateToDelete] = useState<number | null>(null);

  const handleDelete = async () => {
    if (!templateToDelete) return;
    try {
      await deleteTemplate.mutateAsync(templateToDelete);
      toast({ title: "Template deleted" });
    } catch (e: any) {
      toast({ title: "Failed to delete", description: e.message, variant: "destructive" });
    } finally {
      setTemplateToDelete(null);
    }
  };

  if (isLoading) {
    return <div className="p-8 animate-pulse text-muted-foreground">Loading templates...</div>;
  }

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Mapping Templates</h1>
          <p className="text-muted-foreground mt-1">Saved CSS selector configurations for your collections.</p>
        </div>
        <Link href="/">
          <Button className="shadow-lg shadow-primary/20">
            <Plus className="w-4 h-4 mr-2" /> Create via Import
          </Button>
        </Link>
      </div>

      {!templates?.length ? (
        <Card className="border-dashed border-2 bg-muted/10 text-center py-16">
          <CardContent>
            <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
              <LayoutTemplate className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-semibold mb-2">No templates saved</h3>
            <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
              You can save a template during the last step of creating a new import job.
            </p>
            <Link href="/">
              <Button>Start New Import</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map(tpl => {
            const rules = Array.isArray(tpl.mappingRules) ? tpl.mappingRules : [];
            
            return (
              <Card key={tpl.id} className="group hover:shadow-xl hover:border-primary/30 transition-all duration-300 flex flex-col">
                <CardHeader className="pb-4">
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-xl line-clamp-1" title={tpl.name}>{tpl.name}</CardTitle>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 -mt-2 -mr-2 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => setTemplateToDelete(tpl.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                  <CardDescription className="flex items-center gap-1.5 mt-2 text-primary/80 font-medium">
                    <Database className="w-3.5 h-3.5" />
                    {tpl.collectionName}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col">
                  <div className="flex-1 space-y-3">
                    <p className="text-sm font-semibold uppercase text-muted-foreground tracking-wider">
                      {rules.length} Fields Mapped
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {rules.slice(0, 4).map((r: any, i) => (
                        <span key={i} className="text-xs bg-secondary border border-border/50 px-2 py-1 rounded-md text-foreground">
                          {r.webflowFieldName}
                        </span>
                      ))}
                      {rules.length > 4 && (
                        <span className="text-xs bg-muted text-muted-foreground px-2 py-1 rounded-md">
                          +{rules.length - 4} more
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="pt-6 mt-4 border-t border-border/50 text-xs text-muted-foreground">
                    Created {tpl.createdAt ? format(new Date(tpl.createdAt), "MMM d, yyyy") : "Unknown date"}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <AlertDialog open={!!templateToDelete} onOpenChange={(open) => !open && setTemplateToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Template?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this mapping template. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
              onClick={handleDelete}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
