import { useEffect, useRef } from "react";
import { ErrorBoundary } from "@/components/error-boundary";
import { ClerkProvider, SignIn, SignUp, Show, useClerk } from "@clerk/react";
import { publishableKeyFromHost } from "@clerk/react/internal";
import { shadcn } from "@clerk/themes";
import { Switch, Route, useLocation, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import ChatPage from "@/pages/chat";
import LibraryPage from "@/pages/library";
import LandingPage from "@/pages/landing";
import NotFound from "@/pages/not-found";
import { NameGate } from "@/components/name-gate";

const queryClient = new QueryClient();

const clerkPubKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);

const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || "/"
    : path;
}

if (!clerkPubKey) {
  throw new Error("Missing VITE_CLERK_PUBLISHABLE_KEY");
}

const clerkAppearance = {
  theme: shadcn,
  cssLayerName: "clerk",
  options: {
    logoPlacement: "inside" as const,
    logoLinkUrl: basePath || "/",
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
    socialButtonsPlacement: "bottom" as const,
  },
  variables: {
    colorPrimary: "hsl(350, 40%, 30%)",
    colorForeground: "hsl(20, 15%, 15%)",
    colorMutedForeground: "hsl(20, 10%, 40%)",
    colorDanger: "hsl(0, 60%, 40%)",
    colorBackground: "hsl(40, 30%, 97%)",
    colorInput: "hsl(40, 20%, 85%)",
    colorInputForeground: "hsl(20, 15%, 15%)",
    colorNeutral: "hsl(40, 20%, 85%)",
    fontFamily: "'Inter', sans-serif",
    borderRadius: "0.3rem",
  },
  elements: {
    rootBox: "w-full flex justify-center",
    cardBox: "bg-[hsl(40,30%,97%)] rounded-xl w-[440px] max-w-full overflow-hidden shadow-lg border border-[hsl(40,20%,85%)]",
    card: "!shadow-none !border-0 !bg-transparent !rounded-none",
    footer: "!shadow-none !border-0 !bg-transparent !rounded-none",
    headerTitle: "font-serif text-[hsl(20,15%,15%)]",
    headerSubtitle: "text-[hsl(20,10%,40%)]",
    socialButtonsBlockButtonText: "text-[hsl(20,15%,15%)]",
    formFieldLabel: "text-[hsl(20,15%,15%)]",
    footerActionLink: "text-[hsl(350,40%,30%)] hover:text-[hsl(350,40%,22%)]",
    footerActionText: "text-[hsl(20,10%,40%)]",
    dividerText: "text-[hsl(20,10%,40%)]",
    identityPreviewEditButton: "text-[hsl(350,40%,30%)]",
    formFieldSuccessText: "text-green-700",
    alertText: "text-[hsl(20,15%,15%)]",
    logoBox: "mb-1",
    logoImage: "h-12 w-auto",
    socialButtonsBlockButton: "border border-[hsl(40,20%,85%)] bg-[hsl(40,33%,94%)] hover:bg-[hsl(40,25%,88%)]",
    formButtonPrimary: "bg-[hsl(350,40%,30%)] hover:bg-[hsl(350,40%,24%)]",
    formFieldInput: "border-[hsl(40,20%,85%)] bg-[hsl(40,33%,94%)] text-[hsl(20,15%,15%)]",
    footerAction: "",
    dividerLine: "bg-[hsl(40,20%,85%)]",
    alert: "",
    otpCodeFieldInput: "border-[hsl(40,20%,85%)]",
    formFieldRow: "",
    main: "",
  },
};

function SignInPage() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4">
      <SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} />
    </div>
  );
}

function SignUpPage() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4">
      <SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} />
    </div>
  );
}

function HomeRoute() {
  return (
    <>
      <Show when="signed-in">
        <NameGate>
          <ChatPage />
        </NameGate>
      </Show>
      <Show when="signed-out">
        <LandingPage />
      </Show>
    </>
  );
}

function LibraryRoute() {
  return (
    <>
      <Show when="signed-in">
        <NameGate>
          <LibraryPage />
        </NameGate>
      </Show>
      <Show when="signed-out">
        <Redirect to="/sign-in" />
      </Show>
    </>
  );
}

function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const qc = useQueryClient();
  const prevUserIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const unsubscribe = addListener(({ user }) => {
      const userId = user?.id ?? null;
      if (prevUserIdRef.current !== undefined && prevUserIdRef.current !== userId) {
        qc.clear();
      }
      prevUserIdRef.current = userId;
    });
    return unsubscribe;
  }, [addListener, qc]);

  return null;
}

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();

  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      appearance={clerkAppearance}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      localization={{
        signIn: {
          start: {
            title: "Welcome back, Seeker",
            subtitle: "Continue your journey with Solomon",
          },
        },
        signUp: {
          start: {
            title: "Begin Your Journey",
            subtitle: "Create an account to save your conversations",
          },
        },
      }}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <ClerkQueryClientCacheInvalidator />
        <ThemeProvider defaultTheme="light" storageKey="solomon-theme">
          <TooltipProvider>
            <Switch>
              <Route path="/" component={HomeRoute} />
              <Route path="/sign-in/*?" component={SignInPage} />
              <Route path="/sign-up/*?" component={SignUpPage} />
              <Route path="/library" component={LibraryRoute} />
              <Route component={NotFound} />
            </Switch>
            <Toaster />
          </TooltipProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <WouterRouter base={basePath}>
        <ClerkProviderWithRoutes />
      </WouterRouter>
    </ErrorBoundary>
  );
}

export default App;
