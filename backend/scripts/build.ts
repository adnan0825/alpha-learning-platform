/**
 * Cross-platform build script.
 * Compiles TypeScript and copies SQL files to dist/ (works on Windows + Linux).
 *
 * Usage: tsx scripts/build.ts
 */

import fs from "fs";
import path from "path";
import { execSync } from "child_process";

async function main() {
  try {
    console.log("Building backend...\n");

    // Step 1: TypeScript compilation
    console.log("Step 1: Compiling TypeScript...");
    execSync("tsc", { stdio: "inherit", cwd: process.cwd() });
    console.log("✓ TypeScript compiled\n");

    // Step 2: Create dist/config directory if it doesn't exist
    console.log("Step 2: Creating dist/config directory...");
    const distConfigDir = path.join(process.cwd(), "dist", "config");
    if (!fs.existsSync(distConfigDir)) {
      fs.mkdirSync(distConfigDir, { recursive: true });
      console.log(`✓ Created: ${distConfigDir}`);
    } else {
      console.log(`✓ Already exists: ${distConfigDir}`);
    }
    console.log("");

    // Step 3: Copy SQL files from src/config to dist/config
    console.log("Step 3: Copying SQL files...");
    const srcConfigDir = path.join(process.cwd(), "src", "config");
    const sqlFiles = fs
      .readdirSync(srcConfigDir)
      .filter((f) => f.endsWith(".sql"));

    if (sqlFiles.length === 0) {
      console.log("  (no SQL files found in src/config)");
    } else {
      for (const file of sqlFiles) {
        const srcPath = path.join(srcConfigDir, file);
        const destPath = path.join(distConfigDir, file);
        fs.copyFileSync(srcPath, destPath);
        console.log(`  ✓ ${file}`);
      }
    }

    console.log("\n✓ Build complete");
    process.exit(0);
  } catch (err) {
    console.error("\n✗ Build failed:");
    console.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
  }
}

main();
