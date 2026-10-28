import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Navbar } from "@/components/navbar";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: { default: "La Boutique", template: "%s · La Boutique" },
  description: "Boutique en ligne de créateurs indépendants.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fr" data-theme="boutique" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="bg-base-100 text-base-content flex min-h-full flex-col">
        <a href="#contenu" className="btn btn-sm btn-primary sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50">
          Aller au contenu
        </a>
        <Navbar />
        <main id="contenu" className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
          {children}
        </main>
        <footer className="footer footer-center bg-base-200 text-muted border-base-300 border-t p-6 text-sm">
          <p>La Boutique — application de démonstration. Aucun paiement réel n&apos;est effectué.</p>
        </footer>
      </body>
    </html>
  );
}
