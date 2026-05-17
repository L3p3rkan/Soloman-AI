import { Link } from "wouter";
import { BookOpen, ScrollText, MessageSquare, Library } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/theme-provider";
import { Moon, Sun } from "lucide-react";

export default function LandingPage() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="min-h-dvh bg-background flex flex-col">
      {/* Top bar */}
      <header className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-2 text-primary">
          <BookOpen className="w-5 h-5" />
          <span className="font-serif font-bold text-lg tracking-tight">Solomon</span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
            {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </Button>
          <Link href="/sign-in">
            <Button variant="ghost" className="text-sm">Sign In</Button>
          </Link>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-16 text-center">
        <div className="max-w-2xl mx-auto space-y-10">
          {/* Icon */}
          <div className="flex justify-center">
            <div className="w-24 h-24 rounded-3xl bg-primary/10 flex items-center justify-center">
              <BookOpen className="w-12 h-12 text-primary" />
            </div>
          </div>

          {/* Headline */}
          <div className="space-y-4">
            <h1 className="font-serif text-5xl md:text-6xl font-bold text-foreground tracking-tight">
              Seek Wisdom.<br />Find Scripture.
            </h1>
            <p className="text-lg text-muted-foreground leading-relaxed max-w-md mx-auto">
              Solomon is an AI counselor grounded in the Word. Ask your questions, bring your burdens — receive answers rooted in scripture.
            </p>
          </div>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/sign-up">
              <Button size="lg" className="w-full sm:w-auto gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-8">
                <ScrollText className="w-4 h-4" />
                Begin Your Journey
              </Button>
            </Link>
            <Link href="/sign-in">
              <Button size="lg" variant="outline" className="w-full sm:w-auto px-8">
                Sign In
              </Button>
            </Link>
          </div>

          {/* Features */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
            <div className="flex flex-col items-center gap-2 p-4 rounded-xl bg-card border border-border">
              <MessageSquare className="w-6 h-6 text-primary" />
              <p className="text-sm font-medium text-foreground">Scripture-backed answers</p>
              <p className="text-xs text-muted-foreground">Every response grounded in the Word</p>
            </div>
            <div className="flex flex-col items-center gap-2 p-4 rounded-xl bg-card border border-border">
              <Library className="w-6 h-6 text-primary" />
              <p className="text-sm font-medium text-foreground">Multiple Bible versions</p>
              <p className="text-xs text-muted-foreground">Upload KJV, NIV, ESV and more</p>
            </div>
            <div className="flex flex-col items-center gap-2 p-4 rounded-xl bg-card border border-border">
              <ScrollText className="w-6 h-6 text-primary" />
              <p className="text-sm font-medium text-foreground">Saved conversations</p>
              <p className="text-xs text-muted-foreground">Return to past counsels anytime</p>
            </div>
          </div>
        </div>
      </main>

      {/* Scripture footer */}
      <footer className="text-center px-6 py-8">
        <p className="text-sm text-muted-foreground font-serif italic">
          "If any of you lacks wisdom, let him ask God, who gives generously to all." — James 1:5
        </p>
      </footer>
    </div>
  );
}
