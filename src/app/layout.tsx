import type { Metadata } from "next";
import "./globals.css";
import { Navbar } from "@/components/Navbar";

export const metadata: Metadata = {
  title: "Dermabichos — Gestão da Creche Canina",
  description: "Sistema de acompanhamento diário, rotina, relatórios e portal dos tutores da creche canina Dermabichos",
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" }
    ],
    shortcut: "/icon.svg",
    apple: "/icon.svg",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
      </head>
      <body className="min-h-screen flex flex-col bg-slate-50 text-[#25313B]">
        <Navbar />
        <main className="flex-1">{children}</main>
      </body>
    </html>
  );
}
