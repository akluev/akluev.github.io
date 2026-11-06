---
title: "Keeping Up with SQLcl Project: A Regression Testing Tool and the 26.3 Results"
date: 2026-11-06
description: A deterministic regression suite for SQLcl Project, and what testing releases 26.1.2 through 26.3.1 reveals about APEX export, deployment, and persistent bugs.
tags:
  - sqlcl
  - sqlcl-project
  - oracle-apex
  - apexlang
  - liquibase
---

![Two cats playfully wrestling on a patterned rug](/assets/images/2026-11-06/cats-friendly-wrestling.jpg)

Every SQLcl release leaves me with the same question: can I remove any of my workarounds yet, or do I need another one?

> **Friendly wrestling**
>
> This post gets a little combative, so I chose a photo of my cats wrestling to set the mood. We're still friends. Think of this as friendly wrestling with a tool I want to succeed.
{: .callout .callout-question }

## TL;DR

Keeping track of SQLcl Project changes is getting difficult. New versions keep coming, things break, other things get fixed, and it is hard to know where we stand. I've written quite a few posts about these problems, but following up on my posts - and everyone else's - is becoming a project of its own.

So, with Claude's help, I built a regression testing tool for SQLcl Project. You can run it yourself, check the issues that matter to you, and add your own tests. Below, I'll briefly explain how it works, then walk through what I found when testing SQLcl versions from 26.1.2 through 26.3.1.

When it comes to 26.3.1, these are the main findings:

- 26.3.0 added one regression; 26.3.1 adds none and fixes three APEXlang-mode export bugs.
- The biggest concern remains the split between APEXlang and readable source structures, which started with 26.2.2.
- APEXlang deployment has two separate issues. The most troubling: when the application import fails, the changeset is still recorded as run.
- Last but not least, ORDS export still targets the connected user instead of the project schema. Oracle confirmed it against 26.1, and it is still not fixed several releases later.
- A few problems still need workarounds, although they should simply have been fixed.

For now, I am staying on SQLcl 26.1, where all my existing workarounds still work.

## A tool to keep track of it all

The <a href="https://github.com/akluev/realSQLclProject/blob/main/regression/README.md" target="_blank" rel="noopener noreferrer">regression suite</a> lives in my realSQLclProject repository. It is a collection of Bash scripts, a JSON test catalogue, and a small demo project that gives the tests something repeatable to work against.

### How it works

Claude helped me build it, and AI assistance is useful when adding another test: reproduce the problem, turn it into explicit checks, then try those checks against versions where the behaviour differs. Once written, though, the test is a deterministic script. Running the suite does not require Claude, another AI service, or someone asking a model whether the output looks right.

The catalogue, `tests.json`, describes each issue: what to run, what success means, affected versions, severity, links, and any workaround. Each automated test has its own `issues/<id>/test.sh`. The scripts run documented SQLcl commands and check the actual result: files, their contents, database values, or command output. That last point matters because a command returning successfully does not always mean that SQLcl did the work successfully.

A <a href="https://github.com/akluev/realSQLclProject/blob/main/.claude/skills/sqlcl-regression/SKILL.md" target="_blank" rel="noopener noreferrer">Claude Code skill</a> explains how to run and maintain the suite, investigate results, and build new test cases. It is useful assistance around the tool; the scripts can also run directly.

### Running it yourself

You need Bash (Git Bash on Windows), Git, jq, SQLcl 26.1 or later, and a disposable database environment with APEX and ORDS for the supplied demo. The demo project comes in a zip file. Unpack it outside any other Git repository, copy `config.example.sh` to `config.sh`, and set your paths and saved SQLcl connections: an installer connection and a project-schema connection. The <a href="https://github.com/akluev/realSQLclProject/blob/main/regression/README.md" target="_blank" rel="noopener noreferrer">README</a> walks through the setup.

> **Use a disposable test environment**
>
> A run restores the demo repository to its baseline and drops and recreates its schema, APEX workspace, and ORDS definitions. The demo also contains a published schema password. Follow the README's local test-environment requirements.
{: .callout .callout-issue }

From the realSQLclProject repository, after configuring the corresponding SQLcl installation:

```shell
bash regression/run.sh 26.3.1
bash regression/report.sh
```

To run just <a href="https://github.com/akluev/realSQLclProject/blob/main/regression/tests.md#t007" target="_blank" rel="noopener noreferrer">test 007</a> in APEXlang mode against SQLcl 26.3.1:

```bash
bash regression/run.sh 26.3.1 --mode apexlang 007
```

Without `--mode`, tests affected by `apex.apexlang` normally run in both modes, so a fix in one cannot hide a failure in the other.

Each release gets `results.json` and `results.md`. The JSON is available for CI/CD integration; a pipeline can inspect it and apply its own failure policy. The Markdown is for people, with observations, timings, and separately reported workaround checks. A working workaround does not turn a failed product test into a pass.

The reports also compare each test with its result in the previous tested release. PASS to FAIL means a regression; FAIL to PASS means a fix. These are checks for specific known behaviours, rather than a claim to cover everything SQLcl Project can do.

## What the results show

The best starting point is the <a href="https://github.com/akluev/realSQLclProject/blob/main/regression/results/README.md#results-by-version" target="_blank" rel="noopener noreferrer">results-by-version table</a>. The individual reports contain the details for <a href="https://github.com/akluev/realSQLclProject/blob/main/regression/results/26.3.0/results.md" target="_blank" rel="noopener noreferrer">26.3.0</a> and <a href="https://github.com/akluev/realSQLclProject/blob/main/regression/results/26.3.1/results.md" target="_blank" rel="noopener noreferrer">26.3.1</a>, run on 3 and 4 November 2026 respectively.

### Credit where it is due

- **26.3.0 fixes** synonym export (<a href="https://github.com/akluev/realSQLclProject/blob/main/regression/tests.md#t004" target="_blank" rel="noopener noreferrer">004</a>) and readable-mode staging of APEX supporting-object scripts (<a href="https://github.com/akluev/realSQLclProject/blob/main/regression/tests.md#t015" target="_blank" rel="noopener noreferrer">015</a>).
- **26.3.1 fixes** three APEXlang-mode cases: preserving filename case (<a href="https://github.com/akluev/realSQLclProject/blob/main/regression/tests.md#t001" target="_blank" rel="noopener noreferrer">001</a>), exporting binary files without corruption (<a href="https://github.com/akluev/realSQLclProject/blob/main/regression/tests.md#t002" target="_blank" rel="noopener noreferrer">002</a>), and producing source that passes `apex validate` (<a href="https://github.com/akluev/realSQLclProject/blob/main/regression/tests.md#t005" target="_blank" rel="noopener noreferrer">005</a>).

Those are welcome fixes.

### New regressions

26.3.0 introduced one regression: APEXlang staging regenerates unwanted legacy SQL deployment includes alongside the APEXlang controller (<a href="https://github.com/akluev/realSQLclProject/blob/main/regression/tests.md#t022" target="_blank" rel="noopener noreferrer">022</a>). 26.3.1 adds no new regressions, but 022 is still there. More on that below.

But reading across the rows tells a more troubling story than counting green cells.

### The biggest concern: one deployment setting, two source structures

<a href="https://github.com/akluev/realSQLclProject/blob/main/regression/tests.md#t006" target="_blank" rel="noopener noreferrer">Test 006</a> is where I would start. The <a href="https://docs.oracle.com/en/database/oracle/sql-developer-command-line/26.3/sqcug/apexlang-project-structure-apexlang.html#GUID-101A04E5-6154-4BD9-8DDE-8E9CBF4882DF" target="_blank" rel="noopener noreferrer">documented structure</a> puts APEXlang source under `f<app_id>/<alias>/`. That is perfectly sensible: export application 106, find its material under `f106`, and find the APEXlang application beneath its alias directory.

That gives SQLcl Project an obvious application container and provides the alias-rooted APEXlang directory for `apex validate` and `apex import`. Standalone `apex export` produces the alias container; keeping that beneath `f<app_id>/` lets it fit into the Project structure, which matters when using standalone export to work around problems in Project export.

Instead, three releases in a row (26.2.2, 26.3.0 and 26.3.1) have used mode-dependent layouts that do not match the documented `f106/demo1/`:

- **Readable mode** flattened the APEXlang source into `f106/` in 26.2.2; by 26.3.1 it is under `f106/readable/`.
- **APEXlang mode** puts it directly under `demo1/`, with the application-ID parent missing altogether.

I discussed the earlier changes in <a href="https://alexonapex.com/blog/2026/09/11/sqlcl-project-26-2-2-two-apexlang-directory-structures-one-migration-blocker/" target="_blank" rel="noopener noreferrer">my post about SQLcl Project 26.2.2</a>. We are still dealing with them.

For example, in APEXlang mode, I explicitly asked for `project export -o APEX.106`, then looked at the result and found no directory for application 106. Why remove that boundary from the Project structure? Grouping the source beneath the immutable application ID lets me keep control of it when the mutable alias changes. The alias can change inside `f106/` without changing the application's place in the repository. Losing that grouping is surprising and counterintuitive.

> **Let deployment settings control deployment**
>
> In my opinion, `apex.apexlang` would be a great project setting for choosing APEXlang versus SQL deployment. What I don't get is why choosing that deployment method should also reorganise the exported source.
{: .callout .callout-issue }

I want export options to choose the representations I need: APEXlang, SQL, or both. If I choose APEXlang deployment, staging should copy the APEXlang files into `dist` and generate the appropriate deployment controller. The source structure and the correctness of its contents should remain consistent.

If those settings disagree, give me a concise error. `apex.apexlang=true` without APEXlang source? "APEXlang deployment requires APEXlang export." `apex.apexlang=false` without SQL source? "SQL deployment requires SQL export." Tell me my deployment and export settings are out of sync. Exporting only APEXlang should be perfectly fine when I deploy with APEXlang; exporting only SQL should be fine when I deploy with SQL.

I may also want to export both, deploy with APEXlang today, and switch to SQL deployment in the next release. That should change the deployment material, without triggering a directory reshuffle or repository rework.

Dealing with two structures when one would do is already a burden. Unfortunately, each of them also fails in different places:

| Test | Readable mode | APEXlang mode |
|---|---|---|
| <a href="https://github.com/akluev/realSQLclProject/blob/main/regression/tests.md#t002" target="_blank" rel="noopener noreferrer">002: binary static files</a> | Fixed in 26.2.2; still passes in 26.3.1. | Still corrupts all six tested files in 26.3.0; fixed in 26.3.1. |
| <a href="https://github.com/akluev/realSQLclProject/blob/main/regression/tests.md#t001" target="_blank" rel="noopener noreferrer">001: filename case</a> | Still lowercases the tested mixed-case filename in 26.3.1. | Fixed in 26.3.1. |
| <a href="https://github.com/akluev/realSQLclProject/blob/main/regression/tests.md#t005" target="_blank" rel="noopener noreferrer">005: exported APEXlang validates</a> | Still fails in 26.3.1 because the filename no longer matches its reference. | Fixed in 26.3.1. |
| <a href="https://github.com/akluev/realSQLclProject/blob/main/regression/tests.md#t003" target="_blank" rel="noopener noreferrer">003: deleted page files</a> | Still leaves the deleted page's file behind in 26.3.1. | Passes from 26.2.2 onwards. |
| <a href="https://github.com/akluev/realSQLclProject/blob/main/regression/tests.md#t021" target="_blank" rel="noopener noreferrer">021: exporting again</a> | Allows the second export. | Rejects the target's uncommitted changes. |

So why two structures at all, when one would do? My guess, and it is only a guess, is that each structure now has its own code path. That would explain why a fix reaches one mode while the other keeps failing, or why one mode removes a deleted page while the other leaves it behind. For those of us using SQLcl Project, it means two sets of expectations, two sets of workarounds, and twice as many tests to keep track of them. Switching deployment modes becomes much harder than it should be.

> **One structure is enough**
>
> One APEXlang structure would be simpler for Oracle to maintain and for the rest of us to rely on.
{: .callout .callout-question }

Test 021 adds another oddity. Export the application, then export it again without committing. Nothing has changed in APEX, but APEXlang mode refuses to write into the target because it has uncommitted changes from the first export.

The following is an excerpt from the second export's diagnostic:

```text
SQL> project export -o APEX.106
...
APEXlang export target has tracked or untracked Git changes: src\database\demo1\apex_apps\demo1. Commit, stash, or remove those changes before re-exporting.
...
```

I can guess the intention: APEXlang source is meant to be edited by hand, and an export could overwrite edits that only exist on disk. But the check cannot tell my edits from its own previous output. It refuses a second export where nothing has changed, and it refuses an export right after `apex import`, when my edits are already in the database. When to commit or stash is between me and Git.

If SQLcl Project wants to protect uncommitted files, fine: refuse by default, and give me a force option for when I know what I am doing. That is nothing new in our industry. `rm` will not remove a directory by default, but `rm -rf` will. SQLcl already does this elsewhere: standalone `apex export -force` removes the existing directory and files before exporting, and `project gen-artifact -force` overwrites an existing artifact. `project export` has no such option.

> **One application export, one source structure**
>
> - The APEXlang layout in test 006 appears to be treated as a feature, despite disagreeing with the team's own documentation and, in my view, good source-control practice.
> - The documented `f<app_id>/<alias>/` structure gives each application a stable boundary beneath its immutable ID, with the mutable alias inside it. Removing that ID container and using the alias as the application root takes that boundary away.
> - The alternative readable-mode structure changes between releases and does not preserve the alias-rooted layout expected by the APEXlang commands. Its generated APEXlang source still fails `apex validate` in the tested case. What use is readable source that I cannot reliably validate or import?
> - Why do we need to deal with two source structures at all? Their different failure histories are already difficult enough to maintain. Strange restrictions, such as preventing a second export until I commit or stash, make things even worse.
> - I see no benefit in this split. The documented structure implemented in 26.1 was perfectly fine. Return to one consistent application export, put the export fixes there so both deployment modes benefit, and keep `apex.apexlang` for choosing APEXlang versus SQL deployment.
{: .callout .callout-issue }

### And the APEXlang deployment still has serious problems

After accepting all of that, you would at least hope the generated APEXlang deployment was reliable. <a href="https://github.com/akluev/realSQLclProject/blob/main/regression/tests.md#t022" target="_blank" rel="noopener noreferrer">Test 022</a> and <a href="https://github.com/akluev/realSQLclProject/blob/main/regression/tests.md#t023" target="_blank" rel="noopener noreferrer">test 023</a> are the next unpleasant surprise.

In 022, the old application deployment is removed and regenerated from scratch. APEXlang mode should produce the APEXlang controller, `demo1/demo1.xml`. Instead, staging writes three includes into `apex.changelog.xml`: the legacy `f106/f106.sql`, the legacy `f106/f106.xml`, and `demo1/demo1.xml`.

These are active generated deployment instructions. Why is staging putting the legacy material back after it was deliberately removed? This passed in 26.2.2, regressed in 26.3.0, and still fails in 26.3.1. <a href="https://github.com/akluev/realSQLclProject/blob/main/regression/tests.md#t010" target="_blank" rel="noopener noreferrer">Test 010</a> shows the related migration problem: switching an existing project to APEXlang mode also leaves the legacy controller included. Starting over, as 022 does, does not solve it.

Test 023 is worse. The generated `apex import` command does not specify the workspace, so when more than one workspace is available to the installer, it fails with the error: "Multiple workspaces available, use the workspaceId or the workspace option."

Here is an excerpt from running the generated installer; other output is omitted:

```text
SQL> cd dist
SQL> @install
...
--Starting Liquibase at 2026-11-04T13:17:17.466744400 using Java 17.0.13 (version 4.33.0 #0 built at 2025-12-09 17:47+0000)
Running Changeset: releases/apex/demo1/demo1.xml::INSTALL_demo1::SQLCL-Generated
PL/SQL procedure successfully completed.

Multiple workspaces available, use the workspaceId or the workspace option.

UPDATE SUMMARY
Run:                          1
Previously run:              38
Filtered out:                 0
-------------------------------
Total change sets:           39
...
```

The output shows that Liquibase considers the changeset run (`Run: 1`), and the failed changeset is recorded in `DATABASECHANGELOG` as run.

> **A failed import recorded as success**
>
> I find this behaviour the most troubling. An application import failed, but the deployment history says the changeset ran. A deployment process needs to propagate the failure so automation can stop; recording it as completed hides the problem at exactly the point where we need a dependable answer.
{: .callout .callout-issue }

### ORDS export still targets the connected user

<a href="https://github.com/akluev/realSQLclProject/blob/main/regression/tests.md#t011" target="_blank" rel="noopener noreferrer">Test 011</a> covers a very ordinary project scenario: connect through the installer account and export the configured project schema, including its ORDS definitions.

SQLcl instead tries to export ORDS for the connected user. In the 26.3.1 run, the debug output complains that the installer account (`CLA_DEPLOYER` in my test) is not REST-enabled, while the definitions we need belong to the schema account `DEMO1`.

Having a REST-enabled application schema and a separate installer account is a common setup, and this is not a new issue. I <a href="https://forums.oracle.com/ords/apexds/post/sqlcl-project-ords-export-should-use-configured-project-sch-9778" target="_blank" rel="noopener noreferrer">formally reported it against 26.1, and Oracle confirmed it</a>, but I remember running into it back in the 25.x releases too. The suite shows it still failing in every tested release from 26.1.2 through 26.3.1.

What puzzles me is that everything needed for a fix already exists. The project configuration already lists its schemas. ORDS provides `ORDS_EXPORT` for exporting your own schema's definitions and `ORDS_EXPORT_ADMIN` for exporting another schema's. Choosing between the two follows a simple rule: if I am connected as the project schema, use `ORDS_EXPORT`; if not, use `ORDS_EXPORT_ADMIN`. With all the pieces available, I expected this to be one of the first things fixed. Several releases later, it still isn't, and I would expect this setup to affect quite a few customers.

### Why are we still carrying these workarounds?

Two more examples deserve attention without turning this post into another full bug catalogue.

**<a href="https://github.com/akluev/realSQLclProject/blob/main/regression/tests.md#t007" target="_blank" rel="noopener noreferrer">007: asking for one application exports unrelated material.</a>** In both modes, the 26.3.1 run writes 14 files outside the requested application, across multiple schemas. The workaround is to exclude `TABLES_DML` and `ALL_USERS` in `project.filters`. The suite checks those filters, and they work.

But come on: why do we need them? Asking for `APEX.106` should restrict the export to that application. A filter that prevents unrelated users and data from appearing should not be essential housekeeping for a targeted export. This <a href="https://forums.oracle.com/ords/apexds/post/apex-app-project-export-is-exporting-application-dml-data-a-4157" target="_blank" rel="noopener noreferrer">reported issue</a> still fails from 26.2.2 through 26.3.1.

**<a href="https://github.com/akluev/realSQLclProject/blob/main/regression/tests.md#t008" target="_blank" rel="noopener noreferrer">008: staging rejects a controller generated by an earlier SQLcl version.</a>** In readable mode, staging refuses the existing `f106/f106.xml` controller because it supposedly "has been edited". The controller came from the earlier SQLcl version. The workaround is to delete it so staging can regenerate it.

Upgrading SQLcl should not require deleting SQLcl's own generated files to persuade the next version to continue. This still fails in 26.3.1, after failing in 26.2.2 and 26.3.0.

Individually, a filter or a file deletion may sound small. Together, they become the collection of special rules everyone has to remember, document, automate, and check again after the next upgrade. That is exactly why I wanted a regression suite.

## Conclusion

I still want SQLcl Project to succeed. The fixes in 26.3.0 and 26.3.1 are welcome, and having no newly detected regressions in 26.3.1 is good news. But even 26.3.1 still has fundamental issues that affect its reliability, including an application import that fails while its changeset is recorded as run.

The dual source structure has now survived three releases, with the drawbacks described above and in <a href="https://alexonapex.com/blog/2026/09/11/sqlcl-project-26-2-2-two-apexlang-directory-structures-one-migration-blocker/" target="_blank" rel="noopener noreferrer">my previous post about version 26.2.2</a>. I still want one consistent source structure.

**In the meantime, one of the main reasons for this article is to share the regression suite.** It took a few days and quite a few AI tokens to develop and test it end to end, so I hope it gives you a useful way to check what changed. Try it against your SQLcl installation, inspect the results, and add tests for the behaviours your projects depend on.

> **Staying on SQLcl 26.1**
>
> For now, I am still staying on SQLcl 26.1, where all my existing workarounds work.
{: .callout .callout-question }

## Acknowledgements

Thanks to <a href="https://www.linkedin.com/in/matt-mulvaney-541a659/" target="_blank" rel="noopener noreferrer">Matt Mulvaney</a> for encouraging me to test SQLcl Project and write shorter blog posts. This one may not be short, but I tried my best to make it shorter. At least the testing part is automated now, so the next SQLcl Project upgrade may get the shortest post possible: no post at all, just a new row of test results. 🙂

## Sources

- <a href="https://github.com/akluev/realSQLclProject/blob/main/regression/tests.md#t001" target="_blank" rel="noopener noreferrer">Regression test 001: project export lowercases APEXlang file and folder names</a>
- <a href="https://github.com/akluev/realSQLclProject/blob/main/regression/tests.md#t002" target="_blank" rel="noopener noreferrer">Regression test 002: project export corrupts binary APEX static files</a>
- <a href="https://github.com/akluev/realSQLclProject/blob/main/regression/tests.md#t003" target="_blank" rel="noopener noreferrer">Regression test 003: project export keeps files of APEX components deleted in APEX</a>
- <a href="https://github.com/akluev/realSQLclProject/blob/main/regression/tests.md#t004" target="_blank" rel="noopener noreferrer">Regression test 004: project export -o does not export synonyms</a>
- <a href="https://github.com/akluev/realSQLclProject/blob/main/regression/tests.md#t005" target="_blank" rel="noopener noreferrer">Regression test 005: APEXlang source written by project export fails apex validate</a>
- <a href="https://github.com/akluev/realSQLclProject/blob/main/regression/tests.md#t006" target="_blank" rel="noopener noreferrer">Regression test 006: project export does not use the documented f&lt;app_id&gt;/&lt;alias&gt;/ folder</a>
- <a href="https://github.com/akluev/realSQLclProject/blob/main/regression/tests.md#t007" target="_blank" rel="noopener noreferrer">Regression test 007: project export -o APEX.&lt;id&gt; exports users and data that were not requested</a>
- <a href="https://github.com/akluev/realSQLclProject/blob/main/regression/tests.md#t008" target="_blank" rel="noopener noreferrer">Regression test 008: project stage refuses the APEX controller generated by an earlier SQLcl version</a>
- <a href="https://github.com/akluev/realSQLclProject/blob/main/regression/tests.md#t010" target="_blank" rel="noopener noreferrer">Regression test 010: switching to APEXlang mode leaves the legacy SQL controller in apex.changelog.xml</a>
- <a href="https://github.com/akluev/realSQLclProject/blob/main/regression/tests.md#t011" target="_blank" rel="noopener noreferrer">Regression test 011: project export exports ORDS of the connected user instead of the project schemas</a>
- <a href="https://github.com/akluev/realSQLclProject/blob/main/regression/tests.md#t015" target="_blank" rel="noopener noreferrer">Regression test 015: project stage fails with hash errors on APEX supporting object scripts</a>
- <a href="https://github.com/akluev/realSQLclProject/blob/main/regression/tests.md#t021" target="_blank" rel="noopener noreferrer">Regression test 021: a second project export with nothing changed fails in APEXlang mode</a>
- <a href="https://github.com/akluev/realSQLclProject/blob/main/regression/tests.md#t022" target="_blank" rel="noopener noreferrer">Regression test 022: regenerated APEXlang deployment brings back legacy f&lt;app_id&gt; includes</a>
- <a href="https://github.com/akluev/realSQLclProject/blob/main/regression/tests.md#t023" target="_blank" rel="noopener noreferrer">Regression test 023: APEXlang deployment fails with multiple workspaces and records the changeset as run</a>
- <a href="https://github.com/akluev/realSQLclProject/blob/main/regression/README.md" target="_blank" rel="noopener noreferrer">Regression suite setup and usage</a>
- <a href="https://github.com/akluev/realSQLclProject/blob/main/.claude/skills/sqlcl-regression/SKILL.md" target="_blank" rel="noopener noreferrer">Claude Code SQLcl regression skill</a>
- <a href="https://github.com/akluev/realSQLclProject/blob/main/regression/results/README.md#results-by-version" target="_blank" rel="noopener noreferrer">Regression results by version</a>
- <a href="https://github.com/akluev/realSQLclProject/blob/main/regression/results/26.3.0/results.md" target="_blank" rel="noopener noreferrer">SQLcl 26.3.0 regression results</a>
- <a href="https://github.com/akluev/realSQLclProject/blob/main/regression/results/26.3.1/results.md" target="_blank" rel="noopener noreferrer">SQLcl 26.3.1 regression results</a>
- <a href="https://docs.oracle.com/en/database/oracle/sql-developer-command-line/26.3/sqcug/apexlang-project-structure-apexlang.html#GUID-101A04E5-6154-4BD9-8DDE-8E9CBF4882DF" target="_blank" rel="noopener noreferrer">Oracle: APEXlang project structure</a>
- <a href="https://alexonapex.com/blog/2026/09/11/sqlcl-project-26-2-2-two-apexlang-directory-structures-one-migration-blocker/" target="_blank" rel="noopener noreferrer">SQLcl Project 26.2.2: Two APEXlang Directory Structures, One Migration Blocker</a>
- <a href="https://forums.oracle.com/ords/apexds/post/sqlcl-project-ords-export-should-use-configured-project-sch-9778" target="_blank" rel="noopener noreferrer">Oracle Forums: ORDS export should use configured project schemas</a>
- <a href="https://forums.oracle.com/ords/apexds/post/apex-app-project-export-is-exporting-application-dml-data-a-4157" target="_blank" rel="noopener noreferrer">Oracle Forums: application export also exports unrelated data and users</a>
