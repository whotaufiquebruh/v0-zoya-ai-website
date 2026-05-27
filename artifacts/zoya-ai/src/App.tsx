import { useEffect, useRef } from "react";
import { Switch, Route, Router as WouterRouter, useLocation, Redirect } from "wouter";
import { ClerkProvider, SignIn, SignUp, Show, useClerk } from "@clerk/react";
import { publishableKeyFromHost } from "@clerk/react/internal";
import { shadcn } from "@clerk/themes";
import NotFound from "@/pages/not-found";
import HomePage from "@/pages/home";
import ChatPage from "@/pages/chat";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

const clerkPubKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);

const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;

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
    socialButtonsPlacement: "top" as const,
    socialButtonsVariant: "blockButton" as const,
  },
  variables: {
    colorPrimary: "oklch(0.60 0.18 340)",
    colorForeground: "oklch(0.145 0 0)",
    colorMutedForeground: "oklch(0.45 0.02 320)",
    colorDanger: "oklch(0.55 0.22 25)",
    colorBackground: "oklch(1 0 0)",
    colorInput: "oklch(0.97 0.005 320)",
    colorInputForeground: "oklch(0.145 0 0)",
    colorNeutral: "oklch(0.87 0.006 320)",
    fontFamily: "'Geist', 'Inter', system-ui, sans-serif",
    borderRadius: "0.875rem",
  },
  elements: {
    rootBox: "w-full flex justify-center",
    cardBox: "bg-white rounded-3xl w-[420px] max-w-full overflow-hidden shadow-soft",
    card: "!shadow-none !border-0 !bg-transparent !rounded-none",
    footer: "!shadow-none !border-0 !bg-transparent !rounded-none",
    headerTitle: "text-foreground font-serif text-2xl font-semibold",
    headerSubtitle: "text-muted-foreground text-sm",
    socialButtonsBlockButtonText: "text-foreground font-medium text-sm",
    formFieldLabel: "text-foreground text-sm font-medium",
    footerActionLink: "text-pink-500 hover:text-pink-600 font-medium",
    footerActionText: "text-muted-foreground text-sm",
    dividerText: "text-muted-foreground text-xs",
    identityPreviewEditButton: "text-pink-500",
    formFieldSuccessText: "text-emerald-600 text-sm",
    alertText: "text-foreground text-sm",
    logoBox: "mb-2",
    logoImage: "h-10 w-auto",
    socialButtonsBlockButton: "border border-neutral-200 hover:border-pink-300 hover:bg-pink-50/50 transition-colors rounded-2xl",
    formButtonPrimary: "gradient-pink rounded-2xl font-semibold text-sm shadow-glow-pink hover:opacity-90 transition-opacity",
    formFieldInput: "rounded-xl border-neutral-200 bg-neutral-50 text-foreground focus:border-pink-300 focus:ring-pink-200",
    footerAction: "bg-neutral-50/80",
    dividerLine: "bg-neutral-200",
    alert: "rounded-xl border-red-100 bg-red-50",
    otpCodeFieldInput: "rounded-xl border-neutral-200 text-foreground",
    formFieldRow: "gap-2",
    main: "gap-4",
  },
};

function SignInPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center px-4"
      style={{ background: "linear-gradient(135deg, oklch(0.98 0.012 340) 0%, oklch(0.96 0.018 310) 100%)" }}>
      <SignIn
        routing="path"
        path={`${basePath}/sign-in`}
        signUpUrl={`${basePath}/sign-up`}
      />
    </div>
  );
}

function SignUpPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center px-4"
      style={{ background: "linear-gradient(135deg, oklch(0.98 0.012 340) 0%, oklch(0.96 0.018 310) 100%)" }}>
      <SignUp
        routing="path"
        path={`${basePath}/sign-up`}
        signInUrl={`${basePath}/sign-in`}
      />
    </div>
  );
}

function HomeRoute() {
  return (
    <>
      <Show when="signed-in">
        <Redirect to="/chat" />
      </Show>
      <Show when="signed-out">
        <HomePage />
      </Show>
    </>
  );
}

function ClerkQueryInvalidator() {
  const { addListener } = useClerk();
  const prevRef = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    return addListener(({ user }) => {
      const id = user?.id ?? null;
      prevRef.current = id;
    });
  }, [addListener]);
  return null;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={HomeRoute} />
      <Route path="/chat" component={ChatPage} />
      <Route path="/sign-in/*?" component={SignInPage} />
      <Route path="/sign-up/*?" component={SignUpPage} />
      <Route component={NotFound} />
    </Switch>
  );
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
            title: "Welcome back 💕",
            subtitle: "Zoya is waiting for you",
          },
        },
        signUp: {
          start: {
            title: "Meet Zoya 🌸",
            subtitle: "Create your account to start chatting",
          },
        },
      }}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <ClerkQueryInvalidator />
      <Router />
    </ClerkProvider>
  );
}

function App() {
  return (
    <WouterRouter base={basePath}>
      <ClerkProviderWithRoutes />
    </WouterRouter>
  );
}

export default App;
