# Windows build fix — 2026-11-20

This release removes the single `framer-motion` use and its dependency because a fresh npm installation resolved incompatible `motion-dom` exports, causing `activeAnimations` to be missing during Vite bundling.

A native CSS fade animation replaces the original animated overview; no application workflows were removed.

After extracting this new ZIP to a *new* folder, from inside the `CareLoop-AI-2.0.1` directory run:

```powershell
powershell -ExecutionPolicy Bypass -File .\run-windows.ps1
```

If applying this fix to an existing checkout, use `npm install` after updating `frontend/package.json` to remove the unused dependency, then `npm run build` inside `frontend`.

This fix addresses the `activeAnimations is not exported by motion-dom` error. It does not imply an independent browser test of all user workflows.
