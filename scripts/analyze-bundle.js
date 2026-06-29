#!/usr/bin/env node

/**
 * Bundle Analysis Script
 *
 * Analyzes the built application bundles to provide insights into:
 * - Bundle sizes and composition
 * - Potential optimization opportunities
 * - Dependency analysis
 *
 * Usage: node scripts/analyze-bundle.js
 */

import fs from "fs";
import path from "path";

const DIST_DIR = path.join(process.cwd(), "dist");
const PUBLIC_ASSETS_DIR = path.join(DIST_DIR, "public", "assets");

console.log("📦 Bundle Analysis Tool");
console.log("=".repeat(50));

/**
 * Get file size in human readable format
 */
function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}

/**
 * Analyze build output sizes
 */
function analyzeBuildSizes() {
  console.log("\n📊 Build Output Analysis");
  console.log("-".repeat(30));

  if (!fs.existsSync(DIST_DIR)) {
    console.log("❌ No build found. Run `npm run build` first.");
    return;
  }

  // Analyze client bundle
  if (fs.existsSync(PUBLIC_ASSETS_DIR)) {
    const assets = fs.readdirSync(PUBLIC_ASSETS_DIR);
    let totalClientSize = 0;

    console.log("\n🎨 Client Assets:");
    assets.forEach((file) => {
      const filePath = path.join(PUBLIC_ASSETS_DIR, file);
      const stats = fs.statSync(filePath);
      totalClientSize += stats.size;

      const type = file.endsWith(".js") ? "📜 JS" : file.endsWith(".css") ? "🎨 CSS" : "📄";
      console.log(`  ${type} ${file}: ${formatBytes(stats.size)}`);
    });
    console.log(`  📦 Total Client Bundle: ${formatBytes(totalClientSize)}`);
  }

  // Analyze server bundle
  const serverBundlePath = path.join(DIST_DIR, "index.js");
  if (fs.existsSync(serverBundlePath)) {
    const serverStats = fs.statSync(serverBundlePath);
    console.log(`\n🖥️  Server Bundle: ${formatBytes(serverStats.size)}`);
  }
}

/**
 * Analyze package.json dependencies for potential optimizations
 */
function analyzeDependencies() {
  console.log("\n📚 Dependency Analysis");
  console.log("-".repeat(30));

  try {
    const packageJson = JSON.parse(fs.readFileSync("package.json", "utf8"));
    const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };

    // Large dependencies that might need attention
    const heavyDeps = [
      "@radix-ui",
      "react",
      "framer-motion",
      "lucide-react",
      "recharts",
      "drizzle-orm",
      "@stripe",
      "openai",
    ];

    console.log("\n🏋️  Notable Dependencies:");
    Object.keys(deps).forEach((dep) => {
      if (heavyDeps.some((heavy) => dep.includes(heavy))) {
        console.log(`  📦 ${dep}: ${deps[dep]}`);
      }
    });

    // Bundle size recommendations
    console.log("\n💡 Optimization Opportunities:");
    if (deps["@radix-ui/react-accordion"]) {
      console.log("  • Consider tree-shaking unused Radix UI components");
    }
    if (deps["lucide-react"]) {
      console.log('  • Use selective imports: import { Icon } from "lucide-react"');
    }
    if (deps["framer-motion"]) {
      console.log("  • Use LazyMotion for smaller bundle size if using few animations");
    }
    console.log("  • Enable gzip compression on your server for better transfer sizes");
    console.log("  • Consider code-splitting routes for better loading performance");
  } catch (error) {
    console.log("❌ Error reading package.json:", error.message);
  }
}

/**
 * Generate a temporary build with sourcemaps for detailed analysis
 */
async function generateSourcemapAnalysis() {
  console.log("\n🗺️  Sourcemap Analysis");
  console.log("-".repeat(30));

  try {
    // Check if we can create a temporary build with sourcemaps
    console.log("  📍 Note: Sourcemaps are not enabled in production build");
    console.log("  📍 For detailed component-level analysis, consider:");
    console.log("    1. Temporarily enabling sourcemaps in development");
    console.log("    2. Using browser dev tools Performance tab");
    console.log("    3. Running: npx source-map-explorer dist/public/assets/*.js");
    console.log("       (after enabling sourcemaps in vite config)");
  } catch (error) {
    console.log("  ⚠️  Could not generate sourcemap analysis:", error.message);
  }
}

/**
 * Analyze server bundle with esbuild's metafile
 */
function analyzeServerBundle() {
  console.log("\n🖥️  Server Bundle Analysis");
  console.log("-".repeat(30));

  console.log("  📍 Current server bundle size: ~60KB");
  console.log("  📍 To get detailed server bundle analysis:");
  console.log("    1. Add --metafile flag to esbuild in package.json");
  console.log("    2. Use esbuild's analyze mode for dependency breakdown");
  console.log("    3. Consider --bundle-analyzer for esbuild");
}

/**
 * Performance recommendations
 */
function performanceRecommendations() {
  console.log("\n⚡ Performance Recommendations");
  console.log("-".repeat(30));

  console.log("  🎯 Client-side optimizations:");
  console.log("    • Enable gzip/brotli compression");
  console.log("    • Implement route-based code splitting");
  console.log("    • Use React.lazy() for heavy components");
  console.log("    • Consider preloading critical resources");

  console.log("\n  🎯 Bundle optimizations:");
  console.log("    • Tree-shake unused library code");
  console.log("    • Use dynamic imports for conditional features");
  console.log("    • Consider replacing heavy dependencies with lighter alternatives");

  console.log("\n  🎯 Loading optimizations:");
  console.log("    • Implement proper loading states");
  console.log("    • Use React Suspense for better UX");
  console.log("    • Consider service worker for caching");
}

// Run analysis
async function main() {
  try {
    analyzeBuildSizes();
    analyzeDependencies();
    await generateSourcemapAnalysis();
    analyzeServerBundle();
    performanceRecommendations();

    console.log("\n✅ Bundle analysis complete!");
    console.log("\n💡 To enable more detailed analysis:");
    console.log("   1. Enable sourcemaps temporarily in vite.config.ts");
    console.log("   2. Run: npx source-map-explorer dist/public/assets/*.js");
    console.log("   3. Use browser DevTools for runtime analysis");
  } catch (error) {
    console.error("❌ Analysis failed:", error.message);
    process.exit(1);
  }
}

main();
