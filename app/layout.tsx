import type { Metadata, Viewport } from "next";
import { Orbitron, Inter, JetBrains_Mono, Source_Serif_4 } from "next/font/google";
import "./globals.css";
// Tách từ globals.css để tránh Next.js dev Turbopack truncate file CSS lớn (>220KB).
import "./globals-extra.css";
import "./toast.css";
import "./skeleton.css";
import "./spinner.css";
import "./theme-toggle.css";
import "./command-palette.css";
import "./online-indicator.css";
import { AuthProvider } from "@/lib/auth";
import { ToastProvider } from "@/components/ui/Toast";
import ThemeProvider from "@/components/ui/ThemeProvider";
import ErrorBoundary from "@/components/ui/ErrorBoundary";
import CommandPalette from "@/components/ui/CommandPalette";
import OnlineIndicator from "@/components/ui/OnlineIndicator";
import ChatLauncher from "@/components/chat/ChatLauncherClient";

const orbitron = Orbitron({
  variable: "--font-orbitron",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const sourceSerif = Source_Serif_4({
  variable: "--font-serif",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: "Trắc Nghiệm QTHTM",
  description: "Ứng dụng luyện thi trắc nghiệm Quản Trị Hệ Thống Mạng",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "QuizHub",
  },
  icons: {
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🖧</text></svg>",
  },
};

// themeColor was moved out of `metadata` (Next 15+ requires the dedicated
// `viewport` export so it isn't emitted as a `<meta name>`).
export const viewport: Viewport = {
  themeColor: "#3b82f6",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="vi"
      className={`${orbitron.variable} ${inter.variable} ${jetbrainsMono.variable} ${sourceSerif.variable}`}
      suppressHydrationWarning
    >
      <body className="antialiased min-h-screen" suppressHydrationWarning>
        <ThemeProvider>
          <ErrorBoundary>
            <ToastProvider>
              <AuthProvider>
                <CommandPalette />
                <OnlineIndicator />
                {children}
                <ChatLauncher />
              </AuthProvider>
            </ToastProvider>
          </ErrorBoundary>
        </ThemeProvider>
      </body>
    </html>
  );
}
