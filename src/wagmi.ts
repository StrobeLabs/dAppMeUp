import { http, cookieStorage, createConfig, createStorage } from 'wagmi'
import { mainnet, sepolia, base } from 'wagmi/chains' // Added base import
import { coinbaseWallet, injected, walletConnect } from 'wagmi/connectors'

const baseRpcUrl = 'https://mainnet.base.org'



export function getConfig() {
  return createConfig({
    chains: [mainnet, sepolia, base], // Added base to chains array
    connectors: [
      injected(),
      coinbaseWallet(),
      walletConnect({ projectId: process.env.NEXT_PUBLIC_WC_PROJECT_ID! }),
    ],
    storage: createStorage({
      storage: cookieStorage,
    }),
    ssr: true,
    transports: {
      [mainnet.id]: http(),
      [sepolia.id]: http(),
      [base.id]: http(baseRpcUrl),
    },
  })
}

declare module 'wagmi' {
  interface Register {
    config: ReturnType<typeof getConfig>
  }
}
