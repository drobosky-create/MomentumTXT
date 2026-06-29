# Bundle Analysis Tools

This directory contains scripts for analyzing the application's bundle size, dependencies, and performance characteristics.

## Available Scripts

### 🔍 Bundle Analysis

```bash
node scripts/analyze-bundle.js
```

Analyzes the built application to provide insights into:

- Bundle sizes (client/server)
- Dependency composition
- Performance optimization opportunities
- Bundle size recommendations

**Current Results:**

- **Client Bundle**: ~510 KB (445 KB JS + 65 KB CSS)
- **Server Bundle**: ~60 KB
- **Key Finding**: Heavy Radix UI usage suggests tree-shaking opportunities

### 📦 Dependency Analysis

```bash
node scripts/analyze-deps.js
```

Analyzes project dependencies for:

- Potentially unused dependencies
- Security vulnerabilities
- Bundle size impact
- Optimization suggestions

### 🗺️ Advanced Source Map Analysis

```bash
# Enable sourcemaps first (temporary vite config change)
# Then run:
npx source-map-explorer dist/public/assets/*.js
```

## Key Optimization Opportunities Identified

### 🎯 Immediate Actions

1. **Tree-shake Radix UI components** - Only import used components
2. **Use selective imports** - `import { Icon } from "lucide-react"`
3. **Enable gzip compression** - Can reduce transfer size by ~70%
4. **Fix security vulnerabilities** - Run `npm audit fix`

### 🎯 Bundle Size Optimizations

1. **Route-based code splitting** - Load routes on demand
2. **Dynamic imports** - Load heavy features conditionally
3. **React.lazy()** - Lazy load heavy components
4. **LazyMotion** - Replace framer-motion for smaller bundles

### 🎯 Performance Optimizations

1. **Implement loading states** - Better perceived performance
2. **Use React Suspense** - Smoother loading transitions
3. **Service worker caching** - Faster repeat visits
4. **Preload critical resources** - Reduce initial load time

## Bundle Size Targets

- ✅ **Server Bundle**: 60 KB (excellent)
- ⚠️ **Client Bundle**: 510 KB (acceptable, room for improvement)
- 🎯 **Target**: <400 KB client bundle with optimizations

## Monitoring Recommendations

1. **Set up bundle size alerts** in CI/CD
2. **Track bundle size changes** in pull requests
3. **Regular dependency audits** for security and size
4. **Performance budgets** to prevent regression

## Usage in Development

1. **After each major dependency change**: Run bundle analysis
2. **Before releases**: Check for optimization opportunities
3. **Monthly**: Run dependency analysis for security updates
4. **Performance issues**: Use browser DevTools + these scripts

## Advanced Analysis

For more detailed analysis beyond these scripts:

1. **Webpack Bundle Analyzer**: Visual dependency tree
2. **Chrome DevTools**: Runtime performance profiling
3. **Lighthouse**: Overall performance scoring
4. **Bundle Buddy**: Duplicate dependency detection
