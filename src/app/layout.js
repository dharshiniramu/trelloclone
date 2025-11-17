export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
// Removed PageTransition for better performance

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "TrelloClone - Organize work and life, together",
  description: "TrelloClone helps teams move work forward. Collaborate, manage projects, and reach new productivity peaks with our visual work management tool.",
  keywords: "project management, task management, collaboration, team work, kanban, trello alternative",
  authors: [{ name: "TrelloClone Team" }],
  robots: "index, follow",
  openGraph: {
    title: "TrelloClone - Organize work and life, together",
    description: "TrelloClone helps teams move work forward. Collaborate, manage projects, and reach new productivity peaks.",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "TrelloClone - Organize work and life, together",
    description: "TrelloClone helps teams move work forward. Collaborate, manage projects, and reach new productivity peaks.",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
