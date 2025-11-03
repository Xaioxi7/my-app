# Design Tokens (Last updated: 2025-10-18)

## 🎨 Colors (from Figma 2025-10-18)

| Token | Description | Value |
|--------|--------------|--------|
| `--color-bg` | Page background | #FFFFFF |
| `--color-surface` | Card / Chat bubble background | #F8F8F8 |
| `--color-text` | Primary text | #000000 |
| `--color-subtext` | Secondary text | #1C1B1F |
| `--color-border` | Border line | #D9D9D9 |
| `--color-disabled` | Muted / inactive elements | #BEBEBE |
| `--color-accent` | Highlight (e.g. emoji, goal summary) | #FACC15 |

---
## 🧱 Layout & Spacing
| Token | Description | Value |
|--------|--------------|--------|
| `--radius-card` | Chat bubble corner | 8px |
| `--radius-button` | Button / Input field | 12px |
| `--space-sm` | Small spacing | 8px |
| `--space-md` | Default spacing | 16px |
| `--space-lg` | Section spacing | 24px |


## 🖋 Typography
| Token | Description | Example |
|--------|--------------|----------|
| `--font-family` | Primary font | "Inter", "Noto Sans SC", sans-serif |
| `--font-size-body` | Normal text | 16px |
| `--font-size-caption` | Small text | 14px |
| `--font-size-h1` | Headings | 24px |
| `--font-weight-normal` | Default | 400 |
| `--font-weight-bold` | Emphasis | 700 |

---

## 🧱 Layout & Spacing
| Token | Description | Value |
|--------|--------------|--------|
| `--radius-base` | Standard corner radius | 12px |
| `--radius-card` | Card & button corners | 16px |
| `--space-xs` | Extra small spacing | 4px |
| `--space-sm` | Small spacing | 8px |
| `--space-md` | Default spacing | 16px |
| `--space-lg` | Large spacing | 24px |
| `--space-xl` | Section padding | 32px |

---

## 🧭 Shadows & Elevation
| Token | Description | CSS Value |
|--------|--------------|------------|
| `--shadow-sm` | Subtle elevation | 0 1px 2px rgba(0,0,0,0.05) |
| `--shadow-md` | Card shadow | 0 4px 6px rgba(0,0,0,0.1) |
| `--shadow-lg` | Floating elements | 0 10px 15px rgba(0,0,0,0.15) |

---

## 🧩 Icon System
Icons should come from the Lucide or Heroicons library for visual consistency.

| Icon Usage | Example Name |
|-------------|--------------|
| Navigation | `Home`, `Chat`, `Tasks`, `User` |
| Status Indicators | `Check`, `X`, `AlertCircle` |
| Social | `Share`, `Link`, `Globe` |

---

## 🖼 Image Guidelines
- Background illustrations or covers → store under `/assets/images/`
- Preferred size: max width 1200 px (JPEG or WebP)
- Source should include license info (Unsplash / Pexels OK)
