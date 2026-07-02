import type { Metadata } from "next";
import { Orbitron, Inter, JetBrains_Mono, Source_Serif_4 } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth";

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
  icons: {
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🖧</text></svg>",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" className={`${orbitron.variable} ${inter.variable} ${jetbrainsMono.variable} ${sourceSerif.variable}`} suppressHydrationWarning>
      <body className="antialiased min-h-screen" suppressHydrationWarning style={{ backgroundColor: "#0a0f1e", color: "#f1f5f9" }}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
