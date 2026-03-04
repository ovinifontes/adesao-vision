

## Deploying to GitHub Pages

GitHub Pages serves static files from a repository. Your Vite/React app needs a few adjustments to work correctly on GitHub Pages:

### Changes needed

1. **`vite.config.ts`** — Add `base` option set to the repository name (e.g., `base: '/repo-name/'`) so asset paths resolve correctly on GitHub Pages.

2. **`package.json`** — Add a `deploy` script and install `gh-pages` as a dev dependency for easy deployment.

3. **React Router** — Update `App.tsx` to use `basename` on `BrowserRouter` matching the repo name, so client-side routing works. Alternatively, switch to `HashRouter` which works out-of-the-box on GitHub Pages without server-side redirect config.

4. **404 handling** — Add a `public/404.html` that redirects to `index.html` (a common GitHub Pages SPA trick), unless we use `HashRouter`.

### Recommended approach: HashRouter

The simplest approach for GitHub Pages is switching from `BrowserRouter` to `HashRouter`. This avoids all 404 issues and doesn't require server-side configuration. URLs will look like `https://user.github.io/repo/#/vendas` instead of `https://user.github.io/repo/vendas`.

### Steps

1. Install `gh-pages` dev dependency
2. Set `base` in `vite.config.ts` to `'./'` (relative paths)
3. Switch `BrowserRouter` to `HashRouter` in `App.tsx`
4. Add `"predeploy": "npm run build"` and `"deploy": "gh-pages -d dist"` scripts to `package.json`

After implementation, you'll connect your GitHub repo and run `npm run deploy` from your local machine (or set up a GitHub Action).

### Important note

Lovable has built-in GitHub integration — you can connect your project to a GitHub repo via Settings → GitHub. Once connected, you can clone the repo locally and run `npm run deploy`, or set up a GitHub Actions workflow for automatic deployment on push.

