require("dotenv/config");

const hre = require("hardhat");

const requiredEnv = (key) => {
  const value = process.env[key];

  if (!value) {
    throw new Error(`${key} is required`);
  }

  return value;
};

async function main() {
  const [deployer] = await hre.ethers.getSigners();

  const usdc = requiredEnv("NEXT_PUBLIC_USDC_CONTRACT_ADDRESS");
  const treasury = process.env.ACCESS_PASS_TREASURY_ADDRESS || deployer.address;
  const price = BigInt(process.env.NEXT_PUBLIC_ACCESS_PASS_PRICE_USDC_UNITS || "10000000");
  const maxSupply = BigInt(process.env.ACCESS_PASS_MAX_SUPPLY || "10000");
  const sharedTokenUri =
    process.env.ACCESS_PASS_TOKEN_URI ||
    tokenUriFromBase(process.env.ACCESS_PASS_TOKEN_BASE_URI) ||
    "";

  const AccessPass = await hre.ethers.getContractFactory("ArcNestAccessPass");
  const accessPass = await AccessPass.deploy(
    usdc,
    treasury,
    price,
    maxSupply,
    sharedTokenUri
  );

  await accessPass.waitForDeployment();

  const address = await accessPass.getAddress();

  console.log("ArcNestAccessPass deployed");
  console.log("-------------------------");
  console.log(`Contract:  ${address}`);
  console.log(`USDC:      ${usdc}`);
  console.log(`Treasury:  ${treasury}`);
  console.log(`Price:     ${price.toString()}`);
  console.log(`MaxSupply: ${maxSupply.toString()}`);
  console.log(`Token URI: ${sharedTokenUri || "(empty)"}`);
  console.log("");
  console.log("Set this in .env:");
  console.log(`NEXT_PUBLIC_ACCESS_PASS_CONTRACT_ADDRESS=${address}`);
}

function tokenUriFromBase(baseUri) {
  if (!baseUri) {
    return "";
  }

  return baseUri.replace(/\/+$/, "");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
