import type React from "react"
import type { Metadata } from "next"
import { Quicksand } from "next/font/google"
import "./globals.css"

const quicksand = Quicksand({
  subsets: ["latin"],
  display: "swap",
})

export const metadata: Metadata = {
  title: "Plant Guardian | Smart Plant Monitoring",
  description: "Monitor and care for your plants with precision using IoT sensors",
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={quicksand.className}>{children}</body>
    </html>
  )
}
