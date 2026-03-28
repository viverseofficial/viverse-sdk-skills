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

## Best Practices

- **Avoid Placeholders**: Never use `// Implement style here`. Write the CSS.
- **Center Focus**: Main actions should be centrally located with high contrast.
- **Brand Consistency**: Ensure the "Enter" button matches the accent color.
