# ANSUDHA Brand Typography Assets

Place any custom licensed web fonts (.woff2, .woff, .ttf) in this directory.

### Current Implementation:
- Web Fonts: `Cinzel` (Heritage Serif Display) & `Plus Jakarta Sans` (Humanist Body Sans) loaded cleanly from Google Fonts with `font-display: swap`
- System Fallbacks:
  - Display Serifs: `'Cinzel', 'Playfair Display', 'Cormorant Garamond', 'Baskerville', 'Georgia', serif`
  - Body Sans: `'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`

### How to use Local / Self-Hosted Fonts:
1. Place your font files here (e.g. `ansudha-display.woff2`).
2. In `css/style.css`, add your `@font-face` definition:
   ```css
   @font-face {
     font-family: 'AnsudhaDisplay';
     src: url('../assets/fonts/ansudha-display.woff2') format('woff2');
     font-weight: 400 700;
     font-display: swap;
   }
   ```
3. Update the CSS variable `--font-display: 'AnsudhaDisplay', serif;`.

