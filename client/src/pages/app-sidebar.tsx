import { Link, useLocation } from "wouter";
import { FileBox, History, LayoutTemplate, Sparkles, LogOut, User, LogIn, BookOpen } from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

const navItems = [
  { title: "Dashboard",   url: "/jobs",       icon: History },
  { title: "New Import",  url: "/extract",    icon: FileBox },
  { title: "Templates",   url: "/templates",  icon: LayoutTemplate },
  { title: "Document",    url: "/document",   icon: BookOpen },
];

export function AppSidebar() {
  const [location] = useLocation();
  const { currentUser, userProfile, logout } = useAuth();
  const { toast } = useToast();

  const handleLogout = async () => {
    try {
      await logout();
      toast({ title: "Logged out", description: "You have been logged out successfully" });
    } catch {
      toast({ title: "Error", description: "Failed to log out", variant: "destructive" });
    }
  };

  return (
    <Sidebar>
      <SidebarHeader className="p-4 md:p-6">
        <Link href="/">
          <div className="flex items-center gap-3 font-bold text-xl text-primary cursor-pointer hover:opacity-80 transition-opacity">
            <div className="bg-primary/10 p-2 rounded-xl">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            CMShift
          </div>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs uppercase tracking-wider font-semibold text-muted-foreground mb-2">
            Workspace
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const isActive = item.exact
                  ? location === item.url
                  : location === item.url || location.startsWith(item.url + "/");
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      className="h-11 rounded-lg transition-all hover:bg-primary/5 active:bg-primary/10"
                    >
                      <Link href={item.url} className="flex items-center gap-3 px-3 w-full">
                        <item.icon className="w-5 h-5" />
                        <span className="font-medium">{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 border-t">
        {currentUser ? (
          /* ── Logged in: show user info + logout ── */
          <div className="space-y-3">
            <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-muted/50">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 shrink-0">
                <User className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {userProfile?.firstName
                    ? `${userProfile.firstName}${userProfile.lastName ? " " + userProfile.lastName : ""}`
                    : currentUser.displayName || "User"}
                </p>
                <p className="text-xs text-muted-foreground truncate">{currentUser.email}</p>
              </div>
            </div>
            <Button variant="outline" className="w-full justify-start gap-2" onClick={handleLogout}>
              <LogOut className="w-4 h-4" />
              Logout
            </Button>
          </div>
        ) : (
          /* ── Guest: show login + register ── */
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground px-1 pb-1">Sign in for unlimited access</p>
            <Link href="/login">
              <Button variant="default" className="w-full justify-start gap-2">
                <LogIn className="w-4 h-4" />
                Log In
              </Button>
            </Link>
            <Link href="/signup">
              <Button variant="outline" className="w-full justify-start gap-2">
                <User className="w-4 h-4" />
                Register Free
              </Button>
            </Link>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
