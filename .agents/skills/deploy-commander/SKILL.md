---
name: deploy-commander
description: Ensures Vite configuration for GitHub Pages and verifies pre-flight build integrity.
---
# Deploy Commander Directives
1. Vite Base Path: Ensure vite.config.ts has base: './'.
2. Pre-flight Build: Run npm run build and verify 0 errors.
3. GitHub Actions: Ensure .github/workflows/deploy.yml uses actions/deploy-pages@v4.
