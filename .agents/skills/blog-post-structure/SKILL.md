---
name: blog-post-structure
description: "Blog post writing standards for akluev.github.io. Use when writing, drafting, or reviewing any new blog post for this site. Every post must open with a TL;DR section, close with a Conclusion section, and end with a Sources section listing all referenced links."
---

# Blog Post Structure

## Required Sections (in order)

Every blog post on this site must include the following three sections. Their presence and order are non-negotiable.

### 1. TL;DR (first section, immediately after the opening paragraph)

- One to four concise bullet points that summarise the entire article.
- A reader who only reads the TL;DR should understand the key takeaway and know whether the full article is relevant to them.
- Do not restate the title — add value.

Markdown heading: `## TL;DR`

### 2. Conclusion (second-to-last section)

- Two to five short paragraphs that wrap up the article.
- Restate why the topic matters, what the reader should take away, and any actionable next step.
- Avoid introducing new information not covered in the body.

Markdown heading: `## Conclusion`

### 3. Sources (last section)

- An unordered list of every external link referenced anywhere in the post.
- Format: `- <a href="URL" target="_blank" rel="noopener noreferrer">Descriptive link text</a>`
- Include the Liquibase docs, Oracle docs, blog posts, forum threads, and GitHub references cited in the body.
- The Sources section replaces the older "References" heading used in earlier posts — always use "Sources" going forward.

Markdown heading: `## Sources`

## Product Names

- The Oracle tool is called **SQLcl Project** (singular). Never write "SQLcl Projects" — this is a common mistake. The product name is singular even when discussing the feature in general.

## Tags

Every post must have a `tags:` list in its front matter. The `jekyll-feed` plugin outputs these as `<category term="..." />` elements in the Atom feed, which is how aggregators (e.g. Planet APEX, Oracle community feeds) find articles by topic.

- Tags are lowercase and hyphenated (e.g. `oracle-apex`, `sqlcl-project`).
- Common tags on this site: `oracle-apex`, `apexlang`, `sqlcl`, `sqlcl-project`, `liquibase`, `oracle-database`, `git`.
- When starting a new post, determine the tags automatically from the topic and confirm with the user before proceeding. If the topic is unclear, ask the user.
- Aim for 3–5 tags per post. More than 6 is noise.

## Post Skeleton

```markdown
---
title: ""
date: YYYY-MM-DD
description: One-sentence description for the listing page.
tags:
  - tag-one
  - tag-two
---

Opening paragraph (context / hook — one or two sentences before TL;DR).

## TL;DR

- Key point 1
- Key point 2
- Key point 3

<!-- body sections -->

## Conclusion

Wrap-up paragraphs.

## Sources

- <a href="URL1" target="_blank" rel="noopener noreferrer">Link text 1</a>
- <a href="URL2" target="_blank" rel="noopener noreferrer">Link text 2</a>
```

## Writing Style Notes

- Use British/neutral English; avoid marketing superlatives.
- Code samples use fenced code blocks with a language tag (`sql`, `shell`, `json`, etc.).
- External links use `<a href="..." target="_blank" rel="noopener noreferrer">...</a>` (not bare Markdown links).
- Each section heading is `##`; subsections are `###`.
- **Commands and their output**: when showing a command a reader should run, first show the command(s) with a brief lead-in (e.g. "From inside SQLcl, run:"), then follow with a second block introduced by "Output should look something like this:" containing the actual output. This lets readers verify what they see matches what is expected.
- Do not start writing the full article body until the TL;DR and Sources skeleton have been approved by the user.

## LinkedIn Post Tags

When promoting a blog post on LinkedIn, include relevant hashtags at the end of the post. Common tags for technical content:

- `#sqlcl` — for SQLcl-related articles
- `#oracle` — for Oracle Database content
- `#orclapex` — for Oracle APEX articles
- `#liquibase` — for deployment/database migration topics
- `#git` — for version control content
- `#apexlang` — for APEXlang-related articles

Always include the direct blog post URL in the body of the message, with Dan McGhan's relevant work (e.g. schema-agnostic changesets) called out by name to help bridge knowledge gaps and give credit.
