import { Link, useLocation } from "wouter";
import { BookOpen, MessageSquare, Plus, Moon, Sun, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useListOpenaiConversations, useCreateOpenaiConversation } from "@workspace/api-client-react";
import { useTheme } from "./theme-provider";
import { format } from "date-fns";

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [location, setLocation] = useLocation();
  const { data: conversations = [], isLoading } = useListOpenaiConversations();
  const createConversation = useCreateOpenaiConversation();
  const { theme, setTheme } = useTheme();

  const handleNewChat = () => {
    createConversation.mutate(
      { data: { title: "New Conversation" } },
      {
        onSuccess: (conv) => {
          setLocation(`/?id=${conv.id}`);
        },
      }
    );
  };

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden">
      {/* Sidebar */}
      <div className="w-72 border-r bg-sidebar flex flex-col flex-shrink-0">
        <div className="p-4 border-b flex items-center justify-between">
          <div className="flex items-center gap-2 text-primary">
            <BookOpen className="w-5 h-5" />
            <h1 className="font-serif font-bold text-lg tracking-tight">Solomon</h1>
          </div>
          <Button variant="ghost" size="icon" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
            {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </Button>
        </div>

        <div className="p-3">
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

        <ScrollArea className="flex-1 px-3">
          <div className="space-y-1 pb-4">
            <div className="text-xs font-medium text-muted-foreground px-2 py-2 uppercase tracking-wider">
              Conversations
            </div>
            {isLoading ? (
              <div className="px-2 py-3 text-sm text-muted-foreground">Loading...</div>
            ) : conversations.length === 0 ? (
              <div className="px-2 py-3 text-sm text-muted-foreground italic font-serif">No history found.</div>
            ) : (
              conversations.map((conv) => {
                const isActive = location === "/" && new URLSearchParams(window.location.search).get("id") === String(conv.id);
                return (
                  <Link href={`/?id=${conv.id}`} key={conv.id}>
                    <div 
                      className={`px-3 py-2 rounded-md cursor-pointer transition-colors text-sm truncate flex flex-col ${isActive ? "bg-primary text-primary-foreground" : "hover:bg-accent text-sidebar-foreground"}`}
                      data-testid={`link-conversation-${conv.id}`}
                    >
                      <span className="truncate">{conv.title || "New Conversation"}</span>
                      <span className={`text-[10px] opacity-70 mt-0.5 ${isActive ? "text-primary-foreground" : "text-muted-foreground"}`}>
                        {format(new Date(conv.createdAt), "MMM d, yyyy")}
                      </span>
                    </div>
                  </Link>
                );
              })
            )}
          </div>
        </ScrollArea>

        <div className="p-3 border-t">
          <Link href="/library">
            <Button 
              variant={location === "/library" ? "secondary" : "ghost"} 
              className="w-full justify-start gap-2"
              data-testid="link-library"
            >
              <Settings className="w-4 h-4" />
              Library Settings
            </Button>
          </Link>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative h-full">
        {children}
      </main>
    </div>
  );
}
