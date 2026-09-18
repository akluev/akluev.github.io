---
name: blog-post-structure
description: "Blog post writing standards for akluev.github.io. Use when writing, drafting, or reviewing any new blog post for this site. Every post must open with a TL;DR section, close with a Conclusion section, and end with a Sources section listing all referenced links."
---

# Blog Post Structure

## Required Sections (in order)

Every blog post on this site must include the following three sections. Their presence and order are non-negotiable.

### 1. TL;DR (first section, immediately after the opening paragraph)

- Use a short, connected paragraph or up to four concise bullet points to summarise the entire article. Choose the form that reads most naturally for the story.
- A reader who only reads the TL;DR should understand the key takeaway and know whether the full article is relevant to them.
- Write for a reader who may spend only about 30 seconds on the post: lead with the finding and practical choice, then give the most useful reason or qualification.
- Do not restate the title — add value.

Markdown heading: `## TL;DR`

### 2. Conclusion (second-to-last section)

- Two to five short paragraphs that wrap up the article.
- Restate why the topic matters, what the reader should take away, and any actionable next step.
- Make the practical takeaway clear enough for a reader who skips from the TL;DR to the Conclusion.
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

## Hero Image and Image Directory

- At the beginning of every new post, explicitly offer the user the option of using a fresh photo of Mister or Frisbee as the hero image. Treat this like the TL;DR check: do not silently omit the offer. If the user does not want a cat photo, ask them to explicitly decline it.
- Store every image used by a post in one flat, post-specific directory: `assets/images/YYYY-MM-DD/`, using the date from the post filename. Do not create separate `YYYY/MM/DD` directories.
- Reference those images from the post as `/assets/images/YYYY-MM-DD/filename.ext`.
- Use descriptive, lowercase, hyphenated filenames and meaningful alt text. Do not guess which cat appears in a photo when their identity has not been provided.

## Callouts

The existing callout styles are in `assets/css/style.css`. Use a Markdown blockquote followed immediately by a Kramdown attribute line:

```markdown
> **Callout label**
>
> Callout text.
{: .callout .callout-question }
```

- `.callout .callout-question` has a green background and border. Use it for questions, helpful notes, or positive highlights.
- `.callout .callout-issue` has an orange background and border. Use it for problems, warnings, or unresolved points.
- The first bold phrase becomes the small uppercase label. The base `.callout` class adds padding and a subtle shadow. Choose the colour by meaning; avoid adding a new CSS style for an ordinary callout.

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

![Descriptive hero-image alt text](/assets/images/YYYY-MM-DD/hero-image.jpg)

Opening paragraph (context / hook — one or two sentences before TL;DR).

## TL;DR

Brief connected summary, or concise bullets when a list reads better.

<!-- body sections -->

## Conclusion

Wrap-up paragraphs.

## Sources

- <a href="URL1" target="_blank" rel="noopener noreferrer">Link text 1</a>
- <a href="URL2" target="_blank" rel="noopener noreferrer">Link text 2</a>
```

## Writing Style Notes

- Use British/neutral English; avoid marketing superlatives.
- Write in Alex's relaxed, friendly voice. Prefer plain words and short explanations to dense technical phrasing. An occasional personal aside or joke is welcome when it fits the post.
- Keep a natural thread from one finding to the next. Explain what prompted the test, what it showed, and why that led to the next test; avoid turning connected reasoning into clipped statements or a list of slogans.
- Keep measured results precise even in a conversational passage. Distinguish what a test showed from an explanation or a suggestion for readers to try.
- When a detailed technical write-up exists elsewhere, tell the story and highlight the useful evidence here; link to the full write-up for scripts, logs, and deep methodology instead of reproducing it all.
- Code samples use fenced code blocks with a language tag (`sql`, `shell`, `json`, etc.).
- External links use `<a href="..." target="_blank" rel="noopener noreferrer">...</a>` (not bare Markdown links).
- Each section heading is `##`; subsections are `###`.
- **Commands and their output**: every output example must show the exact command that produced it in the same example, preferably as the first line of a terminal or SQLcl transcript. Never show orphan output. If lines are omitted, mark the omission and say so in the lead-in. This lets readers verify what they see against the command they ran.
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
