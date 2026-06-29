#!/bin/bash

# Code Hygiene Check Script
# Run this before committing code to ensure quality standards

echo "🧹 Running code hygiene checks..."
echo ""

# Track if any check fails
FAILED=0

# 1. Format check
echo "📝 Checking code formatting..."
if npx prettier --check "**/*.{ts,tsx,js,jsx,json,css,md}" --log-level warn; then
  echo "✅ Formatting check passed"
else
  echo "❌ Formatting issues found. Run: npx prettier --write \"**/*.{ts,tsx,js,jsx,json,css,md}\""
  FAILED=1
fi
echo ""

# 2. ESLint
echo "🔍 Running ESLint..."
if npx eslint . --ext .ts,.tsx,.js,.jsx; then
  echo "✅ ESLint passed (warnings are OK)"
else
  echo "❌ ESLint found errors. Run: npx eslint . --ext .ts,.tsx,.js,.jsx --fix"
  FAILED=1
fi
echo ""

# 3. TypeScript check
echo "📦 Checking TypeScript..."
if npx tsc --noEmit; then
  echo "✅ TypeScript check passed"
else
  echo "❌ TypeScript errors found"
  FAILED=1
fi
echo ""

# 4. Stylelint
echo "🎨 Checking styles..."
if npx stylelint "**/*.css"; then
  echo "✅ Style check passed"
else
  echo "❌ Style issues found. Run: npx stylelint \"**/*.css\" --fix"
  FAILED=1
fi
echo ""

# 5. Database schema check
echo "🗄️  Checking database schema..."
if npx drizzle-kit check; then
  echo "✅ Database schema is valid"
else
  echo "⚠️  Database schema has warnings"
fi
echo ""

# 6. Dependency check (informational only - may have false positives)
echo "📦 Analyzing dependencies..."
npx depcheck --ignores="@types/*,eslint-*,@typescript-eslint/*,@vitejs/*,vite,postcss,autoprefixer,tailwindcss,prettier,husky,lint-staged,stylelint*,depcheck,ts-prune" || true
echo "ℹ️  Dependency analysis complete (some tools may be reported as unused due to path aliases)"
echo ""

# Final result
if [ $FAILED -eq 0 ]; then
  echo "✨ All hygiene checks passed! Code is ready to commit."
  exit 0
else
  echo "💥 Some checks failed. Please fix the issues above before committing."
  exit 1
fi
