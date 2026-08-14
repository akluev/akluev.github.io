import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const CATEGORY_NAME = "Blog Comments";
const SITE_NAME = "Alex on APEX";
const SITE_URL = "https://alexonapex.com";
const GRAPHQL_URL = process.env.GITHUB_GRAPHQL_URL || "https://api.github.com/graphql";
const POST_EXTENSIONS = new Set([".md", ".markdown", ".html"]);
const REPOSITORY_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);

function stripYamlComment(value) {
  let inSingleQuotes = false;
  let inDoubleQuotes = false;
  let escaped = false;

  for (let index = 0; index < value.length; index += 1) {
    const character = value[index];

    if (escaped) {
      escaped = false;
      continue;
    }

    if (character === "\\" && inDoubleQuotes) {
      escaped = true;
      continue;
    }

    if (character === "'" && !inDoubleQuotes) {
      inSingleQuotes = !inSingleQuotes;
      continue;
    }

    if (character === '"' && !inSingleQuotes) {
      inDoubleQuotes = !inDoubleQuotes;
      continue;
    }

    if (
      character === "#" &&
      !inSingleQuotes &&
      !inDoubleQuotes &&
      (index === 0 || /\s/.test(value[index - 1]))
    ) {
      return value.slice(0, index).trimEnd();
    }
  }

  return value.trimEnd();
}

function parseYamlScalar(rawValue, label) {
  const value = stripYamlComment(rawValue).trim();

  if (!value) {
    return "";
  }

  if (value.startsWith("'") || value.startsWith('"')) {
    const quote = value[0];
    if (!value.endsWith(quote)) {
      throw new Error(`${label} contains an unterminated quoted value.`);
    }

    if (quote === "'") {
      return value.slice(1, -1).replaceAll("''", "'");
    }

    try {
      return JSON.parse(value);
    } catch (error) {
      throw new Error(`${label} contains an unsupported double-quoted value: ${error.message}`);
    }
  }

  if (["|", ">", "|-", ">-", "|+", ">+"].includes(value)) {
    throw new Error(`${label} must be a single-line YAML value.`);
  }

  return value;
}

function parseYamlBoolean(rawValue) {
  if (rawValue === undefined) {
    return undefined;
  }

  const value = stripYamlComment(rawValue).trim();
  if (value.startsWith("'") || value.startsWith('"')) {
    return undefined;
  }

  if (/^(true|yes|on)$/i.test(value)) {
    return true;
  }

  if (/^(false|no|off)$/i.test(value)) {
    return false;
  }

  return undefined;
}

function extractFrontMatter(content, sourcePath) {
  const lines = content.replace(/^\uFEFF/, "").split(/\r?\n/);
  if (lines[0]?.trim() !== "---") {
    throw new Error(`${sourcePath} does not start with Jekyll front matter.`);
  }

  const endIndex = lines.findIndex(
    (line, index) => index > 0 && ["---", "..."].includes(line.trim()),
  );
  if (endIndex === -1) {
    throw new Error(`${sourcePath} has unterminated Jekyll front matter.`);
  }

  return lines.slice(1, endIndex).join("\n");
}

function readTopLevelField(yaml, fieldName) {
  const escapedFieldName = fieldName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = yaml.match(new RegExp(`^${escapedFieldName}[ \\t]*:[ \\t]*(.*)$`, "m"));
  return match?.[1];
}

async function readSitePublishingConfig() {
  const configPath = path.join(REPOSITORY_ROOT, "_config.yml");
  const config = await readFile(configPath, "utf8");
  const futureValue = readTopLevelField(config, "future");
  const timezoneValue = readTopLevelField(config, "timezone");

  return {
    future: parseYamlBoolean(futureValue) ?? false,
    timezone:
      timezoneValue === undefined
        ? undefined
        : parseYamlScalar(timezoneValue, "_config.yml timezone"),
  };
}

async function findPostFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await findPostFiles(entryPath)));
    } else if (
      entry.isFile() &&
      POST_EXTENSIONS.has(path.extname(entry.name).toLowerCase()) &&
      /^\d{4}-\d{2}-\d{2}-.+/.test(entry.name)
    ) {
      files.push(entryPath);
    }
  }

  return files;
}

function parseLocalDate(year, month, day, label) {
  const date = new Date(year, month - 1, day);
  if (
    Number.isNaN(date.getTime()) ||
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    throw new Error(`${label} contains an invalid date.`);
  }
  return date;
}

function parsePostDate(frontMatter, sourcePath) {
  const rawDate = readTopLevelField(frontMatter, "date");
  const filenameDate = path.basename(sourcePath).slice(0, 10);
  const value =
    rawDate === undefined
      ? filenameDate
      : parseYamlScalar(rawDate, `${sourcePath} date`);

  const dateOnly = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (dateOnly) {
    return parseLocalDate(
      Number(dateOnly[1]),
      Number(dateOnly[2]),
      Number(dateOnly[3]),
      sourcePath,
    );
  }

  const normalized = value
    .replace(
      /^(\d{4}-\d{2}-\d{2})[ \\t]+(\d{2}:\d{2}(?::\d{2})?)[ \\t]+([+-]\d{4})$/,
      "$1T$2$3",
    )
    .replace(/^(\d{4}-\d{2}-\d{2})[ \\t]+(\d{2}:\d{2}(?::\d{2})?)$/, "$1T$2");
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`${sourcePath} contains an invalid date: ${value}`);
  }
  return date;
}

async function discoverPublishedPosts() {
  const publishingConfig = await readSitePublishingConfig();
  if (publishingConfig.timezone) {
    process.env.TZ = publishingConfig.timezone;
  }

  const postsDirectory = path.join(REPOSITORY_ROOT, "_posts");
  const postFiles = await findPostFiles(postsDirectory);
  const now = new Date();
  const posts = [];
  const skipped = [];

  for (const postFile of postFiles) {
    const sourcePath = path.relative(REPOSITORY_ROOT, postFile).split(path.sep).join("/");
    if (sourcePath.includes("-->") || /[\r\n]/.test(sourcePath)) {
      throw new Error(`Unsafe post source path: ${sourcePath}`);
    }

    const content = await readFile(postFile, "utf8");
    const frontMatter = extractFrontMatter(content, sourcePath);
    const published = parseYamlBoolean(readTopLevelField(frontMatter, "published"));

    if (published === false) {
      skipped.push({ sourcePath, reason: "published: false" });
      continue;
    }

    const postDate = parsePostDate(frontMatter, sourcePath);
    if (!publishingConfig.future && postDate > now) {
      skipped.push({ sourcePath, reason: `future date ${postDate.toISOString()}` });
      continue;
    }

    const rawTitle = readTopLevelField(frontMatter, "title");
    if (rawTitle === undefined) {
      throw new Error(`${sourcePath} must have a title in its front matter.`);
    }

    const title = parseYamlScalar(rawTitle, `${sourcePath} title`);
    if (!title) {
      throw new Error(`${sourcePath} has an empty title.`);
    }

    posts.push({ sourcePath, title, postDate });
  }

  posts.sort((left, right) => left.sourcePath.localeCompare(right.sourcePath));
  return { posts, skipped, publishingConfig };
}

async function graphql(token, query, variables) {
  const response = await fetch(GRAPHQL_URL, {
    method: "POST",
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "User-Agent": "alex-on-apex-discussion-sync",
    },
    body: JSON.stringify({ query, variables }),
  });

  const responseText = await response.text();
  let payload;
  try {
    payload = JSON.parse(responseText);
  } catch {
    throw new Error(`GitHub GraphQL returned HTTP ${response.status} with a non-JSON response.`);
  }

  if (!response.ok || payload.errors?.length) {
    const messages = payload.errors?.map((error) => error.message).join("; ") || response.statusText;
    throw new Error(`GitHub GraphQL request failed (${response.status}): ${messages}`);
  }

  return payload.data;
}

async function discoverRepositoryAndCategory(token, owner, name) {
  const query = `
    query RepositoryAndDiscussionCategories($owner: String!, $name: String!) {
      repository(owner: $owner, name: $name) {
        id
        discussionCategories(first: 100) {
          nodes {
            id
            name
          }
        }
      }
    }
  `;
  const data = await graphql(token, query, { owner, name });
  if (!data.repository) {
    throw new Error(`Repository ${owner}/${name} was not found.`);
  }

  const category = data.repository.discussionCategories.nodes.find(
    (candidate) => candidate.name === CATEGORY_NAME,
  );
  if (!category) {
    throw new Error(
      `Discussion category "${CATEGORY_NAME}" was not found in ${owner}/${name}. Create it before running this workflow.`,
    );
  }

  return { repositoryId: data.repository.id, categoryId: category.id };
}

async function listCategoryDiscussions(token, owner, name, categoryId) {
  const query = `
    query BlogPostDiscussions(
      $owner: String!
      $name: String!
      $categoryId: ID!
      $after: String
    ) {
      repository(owner: $owner, name: $name) {
        discussions(
          first: 100
          after: $after
          categoryId: $categoryId
          orderBy: { field: CREATED_AT, direction: ASC }
        ) {
          nodes {
            id
            number
            url
            title
            body
          }
          pageInfo {
            hasNextPage
            endCursor
          }
        }
      }
    }
  `;

  const discussions = [];
  let after = null;

  do {
    const data = await graphql(token, query, { owner, name, categoryId, after });
    const connection = data.repository?.discussions;
    if (!connection) {
      throw new Error(`Unable to read Discussions from ${owner}/${name}.`);
    }

    discussions.push(...connection.nodes);
    after = connection.pageInfo.hasNextPage ? connection.pageInfo.endCursor : null;
  } while (after);

  return discussions;
}

function markerFor(sourcePath) {
  return `<!-- alex-on-apex-post: ${sourcePath} -->`;
}

function escapeMarkdown(value) {
  return value.replace(/([\\`*_[\]])/g, "\\$1");
}

function discussionBody(post) {
  return [
    `Discussion for **${escapeMarkdown(post.title)}** on [${SITE_NAME}](${SITE_URL}).`,
    "",
    "Questions, comments, corrections, and additional ideas are welcome.",
    "",
    markerFor(post.sourcePath),
  ].join("\n");
}

async function createDiscussion(token, repositoryId, categoryId, post) {
  const mutation = `
    mutation CreateBlogPostDiscussion($input: CreateDiscussionInput!) {
      createDiscussion(input: $input) {
        discussion {
          id
          number
          url
          title
          body
        }
      }
    }
  `;
  const data = await graphql(token, mutation, {
    input: {
      repositoryId,
      categoryId,
      title: post.title,
      body: discussionBody(post),
    },
  });
  return data.createDiscussion.discussion;
}

async function updateDiscussionTitle(token, discussionId, title) {
  const mutation = `
    mutation UpdateBlogPostDiscussionTitle($input: UpdateDiscussionInput!) {
      updateDiscussion(input: $input) {
        discussion {
          id
          number
          url
          title
          body
        }
      }
    }
  `;
  const data = await graphql(token, mutation, {
    input: { discussionId, title },
  });
  return data.updateDiscussion.discussion;
}

function discussionsYaml(mappings) {
  if (mappings.length === 0) {
    return "{}\n";
  }

  return `${mappings
    .map(
      ({ sourcePath, discussion }) =>
        `${JSON.stringify(sourcePath)}:\n  number: ${discussion.number}\n  url: ${JSON.stringify(discussion.url)}`,
    )
    .join("\n")}\n`;
}

async function synchronizeDiscussions(posts) {
  const token = process.env.GITHUB_TOKEN;
  const repository = process.env.GITHUB_REPOSITORY;
  if (!token) {
    throw new Error("GITHUB_TOKEN is required.");
  }
  if (!repository || repository.split("/").length !== 2) {
    throw new Error("GITHUB_REPOSITORY must have the form owner/repository.");
  }

  const [owner, name] = repository.split("/");
  const { repositoryId, categoryId } = await discoverRepositoryAndCategory(
    token,
    owner,
    name,
  );
  const discussions = await listCategoryDiscussions(token, owner, name, categoryId);
  const mappings = [];

  for (const post of posts) {
    const marker = markerFor(post.sourcePath);
    const matches = discussions.filter((discussion) => discussion.body.includes(marker));
    if (matches.length > 1) {
      throw new Error(
        `Multiple Discussions contain the marker for ${post.sourcePath}: ${matches
          .map((discussion) => `#${discussion.number}`)
          .join(", ")}`,
      );
    }

    let discussion = matches[0];
    if (!discussion) {
      discussion = await createDiscussion(token, repositoryId, categoryId, post);
      discussions.push(discussion);
      console.log(`Created Discussion #${discussion.number} for ${post.sourcePath}.`);
    } else if (discussion.title !== post.title) {
      discussion = await updateDiscussionTitle(token, discussion.id, post.title);
      console.log(`Updated Discussion #${discussion.number} title for ${post.sourcePath}.`);
    } else {
      console.log(`Reused Discussion #${discussion.number} for ${post.sourcePath}.`);
    }

    mappings.push({ sourcePath: post.sourcePath, discussion });
  }

  const dataDirectory = path.join(REPOSITORY_ROOT, "_data");
  await mkdir(dataDirectory, { recursive: true });
  await writeFile(
    path.join(dataDirectory, "discussions.yml"),
    discussionsYaml(mappings),
    "utf8",
  );
  console.log(`Generated _data/discussions.yml with ${mappings.length} entries.`);
}

async function main() {
  const allowedArguments = new Set(["--check"]);
  const unknownArguments = process.argv.slice(2).filter((argument) => !allowedArguments.has(argument));
  if (unknownArguments.length > 0) {
    throw new Error(`Unknown argument(s): ${unknownArguments.join(", ")}`);
  }

  const { posts, skipped, publishingConfig } = await discoverPublishedPosts();
  console.log(
    `Jekyll publishing settings: future=${publishingConfig.future}` +
      (publishingConfig.timezone ? `, timezone=${publishingConfig.timezone}` : ""),
  );
  for (const post of posts) {
    console.log(`Eligible post: ${post.sourcePath} (${post.title})`);
  }
  for (const post of skipped) {
    console.log(`Skipped post: ${post.sourcePath} (${post.reason})`);
  }

  if (process.argv.includes("--check")) {
    console.log(`Static check passed: ${posts.length} post(s) would be synchronized.`);
    return;
  }

  await synchronizeDiscussions(posts);
}

main().catch((error) => {
  console.error(`Discussion synchronization failed: ${error.message}`);
  process.exitCode = 1;
});
