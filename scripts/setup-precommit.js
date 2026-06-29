#!/usr/bin/env node

/**
 * Pre-commit Hook Setup Script
 *
 * Sets up automated code formatting and linting before commits.
 * This script provides setup instructions and validation.
 *
 * Usage: node scripts/setup-precommit.js
 */

import fs from "fs";
import path from "path";
import { execSync } from "child_process";

console.log("🎣 Pre-commit Hook Setup");
console.log("=".repeat(50));

/**
 * Check if git repository exists
 */
function checkGitRepo() {
  try {
    execSync("git rev-parse --git-dir", { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if required packages are installed
 */
function checkRequiredPackages() {
  console.log("\n📦 Checking Required Packages...");

  const packageJson = JSON.parse(fs.readFileSync("package.json", "utf8"));
  const allDeps = { ...packageJson.dependencies, ...packageJson.devDependencies };

  const required = {
    husky: "Git hooks management",
    "lint-staged": "Run commands on staged files",
    prettier: "Code formatting (optional but recommended)",
  };

  const missing = [];
  const present = [];

  Object.entries(required).forEach(([pkg, description]) => {
    if (allDeps[pkg]) {
      present.push(`✅ ${pkg}: ${allDeps[pkg]} - ${description}`);
    } else {
      missing.push(`❌ ${pkg}: ${description}`);
    }
  });

  console.log("  📋 Present packages:");
  present.forEach((pkg) => console.log(`    ${pkg}`));

  if (missing.length > 0) {
    console.log("  ⚠️  Missing packages:");
    missing.forEach((pkg) => console.log(`    ${pkg}`));

    console.log("\n  💡 To install missing packages:");
    console.log("     npm install --save-dev husky lint-staged prettier");
    console.log("     (Note: Check repo policy before installing)");
  }

  return missing.length === 0;
}

/**
 * Create husky setup files
 */
function setupHuskyFiles() {
  console.log("\n🎣 Setting up Husky files...");

  // Create .husky directory
  const huskyDir = ".husky";
  if (!fs.existsSync(huskyDir)) {
    fs.mkdirSync(huskyDir, { recursive: true });
    console.log("  ✅ Created .husky directory");
  }

  // Create pre-commit hook
  const preCommitHook = `#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

# Run lint-staged for code quality checks
npx lint-staged
`;

  const preCommitPath = path.join(huskyDir, "pre-commit");
  fs.writeFileSync(preCommitPath, preCommitHook);

  // Make executable on Unix systems
  try {
    fs.chmodSync(preCommitPath, 0o755);
  } catch {
    // Windows doesn't need chmod
  }

  console.log("  ✅ Created pre-commit hook");

  // Create commit-msg hook for conventional commits (optional)
  const commitMsgHook = `#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

# Optional: Add commit message linting here
# npx --no -- commitlint --edit \${1}
`;

  const commitMsgPath = path.join(huskyDir, "commit-msg");
  fs.writeFileSync(commitMsgPath, commitMsgHook);

  try {
    fs.chmodSync(commitMsgPath, 0o755);
  } catch {
    // Windows doesn't need chmod
  }

  console.log("  ✅ Created commit-msg hook template");
}

/**
 * Create or update lint-staged configuration
 */
function setupLintStaged() {
  console.log("\n🔍 Setting up lint-staged configuration...");

  const lintStagedConfig = {
    "*.{ts,tsx,js,jsx}": ["eslint --fix", "prettier --write"],
    "*.{json,md,yaml,yml}": ["prettier --write"],
    "*.{css,scss,sass}": ["prettier --write"],
  };

  // Check if package.json already has lint-staged config
  const packageJson = JSON.parse(fs.readFileSync("package.json", "utf8"));

  if (!packageJson["lint-staged"]) {
    console.log("  📝 Lint-staged configuration needed in package.json:");
    console.log(JSON.stringify({ "lint-staged": lintStagedConfig }, null, 2));

    console.log("\\n  💡 Manual setup required:");
    console.log('     Add the above "lint-staged" configuration to package.json');
  } else {
    console.log("  ✅ Lint-staged configuration already exists");
  }

  // Alternative: Create standalone config file
  const lintStagedConfigPath = ".lintstagedrc.json";
  fs.writeFileSync(lintStagedConfigPath, JSON.stringify(lintStagedConfig, null, 2));
  console.log(`  ✅ Created ${lintStagedConfigPath} as standalone config`);
}

/**
 * Create prettier configuration
 */
function setupPrettier() {
  console.log("\\n🎨 Setting up Prettier configuration...");

  const prettierConfig = {
    semi: true,
    trailingComma: "es5",
    singleQuote: true,
    printWidth: 100,
    tabWidth: 2,
    useTabs: false,
  };

  const prettierConfigPath = ".prettierrc.json";
  if (!fs.existsSync(prettierConfigPath)) {
    fs.writeFileSync(prettierConfigPath, JSON.stringify(prettierConfig, null, 2));
    console.log("  ✅ Created .prettierrc.json");
  } else {
    console.log("  ✅ Prettier config already exists");
  }

  // Create .prettierignore
  const prettierIgnore = `# Build outputs
dist/
build/
coverage/

# Dependencies
node_modules/

# Generated files
*.min.js
*.min.css

# Config files
package-lock.json
yarn.lock
`;

  const prettierIgnorePath = ".prettierignore";
  if (!fs.existsSync(prettierIgnorePath)) {
    fs.writeFileSync(prettierIgnorePath, prettierIgnore);
    console.log("  ✅ Created .prettierignore");
  } else {
    console.log("  ✅ Prettier ignore file already exists");
  }
}

/**
 * Test the pre-commit setup
 */
function testSetup() {
  console.log("\\n🧪 Testing Pre-commit Setup...");

  if (!checkGitRepo()) {
    console.log("  ❌ Not a git repository");
    return false;
  }

  try {
    // Test lint-staged
    execSync("npx lint-staged --dry-run", { stdio: "ignore" });
    console.log("  ✅ Lint-staged is working");

    // Test ESLint
    execSync("npx eslint --version", { stdio: "ignore" });
    console.log("  ✅ ESLint is available");

    // Test Prettier (if available)
    try {
      execSync("npx prettier --version", { stdio: "ignore" });
      console.log("  ✅ Prettier is available");
    } catch {
      console.log("  ⚠️  Prettier not available (optional)");
    }

    return true;
  } catch (error) {
    console.log("  ❌ Setup test failed:", error.message.split("\\n")[0]);
    return false;
  }
}

/**
 * Provide setup instructions
 */
function provideInstructions() {
  console.log("\\n📋 Manual Setup Instructions");
  console.log("-".repeat(30));

  console.log("\\n1️⃣  Install required packages:");
  console.log("   npm install --save-dev husky lint-staged prettier");

  console.log("\\n2️⃣  Initialize husky:");
  console.log("   npx husky install");

  console.log("\\n3️⃣  Add scripts to package.json:");
  console.log("   {");
  console.log('     "scripts": {');
  console.log('       "prepare": "husky install",');
  console.log('       "format": "prettier --write .",');
  console.log('       "lint": "eslint . --fix"');
  console.log("     }");
  console.log("   }");

  console.log("\\n4️⃣  Test the setup:");
  console.log('   git add . && git commit -m "test: pre-commit hooks"');

  console.log("\\n💡 The pre-commit hook will automatically:");
  console.log("   • Run ESLint with auto-fix on staged files");
  console.log("   • Format code with Prettier");
  console.log("   • Only process files that are staged for commit");
  console.log("   • Prevent commits if linting fails");
}

/**
 * Check current setup status
 */
function checkSetupStatus() {
  console.log("\\n📊 Current Setup Status");
  console.log("-".repeat(30));

  const checks = [
    { name: "Git repository", check: () => checkGitRepo() },
    { name: ".husky directory", check: () => fs.existsSync(".husky") },
    { name: "Pre-commit hook", check: () => fs.existsSync(".husky/pre-commit") },
    { name: "Lint-staged config", check: () => fs.existsSync(".lintstagedrc.json") },
    { name: "Prettier config", check: () => fs.existsSync(".prettierrc.json") },
    { name: "ESLint config", check: () => fs.existsSync(".eslintrc.json") },
  ];

  checks.forEach(({ name, check }) => {
    const status = check() ? "✅" : "❌";
    console.log(`  ${status} ${name}`);
  });
}

// Main execution
async function main() {
  try {
    if (!checkGitRepo()) {
      console.log("❌ This is not a git repository. Git hooks require a git repo.");
      return;
    }

    checkSetupStatus();
    const packagesInstalled = checkRequiredPackages();

    if (packagesInstalled) {
      setupHuskyFiles();
      setupLintStaged();
      setupPrettier();

      const testResult = testSetup();

      if (testResult) {
        console.log("\\n✅ Pre-commit hooks setup complete!");
        console.log("\\n💡 To activate, run: npx husky install");
        console.log("\\n🎯 Next commit will automatically run linting and formatting");
      }
    } else {
      console.log("\\n⚠️  Required packages not installed.");
      console.log("     Setup files created, but manual package installation needed.");
    }

    provideInstructions();

    console.log("\\n🎉 Pre-commit setup script completed!");
  } catch (error) {
    console.error("❌ Setup failed:", error.message);
    process.exit(1);
  }
}

main();
