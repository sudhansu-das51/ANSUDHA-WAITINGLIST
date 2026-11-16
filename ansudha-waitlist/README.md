# ANSUDHA — Heritage Waiting List
### Pre-Launch Waiting List Website

A complete, high-performance, and visually elevated pre-launch waiting list website for **ANSUDHA**. Designed with a luxurious Indian heritage aesthetic inspired by the timeless craft traditions and architectural grace of Odisha.

---

## 1. Brand & Design Identity

- **Brand:** ANSUDHA
- **Tagline:** Celebrating Odisha's crafts & master artisans.
- **Palette (Exact Brand Specifications):**
  - `#B66A0A` — Warm Antique Temple Gold / Ochre
  - `#5D1317` — Deep Heritage Terracotta Maroon
  - `#C68646` — Warm Copper / Sandal Artisan Craft Tone
  - `#F5F2B3` — Pale Raw Silk / Warm Ivory Cream
- **Visual Language:**
  - Modern traditional Indian luxury aesthetic
  - Odisha craft-inspired nuances (Ikat weaving geometry, Konark mandala rays, Cuttack silver filigree hairlines)
  - Rich maroon & warm cream surfaces with ample breathing room
  - WCAG AAA contrast compliance and fluid typography scale (`clamp()`)
  - Pure lightweight vanilla stack (no heavy frontend frameworks or bloated dependencies)

---

## 2. Project Directory Structure

```text
ansudha-waitlist/
│
├── index.html                     # Pre-launch landing page & waiting list form
├── success.html                   # Registration confirmation page
│
├── css/
│   └── style.css                  # Master CSS3 design system, variables & responsive rules
│
├── js/
│   ├── main.js                    # Form validation, UI state management & page controller
│   └── supabase.js                # Supabase REST client, duplicate handling & demo fallback
│
├── assets/
│   ├── logo/
│   │   ├── ansudha.svg            # Official vector logo with heritage emblem
│   │   ├── logo-placeholder.svg   # Template/placeholder vector logo
│   │   └── README.md              # Instructions for replacing logo
│   ├── images/
│   │   ├── craft-motifs.svg       # Heritage Odisha craft mandala & geometric texture
│   │   └── README.md              # Image guidelines and recommended formats
│   └── fonts/
│       └── README.md              # Typography guide for web & self-hosted fonts
│
└── supabase/
    ├── schema.sql                 # PostgreSQL schema, unique index & RLS policies
    ├── README.md                  # Detailed Supabase & Resend configuration guide
    └── functions/
        └── send-waitlist-email/
            └── index.ts           # Deno Edge Function with Resend email templates
```

---

## 3. Key Functional Features

- **Semantic HTML5 & Accessibility:** ARIA live regions, accessible error states, high contrast, keyboard navigation.
- **Comprehensive Form Validation:**
  - Full Name validation (min. 2 characters)
  - RFC 5322-compliant email validation
  - Mobile phone number validation (7 to 15 digits)
  - Country code selector with **+91 (India)** default and international dial codes (+1, +44, +971, +65, +61, etc.)
- **Duplicate Registration Prevention:**
  - Database-level unique constraint (`lower(trim(email))`)
  - Graceful UI notification acknowledging existing subscribers
- **Dual-Mode Backend Engine (`js/supabase.js`):**
  - **Live Mode:** Direct Supabase PostgREST REST API insertion with Row Level Security.
  - **Demo/Preview Mode:** If credentials are not yet configured, the site runs safely in local preview mode using `localStorage`—allowing you to test submission, validation, loading animations, and redirect flows immediately without crashes or console errors.
- **Server-Side Transactional Email:**
  - Supabase Edge Function integrating **Resend**
  - Template A: Registration confirmation with heritage ANSUDHA branding
  - Template B: Website launch announcement email
  - Zero exposure of private API keys in client-side JavaScript

---

## 4. How to Run Locally

Because the project is built with clean vanilla HTML5, CSS3, and JavaScript, you can run it immediately with any static server.

### Option A: Using Python (Pre-installed on most systems)
```bash
cd ansudha-waitlist
python -m http.server 3000
```
Then visit `http://localhost:3000` in your web browser.

### Option B: Using Node.js (npx serve or live-server)
```bash
cd ansudha-waitlist
npx serve .
```

### Option C: Direct File Opening
Double-click `index.html` in your file explorer to open it in your browser. (Note: Running via a local HTTP server is recommended for testing all browser storage APIs).

---

## 5. Connecting Supabase & Resend

### Step 1: Database Setup
1. Create a project at [supabase.com](https://supabase.com).
2. Go to the **SQL Editor** in your Supabase Dashboard.
3. Paste and run the contents of `supabase/schema.sql`.
4. This creates the `waitlist_registrations` table, unique index, and Row Level Security policies.

### Step 2: Configure Client Keys
Open `js/supabase.js` and enter your project credentials:
```javascript
const SUPABASE_CONFIG = {
  url: 'https://YOUR_PROJECT_ID.supabase.co',
  anonKey: 'YOUR_ANON_PUBLIC_KEY',
  tableName: 'waitlist_registrations',
  edgeFunctionUrl: '' // optional
};
```

### Step 3: Transactional Emails (Resend)
See `supabase/README.md` for deploying the Edge Function and linking your Resend API key securely.

---

## 6. How to Replace Logo, Fonts & Images

- **Logo:** Place your vector or transparent PNG logo in `assets/logo/` and update the `src` attribute in `index.html` and `success.html`.
- **Fonts:** The project loads `Cinzel` and `Plus Jakarta Sans` via Google Fonts. To self-host local fonts, add font files to `assets/fonts/` and link them in `css/style.css`.
- **Images:** Add brand photography to `assets/images/`.

---

## 7. Deployment Guide

### Deploying to Netlify
1. Drag and drop the `ansudha-waitlist` folder into [app.netlify.com/drop](https://app.netlify.com/drop).
2. Your website will be live in seconds with HTTPS.

### Deploying to Vercel
```bash
cd ansudha-waitlist
npx vercel
```

### Deploying to GitHub Pages
1. Push `ansudha-waitlist` to a GitHub repository.
2. Go to **Settings** → **Pages** and set the source branch to `main`.

