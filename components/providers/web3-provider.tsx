"use client";

import "@rainbow-me/rainbowkit/styles.css";

import {
  getDefaultWallets,
  RainbowKitProvider,
} from "@rainbow-me/rainbowkit";
import {
  configureChains,
  createConfig,
  WagmiConfig,
} from "wagmi";
import { jsonRpcProvider } from "wagmi/providers/jsonRpc";
import { publicProvider } from "wagmi/providers/public";
import type { Chain } from "wagmi";

import { APP_NAME } from "@/lib/brand";
import { ARC_TESTNET } from "@/lib/web3/arc";

const arcTestnet = {
  id: ARC_TESTNET.id,
  name: ARC_TESTNET.name,
  network: ARC_TESTNET.network,
  nativeCurrency: ARC_TESTNET.nativeCurrency,
  rpcUrls: {
    default: {
      http: [ARC_TESTNET.rpcUrl],
    },
    public: {
      http: [ARC_TESTNET.rpcUrl],
    },
  },
  blockExplorers: {
    default: {
      name: "ArcScan",
      url: ARC_TESTNET.blockExplorerUrl,
    },
  },
  testnet: true,
} as const satisfies Chain;

const { chains, publicClient, webSocketPublicClient } = configureChains(
  [arcTestnet],
  [
    jsonRpcProvider({
      rpc: (chain) => ({
        http: chain.rpcUrls.default.http[0],
      }),
    }),
    publicProvider(),
  ]
);

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "arcnest-dev";

const { connectors } = getDefaultWallets({
  appName: APP_NAME,
  projectId,
  chains,
});

const wagmiConfig = createConfig({
  autoConnect: true,
  connectors,
  publicClient,
  webSocketPublicClient,
});

export const Web3Provider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  return (
    <WagmiConfig config={wagmiConfig}>
      <RainbowKitProvider chains={chains}>
        {children}
      </RainbowKitProvider>
    </WagmiConfig>
  );
};
