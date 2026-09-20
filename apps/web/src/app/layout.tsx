import type { Metadata } from "next";
import {
  Inter,
  Plus_Jakarta_Sans,
  JetBrains_Mono,
  Noto_Sans_Devanagari,
  Noto_Sans_Gurmukhi,
} from "next/font/google";
import { ThemeProvider } from "next-themes";
import { SessionProvider } from "@/components/auth/session-provider";
import { QueryProvider } from "@/components/providers/query-provider";
import { Toaster } from "sonner";
import "./globals.css";

// Node 25 experimental localStorage workaround: uninitialized globalThis.localStorage breaks libraries
if (
  typeof globalThis.localStorage !== "undefined" &&
  typeof (globalThis as unknown as Storage).getItem !== "function"
) {
  delete (globalThis as Record<string, unknown>).localStorage;
}

// ── Font loading via next/font/google ─────────────────────────────────────────
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-heading",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

const notoDevanagari = Noto_Sans_Devanagari({
  subsets: ["devanagari"],
  variable: "--font-devanagari",
  display: "swap",
});

const notoGurmukhi = Noto_Sans_Gurmukhi({
  subsets: ["gurmukhi"],
  variable: "--font-gurmukhi",
  display: "swap",
});

// ── Metadata & SEO ──────────────────────────────────────────────────────────
export const metadata: Metadata = {
  title: {
    default: "HostelHub — Find your place on campus",
    template: "%s | HostelHub",
  },
  description:
    "Fair, explainable hostel allocation and roommate matching — reviewed by wardens, transparent to every student.",
  metadataBase: new URL(process.env["APP_URL"] ?? "http://localhost:3000"),
  keywords: [
    "hostel allocation",
    "campus housing",
    "roommate matching",
    "student residence",
    "Gale-Shapley",
    "university dorms",
  ],
  authors: [{ name: "HostelHub Campus Systems" }],
  openGraph: {
    title: "HostelHub — Find your place on campus",
    description:
      "Fair, explainable hostel allocation and roommate matching — reviewed by wardens, transparent to every student.",
    url: "/",
    siteName: "HostelHub",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "HostelHub — Find your place on campus",
    description:
      "Fair, explainable hostel allocation and roommate matching — reviewed by wardens, transparent to every student.",
  },
};

// ── Root layout ───────────────────────────────────────────────────────────────
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${inter.variable} ${plusJakartaSans.variable} ${jetbrainsMono.variable} ${notoDevanagari.variable} ${notoGurmukhi.variable}`}
    >
      <body className="bg-background text-text antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange={false}
        >
          <SessionProvider>
            <QueryProvider>
              {children}
              <Toaster richColors position="bottom-right" />
            </QueryProvider>
          </SessionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
