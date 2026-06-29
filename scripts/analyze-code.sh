#!/bin/bash

# Code Analysis Script
# Provides detailed insights into code quality and unused code

echo "📊 Analyzing codebase..."
echo ""

# 1. Find unused exports
echo "🔍 Checking for unused exports..."
echo "Running ts-prune..."
npx ts-prune | grep -v "(used in module)" || echo "✅ No obviously unused exports found"
echo ""

# 2. Check for unused dependencies
echo "📦 Checking for unused dependencies..."
npx depcheck --ignores="@types/*,eslint-*,@typescript-eslint/*,@vitejs/*,vite,postcss,autoprefixer,tailwindcss"
echo ""

# 3. Bundle size analysis (only after build)
if [ -d "dist" ]; then
  echo "📦 Analyzing bundle size..."
  npx source-map-explorer dist/**/*.js --html analyze-bundle.html || echo "⚠️  Bundle analysis skipped (no source maps)"
  if [ -f "analyze-bundle.html" ]; then
    echo "✅ Bundle analysis saved to analyze-bundle.html"
  fi
else
  echo "⚠️  No dist folder found. Run 'npm run build' first to analyze bundle size."
fi
echo ""

# 4. Security audit
echo "🔒 Running security audit..."
npm audit --audit-level=moderate
echo ""

echo "✨ Analysis complete!"
