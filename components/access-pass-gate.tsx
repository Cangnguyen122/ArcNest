"use client";

import axios from "axios";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Coins, Gem, KeyRound, Loader2, Radio, ShieldCheck, Sparkles, Wallet } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAccount, useNetwork, usePublicClient, useSwitchNetwork, useWalletClient } from "wagmi";

import { Button } from "@/components/ui/button";
import { APP_NAME } from "@/lib/brand";
import { DOGECORD_ACCESS_PASS_ABI, ERC20_APPROVE_ABI } from "@/lib/web3/access-pass-abi";
import { ARC_TESTNET, DOGECORD_ACCESS_PASS } from "@/lib/web3/arc";
import styles from "./access-pass-gate.module.css";

const benefits = [
  {
    icon: Radio,
    label: "Arc House",
    description: "A shared realtime hub for every verified Arc pass holder.",
  },
  {
    icon: Sparkles,
    label: "Personal server",
    description: "Your own Discord-style room with invite links and channels.",
  },
  {
    icon: ShieldCheck,
    label: "Holder access",
    description: "Invites only work after wallet login and pass ownership.",
  },
];

export const AccessPassGate = () => {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const { chain } = useNetwork();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const { switchNetworkAsync } = useSwitchNetwork();
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState("");

  const isWrongNetwork = isConnected && chain?.id !== ARC_TESTNET.id;
  const hasContract = !!DOGECORD_ACCESS_PASS.contractAddress;

  const switchToArc = async () => {
    if (!switchNetworkAsync) {
      setError(`Switch your wallet to ${ARC_TESTNET.name} to continue.`);
      return false;
    }

    try {
      setError("");
      await switchNetworkAsync(ARC_TESTNET.id);
      return true;
    } catch (error) {
      console.log(error);
      setError(`Switch your wallet to ${ARC_TESTNET.name} to continue.`);
      return false;
    }
  };

  const buyContractPass = async () => {
    if (!address || !walletClient) {
      setError("Connect a wallet before minting.");
      return;
    }

    if (!DOGECORD_ACCESS_PASS.contractAddress || !DOGECORD_ACCESS_PASS.usdcAddress) {
      setError("Configure the NFT pass contract and USDC address before production checkout.");
      return;
    }

    const passContract = DOGECORD_ACCESS_PASS.contractAddress as `0x${string}`;
    const usdcContract = DOGECORD_ACCESS_PASS.usdcAddress as `0x${string}`;
    const price = BigInt(DOGECORD_ACCESS_PASS.priceUsdcUnits);

    const approveHash = await walletClient.writeContract({
      account: address,
      address: usdcContract,
      abi: ERC20_APPROVE_ABI,
      functionName: "approve",
      args: [passContract, price],
    });

    await publicClient.waitForTransactionReceipt({ hash: approveHash });

    const mintHash = await walletClient.writeContract({
      account: address,
      address: passContract,
      abi: DOGECORD_ACCESS_PASS_ABI,
      functionName: "mint",
    });

    await publicClient.waitForTransactionReceipt({ hash: mintHash });

    await axios.post("/api/access-pass/record", {
      txHash: mintHash,
    });
  };

  const activatePass = async () => {
    setIsLoading(true);
    setError("");

    try {
      if (isWrongNetwork) {
        const switched = await switchToArc();

        if (!switched) {
          return;
        }
      }

      if (hasContract) {
        await buyContractPass();
      } else {
        await axios.post("/api/access-pass/dev-claim");
      }

      router.refresh();
    } catch (error) {
      console.log(error);
      setError("Could not activate your Arc pass. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const syncExistingPass = async () => {
    setIsSyncing(true);
    setError("");

    try {
      await axios.post("/api/access-pass/sync");
      router.refresh();
    } catch (error) {
      console.log(error);
      setError("No minted pass was found for this wallet yet.");
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <section className={styles.preview}>
          <div className={styles.serverRail}>
            <div className={styles.serverIcon}>A</div>
            <div className={styles.serverDivider} />
            <div className={styles.serverIconMuted}>
              <Gem size={20} />
            </div>
            <div className={styles.serverIconMuted} />
            <div className={styles.serverIconMuted} />
          </div>

          <div className={styles.sidebar}>
            <div className={styles.sidebarHeader}>Arc House</div>
            <div className={styles.channelGroup}>
              <p className={styles.sectionLabel}>Text Channels</p>
              <div className={styles.channelActive}># welcome</div>
              <div className={styles.channel}># general</div>
              <div className={styles.channel}># nft-holders</div>
            </div>
            <div className={styles.channelGroup}>
              <p className={styles.sectionLabel}>Members</p>
              {["0xA4...19c0", "0x7B...a911", "0x31...02fe"].map((member) => (
                <div key={member} className={styles.member}>
                  <span className={styles.avatar} />
                  {member}
                </div>
              ))}
            </div>
          </div>

          <div className={styles.chat}>
            <div className={styles.chatHeader}>
              <span className={styles.hash}>#</span>
              welcome
              <span className={styles.liveBadge}>Live</span>
            </div>
            <div className={styles.chatBody}>
              <div className={styles.heroIcon}>A</div>
              <h1 className={styles.title}>Join Arc House. Build your own room after minting.</h1>
              <p className={styles.copy}>
                Buy the {APP_NAME} NFT pass for {DOGECORD_ACCESS_PASS.priceUsdc} USDC, enter the shared Arc House, then create invite-only servers for your own community.
              </p>

              <div className={styles.benefitList}>
                {benefits.map((item) => (
                  <div key={item.label} className={styles.benefit}>
                    <div className={styles.benefitIcon}>
                      <item.icon size={20} />
                    </div>
                    <div>
                      <p className={styles.benefitTitle}>{item.label}</p>
                      <p className={styles.benefitCopy}>{item.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className={styles.composer}>Message #welcome</div>
          </div>
        </section>

        <aside className={styles.panel}>
          <div className={styles.panelHead}>
            <div>
              <p className={styles.panelTitle}>Mint access</p>
              <p className={styles.panelCopy}>
                One pass unlocks Arc House and your personal server.
              </p>
            </div>
            <div className={styles.coinIcon}>
              <Coins size={21} />
            </div>
          </div>

          <div className={styles.facts}>
            <div className={styles.fact}>
              <span>Price</span>
              <strong>{DOGECORD_ACCESS_PASS.priceUsdc} USDC</strong>
            </div>
            <div className={styles.fact}>
              <span>Network</span>
              <strong>{ARC_TESTNET.name}</strong>
            </div>
            <div className={styles.fact}>
              <span>Wallet</span>
              <strong>{address || "Not connected"}</strong>
            </div>
            <div className={styles.fact}>
              <span>Mode</span>
              <strong>{hasContract ? "Contract mint" : "Dev pass"}</strong>
            </div>
          </div>

          <ConnectButton.Custom>
            {({
              account,
              chain,
              mounted,
              openAccountModal,
              openChainModal,
              openConnectModal,
            }) => {
              const ready = mounted;
              const connected = ready && account && chain;

              if (!connected) {
                return (
                  <Button
                    type="button"
                    variant="primary"
                    className={styles.actionButton}
                    disabled={!ready}
                    onClick={openConnectModal}
                  >
                    <Wallet size={16} />
                    Connect wallet
                  </Button>
                );
              }

              if (chain.unsupported || chain.id !== ARC_TESTNET.id) {
                return (
                  <Button
                    type="button"
                    variant="primary"
                    className={styles.actionButton}
                    onClick={openChainModal}
                  >
                    <Wallet size={16} />
                    Switch to {ARC_TESTNET.name}
                  </Button>
                );
              }

              return (
                <>
                  <button
                    type="button"
                    className={styles.connectedWalletButton}
                    onClick={openAccountModal}
                  >
                    <span className={styles.walletDot} />
                    {account.displayName}
                  </button>
                  <Button
                    type="button"
                    variant="primary"
                    className={styles.actionButton}
                    disabled={isLoading}
                    onClick={activatePass}
                  >
                    {isLoading ? <Loader2 size={16} /> : <KeyRound size={16} />}
                    {hasContract ? "Mint NFT pass" : "Activate dev NFT pass"}
                  </Button>
                </>
              );
            }}
          </ConnectButton.Custom>

          {isConnected && hasContract && !isWrongNetwork && (
            <button
              type="button"
              className={styles.syncButton}
              disabled={isSyncing}
              onClick={syncExistingPass}
            >
              {isSyncing ? "Syncing pass..." : "Already minted? Sync pass"}
            </button>
          )}

          {!isConnected && (
            <p className={styles.hint}>
              Connect and sign in with your wallet first. Then activate your pass here.
            </p>
          )}

          {error && (
            <p className={styles.error}>
              {error}
            </p>
          )}
        </aside>
      </div>
    </main>
  );
};
