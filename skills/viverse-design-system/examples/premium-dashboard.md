# Example: Premium Glassmorphism Dashboard

Here is a reference implementation of a high-fidelity dashboard for a VIVERSE Rummy game.

## index.css (Premium Tokens)

```css
:root {
  --font-main: 'Outfit', sans-serif;
  --bg-dark: 220 30% 5%;
  --bg-surface: 220 20% 12%;
  --accent-cyan: 180 100% 50%;
  --text-primary: 0 0% 100%;
}

body {
  background-color: hsl(var(--bg-dark));
  color: hsl(var(--text-primary));
  font-family: var(--font-main);
}

.glass-morphism {
  background: linear-gradient(135deg, hsla(0,0%,100%,0.1), hsla(0,0%,100%,0.02));
  backdrop-filter: blur(40px);
  border: 1px solid hsla(0,0%,100%,0.1);
  box-shadow: 0 8px 32px 0 hsla(0,0%,0%,0.4);
}
```

## HUD.jsx (Premium Entry)

```jsx
import { Trophy, LogIn } from 'lucide-react';

const EntryScreen = ({ onLogin }) => (
  <div className="min-h-screen flex items-center justify-center bg-mesh">
    <div className="glass-morphism p-12 rounded-[4rem] text-center animate-float">
      <div className="w-24 h-24 rounded-full bg-cyan-500/20 mb-8 border border-cyan-500/30 flex items-center justify-center mx-auto">
        <Trophy className="text-cyan-400 w-12 h-12" />
      </div>
      <h1 className="text-6xl font-black mb-4 italic text-transparent bg-clip-text bg-gradient-to-b from-white to-white/60">
        VIVERSE RUMMY
      </h1>
      <button 
        onClick={onLogin}
        className="bg-cyan-500 hover:bg-cyan-400 text-black py-4 px-12 rounded-2xl font-black text-xl shadow-[0_0_30px_rgba(6,182,212,0.3)] transition-all"
      >
        ENTER ARENA
      </button>
    </div>
  </div>
);
```
