import type { Metadata } from "next";
import "./globals.css";
import { AppShell } from "../components/app-shell";

export const metadata: Metadata = {
  title: "Franchise Manager",
  description: "Private Madden 27 franchise planning workspace for the allowlisted owner.",
};

const themeScript = `try{var t=localStorage.getItem("fm-theme");if(t==="dark"){document.documentElement.classList.add("dark")}}catch(e){}`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
