---
title: "Maintaining Different SQLcl Versions for Different Repositories and Folders"
date: 2026-08-22
description: A PROMPT_COMMAND hook in ~/.bashrc that switches the SQLcl version on your PATH automatically whenever you change directory — useful during upgrades and when working across projects on different SQLcl releases.
tags:
  - sqlcl
  - sqlcl-projects
  - git
  - bash
---

When upgrading SQLcl alongside an active project, you often need two versions installed at the same time: the current production version for the main branch, and the new version for the upgrade branch. Git worktrees make the parallel branching easy, but they do not solve the PATH problem — the wrong `sql` binary is one forgotten `export` away. A small hook in `~/.bashrc` can make the right version load itself.

## TL;DR

- A `PROMPT_COMMAND` hook calls a function before every shell prompt, which means the SQLcl version on your PATH is recalculated automatically every time you change directory.
- The function matches a substring of `$PWD` and swaps PATH entries accordingly — no manual `export` needed, and the switch is immediate within the same terminal session.
- The same mechanism applies to any multi-project setup where different folders require different SQLcl releases.

## The upgrade scenario

Suppose your project runs on SQLcl 26.1 and you need to test an upgrade to 26.2. A Git worktree gives you a separate working directory for the upgrade branch alongside the existing repository:

```bash
git worktree add -b upgrade-26.2 ../my-project-26.2
```

Output should look something like this:

```text
Preparing worktree (new branch 'upgrade-26.2')
HEAD is now at 1a2b3c4 latest commit
```

You now have two directories in play:

- `/c/repo/github/my-project` — main branch, should use SQLcl 26.1
- `/c/repo/github/my-project-26.2` — upgrade branch, should use SQLcl 26.2

Keeping the right binary on PATH as you switch between them is the problem the hook below solves.

## The PROMPT_COMMAND hook

Add the following block to your `~/.bashrc`:

```bash
# ============================================================================
# Project-specific SQL PATH management
# Automatically switch between sqlcl-26.2 (for upgrade folders) and sqlcl-26.1
# ============================================================================
update_sql_path() {
    # Set upgrade_sql to your new SQLcl version path, latest_sql to your current production version.
    local upgrade_sql="/c/Install/sqlcl-26.2/sqlcl/bin"
    local latest_sql="/c/Install/sqlcl-26.1/sqlcl/bin"

    # Remove both versions from PATH first (clean base)
    PATH=$(echo "$PATH" | sed -E "s|${upgrade_sql}:?||g" | sed -E "s|${latest_sql}:?||g")

    if [[ "$PWD" == */*demo* || "$PWD" == */*26.2* ]]; then
        # In the 26.2 upgrade worktree — use the upgrade SQLcl.
        export PATH="${upgrade_sql}:${PATH}"
    else
        # All other folders — use the production SQLcl.
        export PATH="${latest_sql}:${PATH}"
    fi
}

# Hook into prompt — fires before every prompt, so every cd triggers a PATH update.
PROMPT_COMMAND="update_sql_path${PROMPT_COMMAND:+;$PROMPT_COMMAND}"

# Run once at shell startup so the right version is active before any cd.
update_sql_path
```

How it works:

- `PROMPT_COMMAND` is a bash variable that holds a command (or semicolon-separated list of commands) executed before every prompt is drawn. Since bash draws a new prompt after every command, the function fires automatically after every `cd`.
- `update_sql_path` strips both SQLcl bin paths from `PATH` to produce a clean base, then prepends the correct one based on a glob match against `$PWD`.
- The patterns (`*/*demo*` and `*/*26.2*`) match any directory whose full path contains `demo` or `26.2`. Adapt these globs to your own directory names.
- The final standalone `update_sql_path` call ensures the right version is active when the shell first starts, before any navigation has occurred.

A full version of this hook, maintained for real project use, is available in the <a href="https://github.com/akluev/realSQLclProject/blob/main/scripts/bash/tools/.bashrc" target="_blank" rel="noopener noreferrer">realSQLclProject repository</a>.

> **Tip:** To open `~/.bashrc` directly in VS Code from any terminal, run `code ~/.bashrc`. After saving your changes, reload with `source ~/.bashrc`.

## Testing it

After saving and running `source ~/.bashrc`, verify the hook in the upgrade directory:

```bash
source ~/.bashrc
pwd
sql -version
```

Output should look something like this:

```text
$ source ~/.bashrc
$ pwd
/c/repo/tests/demo1
$ sql -version
SQLcl: Release 26.2.0.0 Production Build: 26.2.0.181.2110
```

From a different directory, the production version is active:

```bash
source ~/.bashrc
pwd
sql -version
```

Output should look something like this:

```text
$ .  ~/.bashrc
$ pwd
/c/repo/github/akluev.github.io
$ sql -version
SQLcl: Release 26.1.2.0 Production Build: 26.1.2.132.1334
```

### The switch happens within the same session

Because `PROMPT_COMMAND` fires before every prompt, no re-sourcing or new terminal is needed. The session below is uninterrupted — the only action between the two `sql -version` calls is a single `cd`:

```text
$ pwd
/c/repo/tests/demo1
$ sql -version
SQLcl: Release 26.2.0.0 Production Build: 26.2.0.181.2110

$ cd ..
$ pwd
/c/repo/tests
$ sql -version
SQLcl: Release 26.1.2.0 Production Build: 26.1.2.132.1334
```

Stepping out of the matched directory reverts the PATH immediately. The developer never has to think about which version is active.

## Conclusion

This is a low-cost, zero-dependency trick — a few lines in a file you already have. Once configured, the workstation transparently supports multiple SQLcl versions at the same time, which is particularly valuable during upgrades and for environments where different projects are pinned to different releases.

The key advantage over a static approach — manually exporting PATH or sourcing a project-specific file — is that the PATH recalculation is continuous. Within the same terminal session, moving between directories always brings the correct `sql` binary with you. There is no stale state and no risk of running the wrong version because you forgot to re-export after switching branches.

The glob patterns in `update_sql_path` are the only thing you need to adjust for a new project or a different upgrade version. Everything else is infrastructure that, once in place, disappears into the background.

## Sources

- <a href="https://github.com/akluev/realSQLclProject/blob/main/scripts/bash/tools/.bashrc" target="_blank" rel="noopener noreferrer">realSQLclProject: .bashrc with project-specific SQL PATH management</a>
