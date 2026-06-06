import './globals.css'
import type { Metadata } from 'next'

import { cn } from '@/lib/utils'
import { ThemeProvider } from '@/components/providers/theme-provider'
import { ModalProvider } from '@/components/providers/modal-provider'
import { SocketProvider } from '@/components/providers/socket-provider'
import { QueryProvider } from '@/components/providers/query-provider'
import { Web3Provider } from '@/components/providers/web3-provider'
import { APP_DESCRIPTION, APP_NAME } from '@/lib/brand'

export const metadata: Metadata = {
  title: `${APP_NAME} | Web3 Social Club`,
  description: APP_DESCRIPTION,
  icons: [
    { rel: "icon", url: "/arc-nest.png" }, ]
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={cn(
        "bg-white font-sans dark:bg-[#313338]"
      )}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          storageKey="arcnest-theme"
        >
          <Web3Provider>
            <SocketProvider>
              <ModalProvider />
              <QueryProvider>
                {children}
              </QueryProvider>
            </SocketProvider>
          </Web3Provider>
        </ThemeProvider>
      </body>
    </html>
  )
}
