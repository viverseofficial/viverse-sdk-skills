# Agent Platform & UI Resilience Guide

This guide documents mandatory patterns to ensure the VIVERSE AI Agent remains reliable and its interface stays responsive.

## 1. Interaction & UI Layer
- **The SVG Click-Through Rule**: SVG icons nested inside `<button>` elements MUST have `pointer-events: none;` via CSS. This ensures that clicks on the icon correctly bubble up to the button's event listeners, preventing "dead" buttons in high-fidelity glassmorphism themes.
- **Scroll Hijack Prevention**: Large status log containers must have `overflow-y: auto;` and `max-height` to prevent them from pushing the chat input area off-screen.

## 2. Identity & Version Anchoring
- **Model Version Integrity**: The agent MUST have a hard-coded `IDENTITY RULE` in the system prompt. Relying on model defaults for version identification leads to regressions (e.g., Gemini 3 Flash identifying as 1.5). 
- **Systematic Reinforcement**: Every specialized agent (Architect, Coder, Reviewer) must share this identity anchor to ensure cross-agent consistency.

## 3. Sandboxing & Safe Commands
- **Execution Lifecycle**: Always verify shell command status (`checkCommandStatus`) before proceeding to dependent file modifications. 
- **Path Sanitization**: Ensure all file paths are resolved relative to the sandboxed workspace to prevent leakage.

*Loop-back reference for Verified-Loop Architecture (VLA)*
