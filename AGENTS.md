# Agent Instructions

Shared instructions for every coding agent working in this repository (Codex,
Claude Code, GitHub Copilot).

## Repository

- Personal Jekyll blog "Alex on APEX", published by GitHub Pages from the
  `master` branch root.
- Work directly on `master`. Do not create branches unless asked.
- Posts live in `_posts/` as `YYYY-MM-DD-post-title.md`; images for a post live
  in `assets/images/YYYY-MM-DD/`.
- Design source files belong in `source-assets/`; optimized web assets belong in
  `assets/`.

## Skills

The single source of truth for skills is `.agents/skills/`. Before writing,
drafting, or reviewing a blog post, read and follow
`.agents/skills/blog-post-structure/SKILL.md`.

Read any other `SKILL.md` under `.agents/skills/` when its description matches
the task. Do not create copies of these skills in other directories; update the
file in `.agents/skills/` instead.

## Validation

Build the site to validate changes:

```shell
bundle exec jekyll build --strict_front_matter --trace
```

This only builds into `_site/`; it does not start a server. Alex runs
`blogserve` (`bundle exec jekyll serve --livereload`) himself when he wants to
preview the site, so do not leave a server running.
