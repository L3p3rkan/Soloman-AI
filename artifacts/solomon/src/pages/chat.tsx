import { useState, useRef, useEffect } from "react";
import { useLocation, useSearch } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { 
  useGetOpenaiConversation, 
  useListOpenaiMessages, 
  getListOpenaiConversationsQueryKey,
  getListOpenaiMessagesQueryKey,
  useCreateOpenaiConversation,
  useDeleteOpenaiConversation
} from "@workspace/api-client-react";
import { ChatMessage } from "@/components/chat-message";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, BookOpen, Trash2, Loader2 } from "lucide-react";

export default function ChatPage() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const conversationIdStr = new URLSearchParams(search).get("id");
  const conversationId = conversationIdStr ? parseInt(conversationIdStr, 10) : null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: conversation, isLoading: isLoadingConversation } = useGetOpenaiConversation(conversationId || 0, { query: { enabled: !!conversationId } as any });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: messages = [], isLoading: isLoadingMessages } = useListOpenaiMessages(conversationId || 0, { query: { enabled: !!conversationId } as any });
  const deleteConversation = useDeleteOpenaiConversation();
  const createConversation = useCreateOpenaiConversation();
  
  const queryClient = useQueryClient();
  const scrollRef = useRef<HTMLDivElement>(null);

  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [optimisticMessage, setOptimisticMessage] = useState<{role: string, content: string} | null>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, streamingContent, optimisticMessage]);

  const handleDelete = () => {
    if (!conversationId) return;
    deleteConversation.mutate({ id: conversationId }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListOpenaiConversationsQueryKey() });
        setLocation("/");
      }
    });
  };

  const handleSend = async () => {
    if (!input.trim() || isStreaming) return;

    let targetId = conversationId;
    
    // Create new conversation if none exists
    if (!targetId) {
      try {
        const conv = await createConversation.mutateAsync({ data: { title: input.substring(0, 30) } });
        targetId = conv.id;
        queryClient.invalidateQueries({ queryKey: getListOpenaiConversationsQueryKey() });
        setLocation(`/?id=${conv.id}`, { replace: true });
      } catch (err) {
        console.error("Failed to create conversation");
        return;
      }
    }

    const messageContent = input;
    setInput("");
    setOptimisticMessage({ role: "user", content: messageContent });
    setIsStreaming(true);
    setStreamingContent("");

    try {
      const response = await fetch(`/api/openai/conversations/${targetId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: messageContent }),
      });

      if (!response.body) throw new Error("No response body");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const text = decoder.decode(value);
        const lines = text.split("\n");
        
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const json = JSON.parse(line.slice(6));
              if (json.done) break;
              if (json.content) {
                setStreamingContent(prev => prev + json.content);
              }
            } catch (e) {
              // Ignore parse errors on incomplete chunks
            }
          }
        }
      }
    } catch (error) {
      console.error("Streaming error:", error);
    } finally {
      setIsStreaming(false);
      setOptimisticMessage(null);
      setStreamingContent("");
      queryClient.invalidateQueries({ queryKey: getListOpenaiMessagesQueryKey(targetId) });
      queryClient.invalidateQueries({ queryKey: getListOpenaiConversationsQueryKey() });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <Layout>
      {/* Header */}
      {conversationId && (
        <header className="flex-shrink-0 h-14 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 flex items-center justify-between px-4 z-10 relative">
          <div className="font-serif font-medium truncate pr-4 text-foreground/80">
            {isLoadingConversation ? <div className="h-4 w-32 bg-muted rounded animate-pulse" /> : conversation?.title}
          </div>
          <Button variant="ghost" size="icon" onClick={handleDelete} className="text-muted-foreground hover:text-destructive shrink-0" data-testid="button-delete-chat">
            <Trash2 className="w-4 h-4" />
          </Button>
        </header>
      )}

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto" ref={scrollRef}>
        {!conversationId && !optimisticMessage ? (
          <div className="h-full flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-6">
              <BookOpen className="w-8 h-8 text-primary" />
            </div>
            <h2 className="font-serif text-2xl text-foreground mb-2">Seek Counsel</h2>
            <p className="max-w-md text-sm leading-relaxed">
              Bring your questions, burdens, or theological inquiries. Solomon will consult the scriptures to provide wisdom rooted in the Word.
            </p>
          </div>
        ) : isLoadingMessages && !optimisticMessage && messages.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="pb-32">
            {messages.map((msg) => (
              <ChatMessage 
                key={msg.id} 
                role={msg.role} 
                content={msg.content} 
                createdAt={msg.createdAt} 
              />
            ))}
            
            {optimisticMessage && (
              <ChatMessage role="user" content={optimisticMessage.content} />
            )}
            
            {isStreaming && (
              <ChatMessage 
                role="assistant" 
                content={streamingContent || "Solomon is meditating..."} 
                isStreaming={true}
              />
            )}
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-background via-background to-transparent pt-10">
        <div className="max-w-3xl mx-auto relative rounded-xl border bg-card shadow-lg focus-within:ring-1 focus-within:ring-primary/50 transition-all">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Seek wisdom..."
            className="min-h-[60px] max-h-[200px] w-full resize-none border-0 focus-visible:ring-0 rounded-xl bg-transparent py-4 pl-4 pr-14 text-base"
            data-testid="input-chat"
            disabled={isStreaming}
          />
          <Button 
            size="icon"
            className="absolute right-2 bottom-2 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground transition-all"
            onClick={handleSend}
            disabled={!input.trim() || isStreaming}
            data-testid="button-send"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </Layout>
  );
}
