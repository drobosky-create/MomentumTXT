import type { KnipConfig } from "knip";

const config: KnipConfig = {
  entry: [
    "client/src/main.tsx",
    "server/index.ts",
    "shared/schema.ts",
    "shared/industryConfig.ts",
  ],
  project: [
    "client/src/**/*.{ts,tsx}",
    "server/**/*.ts",
    "shared/**/*.ts",
  ],
  ignore: [
    // shadcn/ui primitives — library layer, not all are directly imported by app code
    "client/src/components/ui/!(index).tsx",
    // use-mobile is consumed by ui/sidebar.tsx (which is in the ignored ui/ layer above)
    "client/src/hooks/use-mobile.tsx",
  ],
  ignoreBinaries: ["prettier", "eslint", "stylelint", "drizzle-kit", "depcheck"],
  ignoreExportsUsedInFile: true,
  ignoreDependencies: [
    // Used by shadcn/ui components internally (we ignore those files)
    "@radix-ui/*",
    "class-variance-authority",
    "clsx",
    "tailwind-merge",
    "tailwindcss-animate",
    "cmdk",
    "embla-carousel-react",
    "input-otp",
    "react-day-picker",
    "react-resizable-panels",
    "vaul",
    // Used by shadcn form wrappers (ui/form.tsx)
    "@hookform/resolvers",
    "react-hook-form",
    // Used by shadcn chart (ui/chart.tsx)
    "recharts",
    // Used via Tailwind/PostCSS pipeline, not imported directly
    "autoprefixer",
    "postcss",
    "tailwindcss",
    // Used via shadcn date picker (ui/calendar.tsx)
    "date-fns",
    // Build/runtime toolchain
    "@vitejs/*",
    "vite",
    "@typescript-eslint/*",
    "eslint-*",
    "@eslint/*",
    "typescript",
    "esbuild",
    "tsx",
    "drizzle-kit",
    // Animation library (may be used via CSS classes)
    "tw-animate-css",
    // Knip itself
    "knip",
  ],
};

export default config;
