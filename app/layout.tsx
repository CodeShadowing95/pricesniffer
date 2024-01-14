import type { Metadata } from 'next'
import { Inter, Space_Grotesk } from 'next/font/google'
import './globals.css'

import { Navbar } from '@/components'

const inter = Inter({ subsets: ['latin'] })
const spaceGrotesk = Space_Grotesk({
    subsets: ['latin'],
    weight: ['300', '400', '500', '600', '700']
})

export const metadata: Metadata = {
  title: 'Pricesniffer | Home',
  description: 'Web scraping app for tracking articles prices from different e-commerce plateforms and propose the best prices for any article to save money on your online shopping.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
        <head>
            <link rel="shortcut icon" href="/assets/icons/logo.svg" type="image/x-icon" />
        </head>
        <body className={inter.className}>
            <main className="max-w-10xl mx-auto">
                <Navbar />
                {children}
            </main>
        </body>
    </html>
  )
}
