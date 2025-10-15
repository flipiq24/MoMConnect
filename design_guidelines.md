# Meeting of the Minds (MoM) - Design Guidelines

## Design Approach
**Selected Framework**: Material Design with dashboard-focused customization  
**Rationale**: This is a utility-focused, information-dense real estate analysis platform where data accuracy, form clarity, and decision-making speed are critical. Material Design provides the structured patterns needed for complex forms and data visualization while maintaining professional credibility.

**Key Design Principles**:
- **Data Clarity First**: Every visual decision prioritizes readability and quick comprehension
- **Status-Driven Color**: Use color purposefully to communicate risk levels and decision status
- **Progressive Disclosure**: Layer complexity - show essential info upfront, details on demand
- **Trust Through Professionalism**: Clean, structured layouts that inspire confidence in financial decisions

---

## Core Design Elements

### A. Color Palette

**Primary Colors**:
- Brand Primary: `231 84% 53%` (Indigo 600 - professional, trustworthy)
- Primary Hover: `231 84% 46%` (Indigo 700)
- Primary Light: `231 94% 95%` (Indigo 50 - subtle backgrounds)

**Status Colors** (Critical for Risk Assessment):
- Success/Positive: `142 71% 45%` (Green 600), Light: `142 76% 96%` (Green 50)
- Warning/TBD: `38 92% 50%` (Yellow 500), Light: `48 96% 89%` (Yellow 50)
- Danger/Negative: `0 84% 60%` (Red 500), Light: `0 86% 97%` (Red 50)
- Info: `217 91% 60%` (Blue 500), Light: `214 95% 93%` (Blue 50)

**Neutral Palette**:
- Background: `210 20% 98%` (Gray 50)
- Surface: `0 0% 100%` (White)
- Border: `214 32% 91%` (Gray 200)
- Text Primary: `220 9% 12%` (Gray 900)
- Text Secondary: `215 16% 47%` (Gray 600)

**Dark Mode** (All components including forms):
- Background: `222 47% 11%` (Gray 900)
- Surface: `217 33% 17%` (Gray 800)
- Border: `215 28% 25%` (Gray 700)
- Text: `210 20% 98%` (Gray 50)

### B. Typography

**Font Families**:
- Primary: 'Inter' (via Google Fonts) - exceptional readability for data-heavy interfaces
- Monospace: 'JetBrains Mono' (for numerical values, addresses, calculations)

**Type Scale**:
- Hero/Display: text-3xl to text-4xl, font-bold (32-36px)
- Page Titles: text-2xl, font-bold (24px)
- Section Headers: text-xl, font-semibold (20px)
- Card Titles: text-lg, font-semibold (18px)
- Body Text: text-base, font-normal (16px)
- Labels: text-sm, font-medium (14px)
- Captions/Meta: text-xs, font-normal (12px)
- Data Values: text-lg to text-2xl, font-bold, monospace (18-24px for key metrics)

### C. Layout System

**Spacing Primitives**: Use Tailwind units of **2, 3, 4, 6, 8, 12, 16** consistently
- Component padding: `p-4` to `p-6` for cards
- Section spacing: `space-y-6` to `space-y-8`
- Page margins: `px-4 md:px-6 lg:px-8`
- Vertical rhythm: `py-8` to `py-12` for major sections

**Grid System**:
- Container: `max-w-7xl mx-auto` for main content
- Form layouts: Two-column grid on desktop (`grid-cols-1 md:grid-cols-2`)
- Dashboard metrics: Three to four columns (`grid-cols-1 md:grid-cols-3 lg:grid-cols-4`)
- Gap consistency: `gap-4` to `gap-6`

### D. Component Library

**Navigation & Header**:
- Sticky header with white background, subtle shadow (`shadow-sm`)
- User info display with avatar placeholder
- Real-time total points meter prominently displayed (top-right)
- Tab navigation with underline indicator for active state

**Forms & Inputs**:
- Clean, spacious form fields with `py-3 px-4` padding
- Labels: `text-sm font-medium text-gray-700 mb-2`
- Focus states: `ring-2 ring-indigo-500` with border transition
- **Color-coded selects**: Background changes based on point value (green-50/red-50/white)
- Error states: Red border with inline error message
- Disabled states: `bg-gray-100 cursor-not-allowed opacity-60`

**Data Display Cards**:
- White background with `rounded-lg shadow-sm border border-gray-200`
- Header with icon and title
- Point badges: Rounded pill shape with border-2, color-coded (green/red/neutral)
- Auto-save indicator: Small icon with timestamp

**Score Display**:
- **Total Points Card**: Large, prominent display with:
  - Calculator icon
  - Point value in 2xl font with +/- prefix
  - EMD status badge (Yes EMD/TBD/No EMD)
  - Color background matching score range
  - Border-2 for emphasis

**AI Analysis Section**:
- Structured card with Brain icon
- Summary paragraph with highlighted key metrics
- Bullet lists for strengths/concerns
- Recommendation callout box with appropriate status color
- Detailed breakdown table with sortable columns

**Buttons**:
- Primary: `bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-semibold`
- Secondary: `bg-white hover:bg-gray-50 text-gray-700 border border-gray-300`
- Danger: `bg-red-600 hover:bg-red-700 text-white`
- Icon buttons: Circular with `p-2`, icon-only

**Status Indicators**:
- Success checkmark: Green circle with CheckCircle icon
- Warning: Yellow triangle with AlertCircle icon
- Auto-save pulse: Subtle animation on Save icon
- Loading states: Indigo spinner or skeleton screens

### E. Animations

**Minimal & Purposeful Only**:
- Auto-save icon: Gentle pulse animation (`animate-pulse`) during save
- Form field focus: Smooth border color transition (`transition-colors duration-200`)
- Point value updates: Quick number transition (no fancy counters, instant update)
- Tab switching: Instant content swap, no slides
- **No**: Parallax, scroll effects, complex transitions, or decorative animations

---

## Key UI Patterns

**Login Screen**: 
- Centered card on gradient background (`from-blue-50 to-indigo-100`)
- Brand icon in indigo circle above title
- Two-field form with clear call-to-action

**Dashboard Layout**:
- Persistent header with user context and total score
- Horizontal tab navigation (Acquisition, Analysis, Reports)
- Main content area with form sections in organized cards
- Right sidebar (optional) for quick reference/help

**Point Calculation Display**:
- Each form field shows its point contribution immediately
- Visual color coding on select/input based on value impact
- Running total always visible in header
- EMD recommendation updates in real-time

**Responsive Behavior**:
- Mobile: Single column, stacked cards, bottom navigation
- Tablet: Two-column forms, collapsible sections
- Desktop: Full multi-column layout with sidebar

---

## Images

**No hero images** - This is a utility application where users need immediate access to tools, not marketing content. All visual space should be dedicated to functional interface elements, data displays, and form controls.