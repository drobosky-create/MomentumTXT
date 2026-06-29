# KPI SMS Dashboard - Design Guidelines

## Design Approach
**Dark Futuristic AI Aesthetic** - Drawing inspiration from Linear's clean data presentation, Stripe's sophisticated darkness, and modern AI interfaces (ChatGPT, Claude). This is a data-dense utility application requiring exceptional readability against dark backgrounds while maintaining that cutting-edge AI feel through strategic use of glass morphism and glowing accents.

## Core Design Elements

### Typography
- **Primary Font**: Inter (Google Fonts) - exceptional readability in dark mode
- **Monospace**: JetBrains Mono - for numerical KPI values, timestamps
- **Hierarchy**:
  - H1: 48px/56px, font-weight 700, letter-spacing -0.02em
  - H2: 36px/44px, font-weight 600
  - H3: 24px/32px, font-weight 600
  - Body: 16px/24px, font-weight 400
  - Small: 14px/20px, font-weight 400
  - Captions: 12px/16px, font-weight 500, uppercase tracking-wide
- **Color Treatment**: White text at 95% opacity for primary, 60% for secondary, 40% for tertiary

### Layout System
**Spacing Primitives**: Use Tailwind units of 2, 4, 6, 8, 12, 16, 20, 24 (p-2, m-4, gap-6, etc.)
- Dashboard grid: 16-column system on desktop, collapsing to 4-column on mobile
- Sidebar: Fixed 280px width with glass morphism backdrop
- Content area: max-width 1440px with responsive padding (px-6 mobile, px-12 desktop)
- Card spacing: gap-6 for grids, p-6 for card internals

### Component Library

**Glass Morphism Cards**:
- Background: rgba(255,255,255,0.05) with backdrop-blur-xl
- Border: 1px solid rgba(255,255,255,0.1)
- Shadow: 0 8px 32px rgba(0,0,0,0.4)
- Border-radius: 16px for main cards, 12px for nested elements

**KPI Display Cards**:
- Large numerical value (monospace, 32px-48px) with subtle blue glow on hover
- Metric label above (12px uppercase, 40% opacity)
- Trend indicator (arrow + percentage) with color-coded background pill
- Sparkline chart integrated below value (100px height)
- Micro-interactions: Subtle scale on hover (transform: scale(1.02))

**Navigation Sidebar**:
- Deep black background (#0a0a0a)
- Active state: Blue gradient left border (4px) + glass morphism background
- Icons: 20px, matched with Heroicons
- Group headers: 12px uppercase, 40% opacity, mt-8

**Chat Interface (AI Setup Agent)**:
- Fixed right panel (400px) or modal overlay on mobile
- Message bubbles: User (blue glow, right-aligned), AI (glass morphism, left-aligned)
- Input field: Glass morphism with glowing blue border on focus
- Typing indicator: Animated dots with blue pulse
- Suggested actions: Pill-shaped buttons with glass effect below input

**Data Tables**:
- Header row: Sticky, glass morphism background
- Row height: 56px with 1px separator (rgba(255,255,255,0.05))
- Hover state: Glass morphism background with blue left border
- Sortable columns: Chevron icons with rotation animation

**CTAs & Buttons**:
- Primary: Blue gradient (#3b82f6 to #2563eb), white text, subtle glow shadow
- Secondary: Glass morphism with blue border
- Danger: Red gradient with glow
- All buttons: 12px border-radius, px-6 py-3, font-weight 600
- Buttons on images: Backdrop-blur-md background

**SMS Preview Cards**:
- Phone mockup visual (320px width)
- Message content in monospace
- Timestamp and recipient info
- Send status indicator (delivered/pending/failed)

### Images

**Hero Section** (Dashboard Landing):
- Large background: Abstract circuit board pattern or neural network visualization with blue glow points (full-width, 60vh height, with gradient overlay from #0a0a0a)
- Position: Top of marketing page explaining the platform
- Treatment: Blur effect on bottom third for content overlay
- CTA buttons placed with backdrop-blur-md

**Dashboard View**:
- No hero needed - immediately show functional interface
- Data visualization charts throughout (use Chart.js or similar)
- Empty states: Minimalist illustrations with blue accent (max 200px)

**Onboarding Screens**:
- AI avatar icon (geometric, glowing blue outline, 80px)
- Progress indicators with animated blue fill
- Feature illustrations: Line art style with blue accent glow

### Additional Elements
- Loading states: Skeleton screens with animated blue shimmer
- Notifications: Toast style, glass morphism, slide-in from top-right
- Modals: Centered, glass morphism with backdrop-blur
- Form inputs: Glass borders, blue glow on focus, 12px radius
- Charts: Line/bar charts with blue gradients, grid lines at 10% opacity