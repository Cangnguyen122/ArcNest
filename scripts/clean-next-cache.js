const fs = require("fs");
const path = require("path");

const projectRoot = path.resolve(__dirname, "..");
const nextDir = path.resolve(projectRoot, ".next");

if (!nextDir.startsWith(projectRoot + path.sep)) {
  throw new Error(`Refusing to remove path outside project: ${nextDir}`);
}

if (!fs.existsSync(nextDir)) {
  console.log(".next cache does not exist.");
  process.exit(0);
}

fs.rmSync(nextDir, {
  recursive: true,
  force: true,
});

console.log("Removed .next cache.");
