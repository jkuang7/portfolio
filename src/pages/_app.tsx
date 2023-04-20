import { type AppType } from "next/app"
import { ClerkProvider } from "@clerk/nextjs"

import { api } from "~/utils/api"
import { Analytics } from "@vercel/analytics/react"

import "~/styles/globals.css"

const MyApp: AppType = ({ Component, pageProps }) => {
  return (
    <ClerkProvider {...pageProps}>
      <Component {...pageProps} />
      <Analytics />
    </ClerkProvider>
  )
}

export default api.withTRPC(MyApp)
