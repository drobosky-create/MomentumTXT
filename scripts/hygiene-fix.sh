#!/bin/bash

# Code Hygiene Auto-Fix Script
# Automatically fix common code quality issues

echo "🔧 Auto-fixing code quality issues..."
echo ""

# 1. Format code
echo "📝 Formatting code..."
npx prettier --write "**/*.{ts,tsx,js,jsx,json,css,md}"
echo "✅ Code formatted"
echo ""

# 2. Fix ESLint issues
echo "🔍 Fixing ESLint issues..."
npx eslint . --ext .ts,.tsx,.js,.jsx --fix
echo "✅ ESLint auto-fixes applied"
echo ""

# 3. Fix style issues
echo "🎨 Fixing style issues..."
npx stylelint "**/*.css" --fix
echo "✅ Styles fixed"
echo ""

echo "✨ Auto-fix complete! Run ./scripts/hygiene-check.sh to verify."
