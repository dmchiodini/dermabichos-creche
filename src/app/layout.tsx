import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Nunito } from "next/font/google";
import "./globals.css";
import { FeedbackProvider } from "@/components/ui/Feedback";

const nunito = Nunito({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-nunito",
});

// Títulos, nomes dos pets e números: grotesca com personalidade, contrasta com a Nunito arredondada.
const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-bricolage",
});

export const metadata: Metadata = {
  title: {
    default: "Dermabichos — Gestão da Creche Canina",
    template: "%s · Dermabichos",
  },
  description:
    "Sistema de acompanhamento diário, rotina, relatórios e portal dos responsáveis da creche canina Dermabichos",
  applicationName: "Dermabichos Creche",
  // Sistema interno: não deve aparecer em buscadores.
  robots: { index: false, follow: false },
  formatDetection: { telephone: false, email: false },
};

export const viewport: Viewport = {
  themeColor: "#CD8DA7",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${nunito.variable} ${bricolage.variable}`}>
      {/* Extensões do navegador (ex.: ColorZilla) injetam atributos no <body>; ignora só isso. */}
      <body className="min-h-dvh flex flex-col bg-paper text-ink" suppressHydrationWarning>
        <FeedbackProvider>
          <div className="flex-1 flex flex-col">{children}</div>
        </FeedbackProvider>
      </body>
    </html>
  );
}
