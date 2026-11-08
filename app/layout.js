import { Space_Grotesk, Inter } from "next/font/google";
import AccessGate from "../components/AccessGate";
import "./globals.css";

const display = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["500", "600", "700"],
});

const body = Inter({
  subsets: ["latin"],
  variable: "--font-body",
  weight: ["400", "500", "600", "700"],
});

export const metadata = {
  title: "MyPersonalAccess — Apna Phone, Apni Website",
  description:
    "Apne phone ki live camera, location aur device info apni website par dekho. Koi teesri app nahi — sirf tumhara apna phone, tumhara apna account.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${display.variable} ${body.variable} font-body bg-ink text-white min-h-screen`}>
        <AccessGate>{children}</AccessGate>
      </body>
    </html>
  );
}
