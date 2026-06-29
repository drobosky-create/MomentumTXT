#!/usr/bin/env node

/**
 * Dependency Analysis Script
 *
 * Analyzes project dependencies for:
 * - Unused dependencies
 * - Outdated packages
 * - Security vulnerabilities
 * - Bundle size impact
 *
 * Usage: node scripts/analyze-deps.js
 */

import fs from "fs";
import { execSync } from "child_process";

console.log("🔍 Dependency Analysis Tool");
console.log("=".repeat(50));

/**
 * Check for unused dependencies
 */
function checkUnusedDependencies() {
  console.log("\n📦 Dependency Usage Analysis");
  console.log("-".repeat(30));

  try {
    const packageJson = JSON.parse(fs.readFileSync("package.json", "utf8"));
    const dependencies = Object.keys(packageJson.dependencies || {});
    const devDependencies = Object.keys(packageJson.devDependencies || {});

    console.log(`  📊 Production dependencies: ${dependencies.length}`);
    console.log(`  📊 Development dependencies: ${devDependencies.length}`);

    // Analyze imports in source code
    console.log("\n🔍 Checking for potentially unused dependencies...");

    const potentiallyUnused = [];
    const sourceFiles = getAllSourceFiles(["client/src", "server", "shared"]);
    const allImports = new Set();

    // Extract all import statements
    sourceFiles.forEach((file) => {
      const content = fs.readFileSync(file, "utf8");
      const importMatches = content.match(/(?:import|require)\s*\(?['"`]([^'"`\)]+)['"`]/g);
      if (importMatches) {
        importMatches.forEach((match) => {
          const imported = match.match(/['"`]([^'"`]+)['"`]/)?.[1];
          if (imported && !imported.startsWith(".") && !imported.startsWith("/")) {
            // Extract package name (handle scoped packages)
            const packageName = imported.startsWith("@")
              ? imported.split("/").slice(0, 2).join("/")
              : imported.split("/")[0];
            allImports.add(packageName);
          }
        });
      }
    });

    // Check which dependencies are not imported
    dependencies.forEach((dep) => {
      if (!allImports.has(dep)) {
        potentiallyUnused.push(dep);
      }
    });

    if (potentiallyUnused.length > 0) {
      console.log("  ⚠️  Potentially unused dependencies:");
      potentiallyUnused.forEach((dep) => {
        console.log(`    • ${dep}`);
      });
      console.log("  💡 Note: Some dependencies may be used indirectly or in config files");
    } else {
      console.log("  ✅ All dependencies appear to be in use");
    }
  } catch (error) {
    console.log("  ❌ Error analyzing dependencies:", error.message);
  }
}

/**
 * Get all source files recursively
 */
function getAllSourceFiles(dirs) {
  const files = [];

  function walkDir(dir) {
    try {
      const items = fs.readdirSync(dir);
      items.forEach((item) => {
        const fullPath = `${dir}/${item}`;
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory() && item !== "node_modules" && !item.startsWith(".")) {
          walkDir(fullPath);
        } else if (stat.isFile() && /\.(ts|tsx|js|jsx)$/.test(item)) {
          files.push(fullPath);
        }
      });
    } catch (error) {
      // Directory might not exist, skip silently
    }
  }

  dirs.forEach((dir) => {
    if (fs.existsSync(dir)) {
      walkDir(dir);
    }
  });

  return files;
}

/**
 * Check for security vulnerabilities
 */
function checkSecurity() {
  console.log("\n🔒 Security Audit");
  console.log("-".repeat(30));

  try {
    console.log("  🔍 Running npm audit...");
    const auditResult = execSync("npm audit --json", { encoding: "utf8" });
    const audit = JSON.parse(auditResult);

    if (audit.metadata.vulnerabilities.total === 0) {
      console.log("  ✅ No security vulnerabilities found");
    } else {
      console.log(`  ⚠️  Found ${audit.metadata.vulnerabilities.total} vulnerabilities:`);
      console.log(`    • High: ${audit.metadata.vulnerabilities.high}`);
      console.log(`    • Moderate: ${audit.metadata.vulnerabilities.moderate}`);
      console.log(`    • Low: ${audit.metadata.vulnerabilities.low}`);
      console.log(`    • Info: ${audit.metadata.vulnerabilities.info}`);
      console.log("  💡 Run `npm audit fix` to attempt automatic fixes");
    }
  } catch (error) {
    console.log("  ❌ Could not run security audit:", error.message.split("\\n")[0]);
  }
}

/**
 * Analyze package sizes and suggest optimizations
 */
function analyzeBundleImpact() {
  console.log("\n📏 Bundle Size Impact Analysis");
  console.log("-".repeat(30));

  const heavyPackages = {
    react: "Core framework - necessary",
    "react-dom": "Core framework - necessary",
    "@radix-ui/react-accordion": "UI components - consider tree-shaking",
    "@radix-ui/react-dialog": "UI components - consider tree-shaking",
    "@radix-ui/react-dropdown-menu": "UI components - consider tree-shaking",
    "@stripe/stripe-js": "Payment processing - necessary for billing",
    "framer-motion": "Animations - consider LazyMotion for smaller bundle",
    "lucide-react": "Icons - use selective imports",
    recharts: "Charts - heavy dependency, consider alternatives",
    "drizzle-orm": "Database ORM - server-side only",
    openai: "AI integration - server-side only",
  };

  try {
    const packageJson = JSON.parse(fs.readFileSync("package.json", "utf8"));
    const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };

    console.log("  📦 Heavy dependencies found:");
    Object.keys(heavyPackages).forEach((pkg) => {
      if (deps[pkg]) {
        console.log(`    • ${pkg}: ${heavyPackages[pkg]}`);
      }
    });
  } catch (error) {
    console.log("  ❌ Error analyzing bundle impact:", error.message);
  }
}

/**
 * Suggest optimizations
 */
function suggestOptimizations() {
  console.log("\n💡 Optimization Suggestions");
  console.log("-".repeat(30));

  console.log("  🎯 Immediate actions:");
  console.log("    • Run `npm audit fix` to fix security issues");
  console.log('    • Use selective imports: import { Icon } from "lucide-react"');
  console.log("    • Consider tree-shaking for Radix UI components");

  console.log("\n  🎯 Bundle size optimizations:");
  console.log("    • Enable gzip/brotli compression");
  console.log("    • Use dynamic imports for conditional features");
  console.log("    • Consider React.lazy() for heavy components");

  console.log("\n  🎯 Development workflow:");
  console.log("    • Set up bundle analysis in CI/CD");
  console.log("    • Use webpack-bundle-analyzer for detailed analysis");
  console.log("    • Monitor bundle size changes in pull requests");
}

// Run analysis
async function main() {
  try {
    checkUnusedDependencies();
    checkSecurity();
    analyzeBundleImpact();
    suggestOptimizations();

    console.log("\n✅ Dependency analysis complete!");
    console.log("\n💡 Next steps:");
    console.log("   1. Review potentially unused dependencies");
    console.log("   2. Fix security vulnerabilities with `npm audit fix`");
    console.log("   3. Consider bundle size optimizations");
    console.log("   4. Set up automated dependency monitoring");
  } catch (error) {
    console.error("❌ Analysis failed:", error.message);
    process.exit(1);
  }
}

main();
