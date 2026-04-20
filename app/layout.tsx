import type { Metadata } from "next";
import { Geist } from "next/font/google";
import AtlasProvider from "./providers";
import "./globals.css";

const geist = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Atlas Incorporate",
  description: "Plateforme interne de gestion",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className="dark">
      <body className={`${geist.variable} font-sans antialiased`}>
        <AtlasProvider>{children}</AtlasProvider>
      </body>
    </html>
  );
}
