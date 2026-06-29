# Code Hygiene Guide

This project uses automated tools to maintain code quality and consistency. This guide explains the hygiene practices and how to use them.

## Quick Start

### Run All Checks

```bash
./scripts/hygiene-check.sh
```

### Auto-Fix Issues

```bash
./scripts/hygiene-fix.sh
```

### Analyze Code Quality

```bash
./scripts/analyze-code.sh
```

## Tools & Configuration

### 1. **Prettier** - Code Formatting

- **Config**: `.prettierrc`
- **Ignore**: `.prettierignore`
- **Run**: `npx prettier --write "**/*.{ts,tsx,js,jsx,json,css,md}"`
- **Check**: `npx prettier --check "**/*.{ts,tsx,js,jsx,json,css,md}"`

### 2. **ESLint** - Code Linting

- **Config**: `.eslintrc.json`
- **Features**:
  - Automatically removes unused imports
  - Detects unused variables
  - Enforces TypeScript best practices
  - React hooks rules
- **Run**: `npx eslint . --ext .ts,.tsx,.js,.jsx --fix`

### 3. **Stylelint** - CSS Linting

- **Config**: `.stylelintrc.json`
- **Features**: Tailwind CSS support
- **Run**: `npx stylelint "**/*.css" --fix`

### 4. **TypeScript** - Type Checking

- **Config**: `tsconfig.json`
- **Run**: `npx tsc --noEmit`

### 5. **ts-prune** - Find Unused Exports

- **Run**: `npx ts-prune`
- **Purpose**: Identifies unused exports across the codebase

### 6. **depcheck** - Find Unused Dependencies

- **Run**: `npx depcheck`
- **Purpose**: Finds dependencies in package.json that aren't being used
- **Note**: Output must be reviewed manually; the tool doesn't fail the build

### 7. **Drizzle Kit** - Database Schema Validation

- **Run**: `npx drizzle-kit check`
- **Purpose**: Validates database schema consistency

## NPM Scripts to Add

Add these scripts to your `package.json`:

```json
{
  "scripts": {
    "lint": "eslint . --ext .ts,.tsx,.js,.jsx --max-warnings=0",
    "lint:fix": "eslint . --ext .ts,.tsx,.js,.jsx --fix",
    "format": "prettier --write \"**/*.{ts,tsx,js,jsx,json,css,md}\"",
    "format:check": "prettier --check \"**/*.{ts,tsx,js,jsx,json,css,md}\"",
    "style": "stylelint \"**/*.css\" --fix",
    "type-check": "tsc --noEmit",
    "analyze:deps": "depcheck --ignores=\"@types/*,eslint-*,@typescript-eslint/*,@vitejs/*,vite,postcss,autoprefixer,tailwindcss\"",
    "analyze:unused": "ts-prune --error",
    "analyze:bundle": "source-map-explorer dist/**/*.js --html analyze-bundle.html",
    "hygiene": "npm run format:check && npm run lint && npm run type-check && npm run analyze:deps",
    "hygiene:fix": "npm run format && npm run lint:fix && npm run style"
  }
}
```

## Continuous Integration

A GitHub Actions workflow is configured in `.github/workflows/code-quality.yml` that runs on every pull request and push to main/develop branches.

The workflow checks:

- Code formatting
- ESLint rules
- TypeScript compilation
- CSS styles
- Database schema
- Dependency usage
- Security vulnerabilities

## Best Practices

### Before Committing

1. Run `./scripts/hygiene-fix.sh` to auto-fix common issues
2. Run `./scripts/hygiene-check.sh` to verify all checks pass
3. Fix any remaining issues manually
4. Commit your changes

### During Development

1. Enable format-on-save in your editor (VS Code settings included)
2. Fix ESLint warnings as they appear
3. Keep files under 300-400 lines (split large files)
4. Remove unused imports and code regularly

### Periodic Maintenance

Run `./scripts/analyze-code.sh` monthly to:

- Find unused exports
- Identify unused dependencies
- Check bundle size
- Run security audits

## Code Organization Guidelines

### File Structure

```
client/src/
  ├── components/ui/      # Shared UI components
  ├── features/           # Feature-specific code (future)
  │   ├── kpis/          # KPI-related components
  │   ├── sms/           # SMS-related components
  │   └── team/          # Team-related components
  ├── lib/               # Utilities and helpers
  └── pages/             # Route pages

server/
  ├── services/          # Business logic
  ├── routes.ts          # API routes
  └── storage.ts         # Data layer

shared/
  └── schema.ts          # Database schema and types
```

### Naming Conventions

- **Hooks**: `use` prefix (e.g., `useKpiData`)
- **Services**: `Service` suffix (e.g., `TwilioService`)
- **Schemas**: `Schema` suffix (e.g., `insertKpiSchema`)
- **Components**: PascalCase (e.g., `KpiCard`)
- **Files**: kebab-case (e.g., `kpi-config.tsx`)

### File Size Guidelines

- Keep files under 300-400 lines
- Split large components into smaller pieces
- Use feature folders for related code
- Extract reusable logic into hooks/utilities

## Database Hygiene

### Schema Management

1. All changes go through `shared/schema.ts`
2. Review generated migrations before applying
3. Use `npm run db:push` to sync schema
4. Run `npx drizzle-kit check` to validate

### Naming Conventions

- snake_case for column names
- Singular table names
- Descriptive names, avoid abbreviations

## Security

### Automated Checks

- `npm audit` runs in CI to detect vulnerabilities
- Keep dependencies updated regularly
- Review security warnings promptly

### Secret Management

- Never commit secrets or API keys
- Use environment variables
- Leverage Replit integrations for key management

## Troubleshooting

### ESLint Issues

- If ESLint fails, run: `npx eslint . --ext .ts,.tsx,.js,.jsx --fix`
- Check `.eslintrc.json` for rule configuration
- Add `// eslint-disable-next-line` for exceptions (sparingly)

### Prettier Conflicts

- Prettier overrides ESLint formatting rules
- Run format before lint: `npm run format && npm run lint:fix`

### TypeScript Errors

- Run `npx tsc --noEmit` to see all errors
- Fix from the bottom up (later errors often cascade)
- Check `tsconfig.json` for strict mode settings

### Unused Dependencies

- depcheck may report false positives for dev dependencies
- Check if dependency is truly unused before removing
- Some dependencies are used by build tools indirectly

## Summary

This hygiene system ensures:

- ✅ Consistent code formatting
- ✅ No unused code or dependencies
- ✅ Type safety
- ✅ Best practice compliance
- ✅ Early bug detection
- ✅ Maintainable codebase

Run the hygiene scripts regularly to keep your codebase clean and maintainable!
