import { APP_NAME } from "@/lib/brand";

export const buildWalletLoginMessage = ({
  domain,
  address,
  chainId,
  nonce,
  statement,
  issuedAt,
  expiresAt,
}: {
  domain: string;
  address: string;
  chainId: number;
  nonce: string;
  statement: string;
  issuedAt: Date;
  expiresAt: Date;
}) => {
  return [
    `${domain} wants you to sign in to ${APP_NAME}.`,
    "",
    statement,
    "",
    `Address: ${address}`,
    `Chain ID: ${chainId}`,
    `Nonce: ${nonce}`,
    `Issued At: ${issuedAt.toISOString()}`,
    `Expires At: ${expiresAt.toISOString()}`,
  ].join("\n");
};

export const shortWalletAddress = (address: string) => {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};
