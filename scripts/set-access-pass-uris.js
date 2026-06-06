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
  const contractAddress = requiredEnv("NEXT_PUBLIC_ACCESS_PASS_CONTRACT_ADDRESS");
  const tokenUri =
    process.env.ACCESS_PASS_TOKEN_URI ||
    tokenUriFromBase(requiredEnv("ACCESS_PASS_TOKEN_BASE_URI"));
  const contractUri = process.env.ACCESS_PASS_CONTRACT_URI || "";
  const accessPass = await hre.ethers.getContractAt("ArcNestAccessPass", contractAddress);

  await (await accessPass.setSharedTokenURI(tokenUri)).wait();

  if (contractUri) {
    await (await accessPass.setContractURI(contractUri)).wait();
  }

  console.log(`Updated token URI for ${contractAddress}`);
  console.log(`Token URI: ${tokenUri}`);
  console.log(`Contract URI: ${contractUri || "(unchanged)"}`);
}

function tokenUriFromBase(baseUri) {
  return baseUri.replace(/\/+$/, "");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
