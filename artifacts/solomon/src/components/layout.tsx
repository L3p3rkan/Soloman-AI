import { useState } from "react";
import { Link, useLocation } from "wouter";
import { BookOpen, Plus, Moon, Sun, Settings, Menu, LogOut, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { useListOpenaiConversations, useCreateOpenaiConversation } from "@workspace/api-client-react";
import { useTheme } from "./theme-provider";
import { useClerk, useUser } from "@clerk/react";
import { format } from "date-fns";

interface LayoutProps {
  children: React.ReactNode;
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const [location, setLocation] = useLocation();
  const { data: conversations = [], isLoading } = useListOpenaiConversations();
  const createConversation = useCreateOpenaiConversation();
  const { theme, setTheme } = useTheme();
  const { signOut } = useClerk();
  const { user } = useUser();

  const handleNewChat = () => {
    createConversation.mutate(
      { data: { title: "New Conversation" } },
      {
        onSuccess: (conv) => {
          setLocation(`/?id=${conv.id}`);
          onNavigate?.();
        },
      }
    );
  };

  const handleSignOut = () => {
    signOut({ redirectUrl: "/" });
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2 text-primary">
          <BookOpen className="w-5 h-5" />
          <h1 className="font-serif font-bold text-lg tracking-tight">Solomon</h1>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        >
          {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </Button>
      </div>

      <div className="p-3 flex-shrink-0">
        <Button
          className="w-full justify-start gap-2 bg-background border hover:bg-accent/50 text-foreground shadow-sm"
          variant="outline"
          onClick={handleNewChat}
          data-testid="button-new-chat"
        >
          <Plus className="w-4 h-4" />
          <span>New Contemplation</span>
        </Button>
      </div>

      <ScrollArea className="flex-1 px-3 min-h-0">
        <div className="space-y-1 pb-4">
          <div className="text-xs font-medium text-muted-foreground px-2 py-2 uppercase tracking-wider">
            Conversations
          </div>
          {isLoading ? (
            <div className="px-2 py-3 text-sm text-muted-foreground">Loading...</div>
          ) : conversations.length === 0 ? (
            <div className="px-2 py-3 text-sm text-muted-foreground italic font-serif">
              No history found.
            </div>
          ) : (
            conversations.map((conv) => {
              const isActive =
                location === "/" &&
                new URLSearchParams(window.location.search).get("id") === String(conv.id);
              return (
                <Link href={`/?id=${conv.id}`} key={conv.id}>
                  <div
                    className={`px-3 py-2 rounded-md cursor-pointer transition-colors text-sm truncate flex flex-col ${
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-accent text-sidebar-foreground"
                    }`}
                    data-testid={`link-conversation-${conv.id}`}
                    onClick={onNavigate}
                  >
                    <span className="truncate">{conv.title || "New Conversation"}</span>
                    <span
                      className={`text-[10px] opacity-70 mt-0.5 ${
                        isActive ? "text-primary-foreground" : "text-muted-foreground"
                      }`}
                    >
                      {format(new Date(conv.createdAt), "MMM d, yyyy")}
                    </span>
                  </div>
                </Link>
              );
            })
          )}
        </div>
      </ScrollArea>

      <div className="p-3 border-t flex-shrink-0 space-y-1">
        <Link href="/library">
          <Button
            variant={location === "/library" ? "secondary" : "ghost"}
            className="w-full justify-start gap-2"
            data-testid="link-library"
            onClick={onNavigate}
          >
            <Settings className="w-4 h-4" />
            Library Settings
          </Button>
        </Link>

        {/* User info + sign out */}
        <div className="flex items-center gap-2 px-2 py-2 rounded-md">
          <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
            <User className="w-3 h-3 text-primary" />
          </div>
          <span className="text-xs text-muted-foreground truncate flex-1">
            {user?.primaryEmailAddress?.emailAddress ?? user?.firstName ?? "Account"}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 flex-shrink-0 text-muted-foreground hover:text-destructive"
            onClick={handleSignOut}
            title="Sign out"
          >
            <LogOut className="w-3 h-3" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export function Layout({ children }: LayoutProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-dvh w-full bg-background">
      {/* Desktop sidebar */}
      <div className="hidden md:flex w-72 border-r bg-sidebar flex-col flex-shrink-0 h-full">
        <SidebarContent />
      </div>

      {/* Mobile sidebar */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="p-0 w-72 bg-sidebar border-r [&>button:first-child]:hidden">
          <SidebarContent onNavigate={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Mobile top bar */}
        <div className="md:hidden flex items-center gap-3 px-4 h-14 border-b bg-background flex-shrink-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-2 text-primary">
            <BookOpen className="w-4 h-4" />
            <span className="font-serif font-bold tracking-tight">Solomon</span>
          </div>
        </div>

        {/* Page content */}
        <main className="flex-1 flex flex-col min-h-0 overflow-hidden relative">
          {children}
        </main>
      </div>
    </div>
  );
}
