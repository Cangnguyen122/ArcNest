require("dotenv/config");

const { PrismaClient, AccessPassStatus } = require("@prisma/client");

const db = new PrismaClient();

const normalizeAddress = (address) => address?.toLowerCase();

async function main() {
  const currentContract = process.env.NEXT_PUBLIC_ACCESS_PASS_CONTRACT_ADDRESS;

  if (!currentContract) {
    throw new Error("Missing NEXT_PUBLIC_ACCESS_PASS_CONTRACT_ADDRESS");
  }

  const currentContractLower = normalizeAddress(currentContract);

  console.log("Current access pass contract:", currentContractLower);

  const result = await db.accessPass.updateMany({
    where: {
      status: AccessPassStatus.ACTIVE,
      contractAddressLower: {
        not: currentContractLower,
      },
    },
    data: {
      status: AccessPassStatus.REVOKED,
      revokedAt: new Date(),
    },
  });

  console.log(`Revoked ${result.count} old active access pass record(s).`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });