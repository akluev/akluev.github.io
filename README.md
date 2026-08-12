# Alexander Kluev

Personal technical blog for Alexander Kluev, built with Jekyll and hosted on
GitHub Pages.

## Publishing

GitHub Pages publishes this repository directly from the `master` branch root.
No separate build step or frontend toolchain is required.

## Local development

See [Install Ruby and Jekyll on Windows](assets/documents/how-to/install-ruby-jekyll-windows.md)
for the complete setup, validation, preview, and Git Bash command instructions.

## Writing a post

Add a Markdown file to `_posts` using Jekyll's naming convention:

```text
YYYY-MM-DD-post-title.md
```

Each post starts with front matter:

```yaml
---
layout: post
title: "Post title"
date: YYYY-MM-DD
description: "A short summary of the post."
---
```

Commit and push the file to `master`; GitHub Pages will rebuild the site.
