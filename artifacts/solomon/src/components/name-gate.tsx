import { useState } from "react";
import { useGetProfile, useUpsertProfile, getGetProfileQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

interface NameGateProps {
  children: React.ReactNode;
}

export function NameGate({ children }: NameGateProps) {
  const { data: profile, isLoading } = useGetProfile();
  const upsertProfile = useUpsertProfile();
  const queryClient = useQueryClient();

  const [name, setName] = useState("");
  const [error, setError] = useState("");

  if (isLoading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background">
        <div className="text-muted-foreground font-serif italic text-sm">Preparing your sanctuary…</div>
      </div>
    );
  }

  if (profile?.displayName) {
    return <>{children}</>;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Please enter your name so Solomon may address you.");
      return;
    }
    setError("");
    upsertProfile.mutate(
      { data: { displayName: trimmed } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetProfileQueryKey() });
        },
        onError: () => {
          setError("Something went wrong. Please try again.");
        },
      }
    );
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
            <svg className="w-8 h-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <h1 className="font-serif text-2xl text-foreground mb-2">Welcome, Seeker</h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Before we begin, Solomon would like to know your name so he may address you personally.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="display-name" className="block text-sm font-medium text-foreground mb-1.5">
              Your name
            </label>
            <input
              id="display-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your name…"
              autoFocus
              maxLength={100}
              className="w-full px-3 py-2.5 rounded-md border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary text-sm transition-colors"
            />
            {error && <p className="text-destructive text-xs mt-1.5">{error}</p>}
          </div>

          <button
            type="submit"
            disabled={upsertProfile.isPending}
            className="w-full py-2.5 px-4 rounded-md bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-60 transition-colors"
          >
            {upsertProfile.isPending ? "Saving…" : "Begin My Journey"}
          </button>
        </form>

        <p className="text-center text-xs text-muted-foreground mt-6 font-serif italic">
          "Ask and it will be given to you; seek and you will find." — Matthew 7:7
        </p>
      </div>
    </div>
  );
}
