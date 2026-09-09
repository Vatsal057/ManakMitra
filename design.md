# ManakMitra — Design Language (Shopify Polaris)

This document defines the visual and interaction language for ManakMitra, based on **Shopify Polaris** — Shopify's open-source design system. Use this as the source of truth for any UI work (Task 5 frontend, and any dashboards/admin views).

> **Note on exact values:** Polaris token values get revised across versions. The colors, spacing, and type sizes below are accurate to Polaris's current design language and structure, but treat the specific hex codes and px values as an illustrative baseline — pull the authoritative current values from the `@shopify/polaris-tokens` npm package (or `@shopify/polaris` React components directly) rather than hand-copying the numbers below into production CSS.

## Why Polaris fits ManakMitra
Polaris was built for dense, data-heavy, trust-critical admin tools — merchants managing orders, inventory, and money. That's structurally the same problem as a procurement official comparing standards, certifications, and version numbers: lots of tabular data, status states that must be scannable at a glance, and an audience that needs to trust the tool, not be delighted by it. Polaris optimizes for clarity and speed over decoration, which is the right instinct for a government/procurement-facing tool.

---

## 1. Color

Polaris organizes color by **role**, not by raw hex value — you style by what the color *means* (surface, text, critical, success), and the system handles the actual shade. Think in roles first.

### Core roles

| Role | Purpose | Illustrative value |
|---|---|---|
| **Surface** | Page and card backgrounds | White `#FFFFFF`, subdued surface `#F6F6F7` |
| **Text** | Body copy | Ink `#202223` (primary), subdued ink `#6D7175` (secondary) |
| **Border** | Dividers, input outlines | `#E1E3E5` |
| **Interactive / Action** | Links, primary buttons, focus states | Blue `#2C6ECB` (default), darker on hover `#1F5199` |
| **Critical** | Errors, data-quality failures, destructive actions | Red `#D82C0D` |
| **Warning** | Needs-review flags, missing data | Amber `#B98900` |
| **Success** | Verified/certified, valid version, usable-as-is records | Green `#008060` |
| **Info** | Neutral callouts, informational banners | Teal/Blue `#3A70B0` |

### Mapping to ManakMitra states
This is where the role system earns its keep for your specific product:

- **`needs_review == True`** → Warning badge/tag
- **Certification present (BIS/CRS/Hallmarking)** → Success badge
- **Missing `latest_version` / data-quality issue** → Critical or Warning depending on severity
- **Category / relationship-type tags** (test_method, safety, normative_reference, installation_application) → neutral/Info tags, one consistent color per relationship type so allied-standards results are scannable by type at a glance
- **Primary action (search/recommend button)** → Interactive blue

Don't invent new colors for new states — map every status in the product back to one of these roles. That consistency is the actual value of the system, more than the specific hex codes.

---

## 2. Typography

Polaris deliberately uses the **operating system's native UI font stack** rather than a custom webfont — this keeps the interface feeling fast and native rather than "designed." Use:

```css
font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
```

### Type scale (illustrative — a simplified version of Polaris's scale)

| Use | Approx. size | Weight |
|---|---|---|
| Page title | 24–28px | Semibold (600) |
| Section heading | 18–20px | Semibold (600) |
| Card/subsection heading | 15–16px | Semibold (600) |
| Body text | 14px | Regular (400) |
| Caption / metadata (e.g. standard number, year) | 12–13px | Regular (400), subdued ink color |

Keep line-height generous (1.4–1.5) for body text — procurement officials will be scanning dense standard titles and scope text, not reading prose.

---

## 3. Spacing

Polaris spacing is scale-based, not arbitrary. Illustrative scale (roughly base-4):

`4px · 8px · 12px · 16px · 20px · 24px · 32px · 48px · 64px`

Practical rule: 8px/16px for internal component padding (card padding, button padding), 24px/32px for spacing between major sections (e.g. between the search bar and the results list), 4px only for tight groupings (e.g. between an icon and its label).

---

## 4. Shape & elevation

- **Border radius:** small and consistent — around `8px` for cards and inputs, `6px` for buttons and badges/tags. Polaris avoids heavy rounding; it should read as a serious tool, not a consumer app.
- **Shadows:** subtle, used sparingly — a light single-layer shadow to lift cards off the page background (`0 1px 2px rgba(0,0,0,0.08)` as an illustrative value), not the multi-layer glow/gradient look common in "AI slop" generated UIs. No colored glows, no heavy drop shadows.

---

## 5. Components — mapped to ManakMitra's actual screens

| Polaris pattern | Use in ManakMitra |
|---|---|
| **Page** | Top-level container with page title ("Recommend Standards") + primary action |
| **Card** | Each recommended standard as a result card (standard number, title, category, certification badge) |
| **IndexTable / DataTable** | Allied/normative standards list under an expanded result; any tabular data view |
| **Badge** | Certification type (BIS/CRS/Hallmarking), needs-review status, confidence level |
| **Tag** | Category, relationship type (test_method, safety, etc.) — small, colored per role, removable where used as a filter |
| **Banner** | Data-quality caveats surfaced to the user (e.g. "This dataset covers a curated subset of Indian Standards" — matches your own preference for on-screen methodological transparency rather than hiding caveats) |
| **TextField (multiline) / Combobox** | The main product-description/spec input box |
| **Tabs** | Switching between "Recommended Standards," "Allied Standards," "Certification Requirements" for a given query |
| **EmptyState** | No strong matches found — give a clear next step, not a dead end |
| **Skeleton / Spinner** | Loading state while the embedding search runs |

---

## 6. Voice & content tone

Polaris's content guidelines, applied to your audience (procurement officials, not shoppers):

- **Plain language over BIS jargon where possible.** Explain acronyms on first use in a given view (CRS, Hallmarking).
- **Buttons describe the action, not a generic label.** "Get recommendations," not "Submit."
- **Errors and empty states explain what to do next**, not just what went wrong. "No strong matches — try adding more detail about materials or dimensions" beats "No results."
- **Never overstate confidence.** Since your underlying dataset has known coverage gaps (per the data audit), UI copy around results should read like informed guidance, not absolute fact — e.g. "Recommended standards" rather than "The correct standard is..."

---

## 7. Accessibility

Polaris targets **WCAG 2.1 AA**: minimum 4.5:1 contrast for body text, keyboard navigability for every interactive element, visible focus states (don't remove the default outline without replacing it), and screen-reader labels on icon-only buttons. For a government-adjacent tool, treat this as a hard requirement, not a nice-to-have.

---

## 8. Implementation notes

- Fastest path to genuine Polaris fidelity: use the `@shopify/polaris` React component library directly (`Page`, `Card`, `IndexTable`, `Badge`, `Banner`, etc.) rather than hand-rebuilding components with Tailwind. This also guarantees accessibility behavior comes for free.
- If you're building with Tailwind instead, pull real values from `@shopify/polaris-tokens` and map them into your Tailwind theme config rather than eyeballing hex codes.
- This file pairs naturally as the `DESIGN.md` context file if you're using the **Impeccable** skill in Claude Code — point it at this doc so generated UI follows these roles/scale consistently instead of defaulting to generic AI-generated design patterns.
