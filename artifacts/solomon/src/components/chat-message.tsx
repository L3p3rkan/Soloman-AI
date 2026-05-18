import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { parseScripture } from "@/lib/parse-scripture";
import { BookOpen, User } from "lucide-react";
import { format } from "date-fns";

interface ChatMessageProps {
  role: string;
  content: string;
  createdAt?: string;
  isStreaming?: boolean;
}

export function ChatMessage({ role, content, createdAt, isStreaming }: ChatMessageProps) {
  const isUser = role === "user";

  return (
    <div className={`py-6 px-4 sm:px-8 ${isUser ? "bg-background" : "bg-card border-y"}`}>
      <div className="max-w-3xl mx-auto flex gap-4 sm:gap-6">
        <Avatar className={`w-8 h-8 sm:w-10 sm:h-10 border ${isUser ? "bg-secondary text-secondary-foreground" : "bg-primary text-primary-foreground border-primary-foreground/20"}`}>
          <AvatarFallback className="bg-transparent">
            {isUser ? <User className="w-5 h-5" /> : <BookOpen className="w-5 h-5" />}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 space-y-2 overflow-hidden">
          <div className="flex items-center gap-2">
            <span className="font-serif font-medium text-sm">
              {isUser ? "You" : "Solomon"}
            </span>
            {createdAt && (() => {
              try {
                const d = new Date(createdAt);
                return isNaN(d.getTime()) ? null : (
                  <span className="text-xs text-muted-foreground">
                    {format(d, "h:mm a")}
                  </span>
                );
              } catch {
                return null;
              }
            })()}
          </div>
          <div className="prose prose-sm sm:prose-base dark:prose-invert prose-p:leading-relaxed prose-pre:bg-muted/50 prose-pre:border max-w-none break-words">
            {isUser ? (
              <p className="whitespace-pre-wrap">{content}</p>
            ) : (
              <p className="whitespace-pre-wrap">{parseScripture(content)}</p>
            )}
            {isStreaming && (
              <span className="inline-block w-2 h-4 ml-1 bg-primary animate-pulse align-middle" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
