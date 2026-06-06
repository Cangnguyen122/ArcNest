import { ACCESS_PASS_NAME } from "@/lib/brand";

export const ARC_TESTNET = {
  id: 5042002,
  name: "Arc Testnet",
  network: "arc-testnet",
  nativeCurrency: {
    name: "USDC",
    symbol: "USDC",
    decimals: 18,
  },
  rpcUrl: process.env.NEXT_PUBLIC_ARC_TESTNET_RPC_URL || "https://rpc.testnet.arc.network",
  blockExplorerUrl: "https://testnet.arcscan.app",
  faucetUrl: "https://faucet.circle.com",
} as const;

export const DOGECORD_ACCESS_PASS = {
  chainId: ARC_TESTNET.id,
  contractAddress: process.env.NEXT_PUBLIC_ACCESS_PASS_CONTRACT_ADDRESS || "",
  usdcAddress: process.env.NEXT_PUBLIC_USDC_CONTRACT_ADDRESS || "",
  priceUsdc: process.env.NEXT_PUBLIC_ACCESS_PASS_PRICE_USDC || "10",
  priceUsdcUnits: process.env.NEXT_PUBLIC_ACCESS_PASS_PRICE_USDC_UNITS || "10000000",
  name: ACCESS_PASS_NAME,
} as const;

export const ARCNEST_PAY = {
  chainId: ARC_TESTNET.id,
  currency: ARC_TESTNET.nativeCurrency.symbol,
  isNative: true,
  usdcAddress: process.env.NEXT_PUBLIC_USDC_CONTRACT_ADDRESS || "",
  usdcDecimals: ARC_TESTNET.nativeCurrency.decimals,
} as const;

export const normalizeAddress = (address: string) => {
  return address.trim().toLowerCase();
};

export const isArcTestnetChain = (chainId: number) => {
  return chainId === ARC_TESTNET.id;
};

export const arcExplorerTxUrl = (txHash: string) => {
  return `${ARC_TESTNET.blockExplorerUrl}/tx/${txHash}`;
};
