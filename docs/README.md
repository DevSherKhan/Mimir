# Mimir documentation site

The public documentation site is built with the repository's existing React and Vite toolchain.

## Local development

```bash
npm run dev:docs
```

Open <http://localhost:4174>.

Create and inspect a production build:

```bash
npm run build:docs
npm run preview:docs
```

Generated files are written to `dist-docs/` and are not committed.

## Deployment

The [documentation workflow](../.github/workflows/docs.yml) deploys the site to GitHub Pages after documentation changes reach `main`. For the repository's first deployment, select **GitHub Actions** under **Settings → Pages → Build and deployment → Source**.

The production build uses `/Mimir/` as its base path and publishes to:

<https://devsherkhan.github.io/Mimir/>

Run the workflow manually from the Actions tab when a redeployment is needed without a source change.

## Content structure

- `src/site.ts` owns page metadata, routes, navigation, and search keywords.
- `src/pages.tsx` owns documentation content.
- `src/app.tsx` owns the layout, search dialog, navigation, and theme behavior.
- `src/components.tsx` contains reusable documentation components.
- `src/styles.css` contains the responsive design system.
- `vite.config.ts` generates static route files, page metadata, the sitemap, and the Pages artifact.

Add every new page to `src/site.ts` and its renderer to `src/pages.tsx`. The documentation site test verifies that navigation and page renderers stay synchronized.
