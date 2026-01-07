## Purpose
Provide focused, repo-specific guidance so an AI coding agent can be immediately productive editing this Beautiful Jekyll site.

## Big picture
- This repo is a fork/customization of the Beautiful Jekyll theme. The site is rendered by Jekyll (Ruby) into static HTML.
- Content flow: markdown pages and posts in the repo (notably `_posts/` and top-level `*.md`) -> Jekyll processes Liquid templates in `_layouts/` and `_includes/` -> output static site. Key configuration is in `_config.yml`.

## Local dev / build.
- Uses Bundler / Jekyll. Typical commands:

```
bundle install
bundle exec jekyll serve
```

- `Gemfile` is present; use Bundler to ensure matching gems. The site uses `jekyll-paginate` and `jekyll-sitemap` (see `_config.yml`).

## Where to make changes (important files)
- Site config and defaults: `_config.yml` (navigation, comment systems, defaults for posts like `layout: post`, `comments: true`).
- Page/post content: `_posts/` (YYYY-MM-DD-title.md) and top-level markdown such as `aboutme.md`.
- Layouts and partials: `_layouts/` and `_includes/` (header, footer, comment widgets). Edit these for structural/template changes.
- Static assets: `assets/css/`, `assets/js/`, `assets/img/`. Client-side search index template: `assets/data/searchcorpus.json` (Liquid-generated JSON for the site search).

## Project-specific patterns and conventions
- Navigation is declared in `navbar-links` in `_config.yml` — update that object to modify menus.
- Default front matter for posts/pages is declared in `_config.yml` under `defaults` (posts get `layout: post`, comments enabled by default).
- Multiple optional comment integrations are scaffolded: Disqus, Staticman, giscus, Utterances. Configuration toggles live in `_config.yml` and the comment partials are in `_includes` (e.g. `_includes/staticman-comment.html`, `_includes/disqus.html`).
- Search: the site uses a prebuilt JSON index generated from `assets/data/searchcorpus.json` (Liquid loops over `site.posts` and `site.html_pages`). Do not manually hand-edit the generated JSON; edit templates or posts instead.

## Integration points & external services
- GitHub Pages: the repo is a typical GH Pages site; local builds may use plugins not supported on GitHub Pages — test with `bundle exec jekyll serve` locally.
- Staticman: `staticman.yml` config present. If Staticman comments are enabled, ensure endpoint/branch values in `_config.yml` match this file.

## How to add a post
1. Create `YYYY-MM-DD-title.md` under `_posts/` with YAML front matter. Use `layout: post` if overriding.
2. Tags go in `tags:` front matter; they feed into tag pages and `assets/data/searchcorpus.json` generation.

## Quick editing heuristics for AI changes
- Prefer small, focused edits: change an `_includes` partial for global UI fixes rather than editing many pages.
- When modifying navigation, update `_config.yml`'s `navbar-links` rather than changing layouts.
- If adding a new JS/CSS file, put it under `assets/js` or `assets/css` and add to `_includes/ext-js.html` / `_includes/ext-css.html` if it should be included site-wide.

## References (examples)
- Site configuration: [_config.yml](_config.yml)
- Template examples: [_layouts/default.html](_layouts/default.html) and [_includes/header.html](_includes/header.html)
- Client JS and search index: [assets/js/beautifuljekyll.js](assets/js/beautifuljekyll.js) and [assets/data/searchcorpus.json](assets/data/searchcorpus.json)
- Comments config: [staticman.yml](staticman.yml) and [_includes/staticman-comment.html](_includes/staticman-comment.html)

## When to ask for human guidance
- If a change affects external integrations (Staticman, Disqus, giscus) ask before editing credentials/endpoints.
- If a change proposes adding new Jekyll plugins or changing Ruby/Gem versions — ask, because CI/GitHub Pages compatibility matters.

---
If anything above is unclear or you want more detail on a specific area (build, search index generation, or comment integrations), tell me which part to expand.
