import type { Metadata, Viewport } from "next"
import { Plus_Jakarta_Sans, Cairo } from "next/font/google"
import "./globals.css"
import { Providers } from "./providers"
import { Toaster } from "@/components/ui/toaster"

const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-jakarta" })
const cairo   = Cairo({ subsets: ["arabic", "latin"], variable: "--font-cairo", display: "swap" })

export const metadata: Metadata = {
  title: "MediStock — Medication Management",
  description: "Track and manage patient medications, schedules, and inventory.",
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" dir="ltr">
      <body className={`${jakarta.variable} ${cairo.variable} ${jakarta.className}`}>
        <Providers>
          {children}
          <Toaster />
        </Providers>
      </body>
    </html>
  )
}
