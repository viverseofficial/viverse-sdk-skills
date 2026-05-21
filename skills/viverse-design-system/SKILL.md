# VIVERSE Design System Skill

This skill provides the mandates and architectural patterns for creating high-fidelity, "WOW" factor web applications within the VIVERSE ecosystem.

## Design Mandate

Every application built MUST adhere to the following aesthetic principles. Failure to do so results in a "Sad UI" and is a critical system failure.

1. **Premium Aesthetic**: Use rich, curated color palettes. Avoid generic primary colors (pure red, green, blue).
2. **Glassmorphism**: Use `backdrop-filter: blur()` and semi-transparent backgrounds to create depth.
3. **Dynamic Feedback**: Every interactive element (buttons, cards) MUST have hover and active states.
4. **Micro-animations**: Use subtle transitions (scale, opacity, translateY) to make the UI feel alive.
5. **Modern Typography**: Use Google Fonts (e.g., 'Outfit', 'Inter', 'Space Grotesk').

## HSL Design Tokens

Recommended base tokens for a "Sleek Dark Mode":

```css
:root {
  --bg-obsidian: 220 30% 5%;
  --bg-surface: 220 20% 12%;
  --accent-cyan: 180 100% 50%;
  --text-pure: 0 0% 100%;
  --text-ghost: 220 10% 70%;
}
```

## Glass Utility

```css
.glass {
  background: hsla(var(--bg-surface) / 0.4);
  backdrop-filter: blur(24px) saturate(180%);
  border: 1px solid hsla(var(--text-pure) / 0.1);
}
```

## Pattern: The "WOW" Entry Experience

Always include a high-fidelity landing or login screen even if just a prototype. 
- Use large, italicized technical headings.
- Use iconography (Lucide React recommended).
- Implement a floating background glow or mesh gradient.

## Usability & Accessibility (MANDATORY — overrides aesthetics)

These rules are NON-NEGOTIABLE. A beautiful UI that is unplayable is worse than an ugly functional one.

1. **Text Contrast**: ALL text MUST have a contrast ratio ≥ 4.5:1 against its background. For dark backgrounds, use `hsl(0 0% 95%)` or brighter — NEVER use dark text on dark backgrounds.
2. **Button/Interactive Contrast**: Buttons and interactive elements MUST be clearly distinguishable from their surroundings — use accent colors with ≥ 3:1 contrast against the container.
3. **No Overlapping Interactive Elements**: Buttons, cards, and clickable areas MUST NOT overlap. Use proper layout (flexbox/grid with `gap`) — NEVER use absolute positioning that causes overlap on any viewport.
4. **Minimum Touch Targets**: All interactive elements MUST be at least 44×44px (mobile) / 36×36px (desktop). Use adequate `padding` — never rely on tiny text-only hit areas.
5. **Spacing Between Actions**: Adjacent buttons/options MUST have at least 8px gap. For game choice buttons, use 12–16px gap minimum.
6. **Readable Game Text**: In-game labels, scores, options, and status text MUST use `font-size ≥ 14px` and high-contrast colors. Small gray text on dark backgrounds is FORBIDDEN for gameplay-critical information.
7. **Viewport Safety**: All UI MUST be fully visible without scrolling on a 375×667px viewport (iPhone SE). Use `max-height: 100dvh` and `overflow: auto` if content may exceed screen.
8. **Button Labels**: Choice/action buttons MUST have clear, readable labels. Text inside buttons MUST contrast against the button background at ≥ 4.5:1.
9. **Z-Index Discipline**: Overlays and modals get `z-index: 50+`. Game HUD gets `z-index: 10–40`. Game canvas stays at `z-index: 0–5`. NEVER stack interactive layers without explicit z-ordering.
10. **Test Mentally**: Before finishing, mentally walk through: "Can the user clearly see every button? Can they tap each one without accidentally hitting another? Can they read all text?"

## Defensive CSS Patterns (use these)

```css
/* Button grid that never overlaps */
.button-group {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  justify-content: center;
  padding: 16px;
}

/* Readable game button */
.game-btn {
  min-height: 44px;
  min-width: 120px;
  padding: 12px 24px;
  font-size: 16px;
  font-weight: 600;
  border-radius: 12px;
  color: hsl(0 0% 100%);           /* white text */
  background: hsl(var(--accent-cyan) / 0.9);
  border: 1px solid hsl(var(--accent-cyan) / 0.4);
}

/* Prevent overflow on mobile */
.game-container {
  max-width: 100vw;
  max-height: 100dvh;
  overflow: hidden;
  padding: 16px;
  box-sizing: border-box;
}
```

## Best Practices

- **Avoid Placeholders**: Never use `// Implement style here`. Write the CSS.
- **Center Focus**: Main actions should be centrally located with high contrast.
- **Brand Consistency**: Ensure the "Enter" button matches the accent color.
- **Function Over Form**: If forced to choose between "looks cool" and "user can actually use it", ALWAYS choose usability.
