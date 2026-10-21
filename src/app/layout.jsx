import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "@/styles/globals.css";

export const metadata = {
  title: "Coact",
  description: "SLAC Scientific Computing User Management Portal",
  icons: { icon: "/favicon.ico", apple: "/logo192.png" },
  manifest: "/manifest.json",
};

// Bootstrap (layered, legacy pages) and Tailwind (tw: prefix, new pages) load together so
// legacy components can still be embedded in new pages during the dual run (plan §8).
export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`} suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
