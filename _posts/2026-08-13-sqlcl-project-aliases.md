---
title: "SQLcl Project Aliases: A Practical Toolkit for Daily Development"
date: 2026-08-13
description: A practical collection of SQLcl aliases for safer SQLcl Project exports, deployments, Liquibase operations, and APEXlang development.
---

Working professionally with SQLcl Project requires more than learning the `project` command. The day-to-day workflow sits at the intersection of three tools:

- SQLcl Project exports, stages, and packages database changes.
- Liquibase tracks and deploys changesets.
- Git records, reviews, and merges the resulting files.

A productive workflow therefore requires a solid command of SQLcl and Git as well as SQLcl Project itself. The commands are powerful, but some of the most useful ones are long, require several arguments, or must be run from a particular directory. Re-entering them by hand creates friction and leaves room for mistakes.

SQLcl aliases are a simple way to turn those multi-step operations into short, consistent commands.

This article focuses on the aliases I use most often. For the broader command reference, including SQLcl Project, Liquibase, Git, SQLcl, and changeset directives, see my <a href="https://github.com/akluev/realSQLclProject/blob/main/docs/12.-Common-Commands-and-Directives.md" target="_blank" rel="noopener noreferrer">SQLcl Project command cheat sheet</a>.

## Why SQLcl aliases deserve more attention

An alias is not limited to replacing one command with a shorter name. It can contain SQL, PL/SQL, SQLcl commands, host commands, bind arguments, prompts, and a sequence of operations. In other words, it can capture a small, repeatable workflow behind one memorable command.

Oracle's <a href="https://docs.oracle.com/en/database/oracle/sql-developer-command-line/26.1/sqcug/oracle-sqlcl-users-guide.pdf" target="_blank" rel="noopener noreferrer">SQLcl User's Guide</a> documents aliases as shortcuts for SQL, PL/SQL, or SQL*Plus scripts. Jeff Smith has also demonstrated practical aliases with bind variables in <a href="https://www.thatjeffsmith.com/archive/2015/11/object-search-in-sqlcl/" target="_blank" rel="noopener noreferrer">his SQLcl examples</a>.

Aliases become even more useful in agent-assisted development. In my setup, aliases loaded into the SQLcl environment can also be invoked through the SQLcl MCP server. An agent skill can describe when an alias is appropriate, while the alias itself provides the deterministic implementation. The agent does not need to reconstruct a long command line or remember repository-specific paths every time.

## Load the alias collection

My aliases are stored in the realSQLclProject repository as <a href="https://github.com/akluev/realSQLclProject/blob/main/scripts/xml/sqlcl-project-aliases.xml" target="_blank" rel="noopener noreferrer"><code>scripts/xml/sqlcl-project-aliases.xml</code></a>. Every public alias starts with `prj_`, which makes the collection easy to identify and reduces the chance of colliding with aliases already installed by a user.

You do not need to clone the complete repository. You can <a href="https://raw.githubusercontent.com/akluev/realSQLclProject/refs/heads/main/scripts/xml/sqlcl-project-aliases.xml" target="_blank" rel="noopener noreferrer" download>download the alias XML file directly</a>, save it anywhere convenient, and load it from that location in SQLcl:

```sql
cd <download-directory>
alias load sqlcl-project-aliases.xml
```

If you clone realSQLclProject instead, start SQLcl in the repository root and load the version-controlled file in place:

```sql
alias load scripts/xml/sqlcl-project-aliases.xml
```

Then confirm that the aliases are available:

```sql
alias list
```

The command transcripts in this article retain their original environment and object names. Repetitive sections are explicitly marked as skipped, and database connection details are redacted.

```text
SQL> alias list
lbs
prj_compile
prj_drift_cleanup
prj_exp_app
prj_force_apex
prj_install
prj_mr
prj_rm_logs
prj_rm_ords
prj_status
prj_sync
prj_validate
SQL>
```

The aliases fall naturally into three groups:

1. Workarounds for SQLcl Project behavior that needs additional handling.
2. Shortcuts for frequently used Project and Liquibase operations.
3. APEXlang validation and import commands.

## Group 1: Workarounds and cleanup

### `prj_exp_app`: a safer APEX application export

In my SQLcl 26.1.2 workflow, `project export` has two serious problems for APEX applications:

1. **It does not clean the existing APEXlang source directory.** Suppose an export contains page 8, and page 8 is later deleted in APEX. The next `project export` writes the current application files but leaves the obsolete page 8 file behind. The same problem applies to deleted or renamed components and static files. The directory is no longer a faithful representation of the application, and a later APEXlang import can process source that should have disappeared.
2. **It corrupts binary files in the APEXlang export.** In SQLcl 26.1.2, exported images, application icons, and attachments are consistently damaged by incorrect binary and CRLF handling in this path. These are not harmless textual differences: the files themselves cannot be trusted or used as a clean source-controlled export.

Until those issues are resolved in the version I use, I run `prj_exp_app` instead of calling the Project export command directly:

```sql
conn -name proj_dev
prj_exp_app 110
```

The alias accepts the application ID and first runs:

```text
project export -o APEX.110
```

That first step remains necessary because SQLcl Project generates the `fNNN.sql` application script used later for staging and deployment. In this workaround, generating that deployment file is the reason to retain the `project export` step.

For SQLcl 26.1.2, the alias then runs a direct APEXlang export with the equivalent of:

```text
apex export -applicationid 110 -exptype APEXLANG -dir <application-directory> -force
```

The alias derives the actual directory from `apex_applications` and uses the short `-f` form of `-force`. That option removes the existing export directory before recreating it. Deleted pages, renamed components, obsolete static files, and other stale source therefore disappear. The clean APEX export also replaces the binary files written by `project export`.

The resulting directory contains both things the workflow needs:

- the `fNNN.sql` deployment script generated by SQLcl Project; and
- a clean, current APEXlang source tree generated by `apex export`.

On other detected SQLcl versions, the alias keeps the Project export and validates the resulting APEXlang application instead of applying the 26.1.2 re-export workaround.

```text
SQL> conn -n proj_dev
Connected.
SQL> prj_exp_app 100

APP_ID
--------------------------------
100

Exporting APEX Application ID 100..
*** APEX_APPLICATIONS ***
Exporting Workspace DEMO1 - application 100:DEMO_APP
-------------------------------
APEX_APPLICATION              1
-------------------------------
Exported 1 objects
Elapsed 46 sec

Bug in 26.1 -Rexported application 100 to src/database/cla_apex/apex_apps/f100
Exporting Workspace DEMO1 - application 100:DEMO_APP
File src\database\cla_apex\apex_apps\f100\demo_app\application.apx created
```

This is deliberately a version-aware workaround, not a claim that every SQLcl release behaves the same way. Review the alias before using it with a newer release and remove the workaround when it is no longer necessary. The binary-export problem and stale-directory behavior are documented in the Oracle Forum reports listed in the References section.

### `prj_rm_ords`: remove false ORDS changes

In SQLcl Project 26.1, every `project stage` run regenerates files under `dist/releases/ords/<schema>/`, even when the ORDS metadata has not changed. In a minimal reproduction, the generated SQL stayed logically identical while its autogenerated Liquibase changeset ID changed. The result is a permanent Git diff that creates unnecessary merge conflicts, pollutes history, and makes a real ORDS change harder to notice. The behavior can occur even when the ORDS export type is disabled.

After I verify that the ORDS differences are spurious, I use:

```sql
prj_rm_ords
```

The alias runs `git restore` against `dist/releases/ords` in both the working tree and the Git index.

This safeguard matters: `prj_rm_ords` discards the staged and unstaged ORDS differences in that path. Always inspect the diff first. If the export contains a real ORDS change, do not run the alias.

```text
SQL> project stage

Stage is Comparing:
Old Branch      refs/heads/main
New Branch      refs/heads/demo1

Stage processing completed, please review and commit your changes to repository

SQL> ! git status --short
 M dist/releases/next/changes/demo1/stage.changelog.xml
 M dist/releases/ords/cla_apex/ords.sql
 M dist/releases/ords/cla_public/ords.sql

SQL> prj_rm_ords
Removing fake changes in ORDS schema...

SQL> ! git status --short
 M dist/releases/next/changes/demo1/stage.changelog.xml

SQL>
```

The collection also includes `prj_drift_cleanup`, which runs the repository's broader drift-cleanup script to remove ORDS noise, whitespace differences, and other export artifacts during drift analysis.

## Group 2: Daily Project and Liquibase shortcuts

### `prj_install`: deploy directly from the repository

SQLcl Project provides `project gen-artifact` and `project deploy`, and those commands are indispensable when producing a controlled artifact for a DBA, an artifact repository, or a production deployment process.

That is not always the fastest feedback loop for environments controlled by the development team. In a unit-test, integration, or other developer-managed environment, I usually want to deploy the latest repository state, inspect the log, correct a problem, and run the installation again.

For that workflow, `prj_install` is the command I use most:

```sql
conn -name proj_test
prj_install
```

It changes into the `dist` directory, runs `@install.sql`, and returns to the repository root. The alias captures the ordinary non-production path without pretending that it replaces artifact-based release management.

```text
SQL> prj_install
Running Project Installer Script...
Installing/updating schemas
--Starting Liquibase at 2026-08-14T22:56:58.946607500 using Java 17.0.13 (version 4.33.0 #0 built at 2025-12-09 17:47+0000)
Running Changeset: releases\apex\f106\f106.xml::INSTALL_106::SQLCL-Generated
--application/set_environment
API Last Extended:20260330
Your Current Version:20260330
This import is compatible with version: 20260330
COMPATIBLE (You should be able to run this import without issues.)
ID offset during import: 23175081927095270
New ID offset for application: 0

APPLICATION 106 - EMP & DEPT Mini Hub
[APEX application component output skipped]
--application/end_environment
... elapsed: 5.07 sec

...done
Running Changeset: releases\apex\f120\f120.xml::INSTALL_120::SQLCL-Generated
--application/set_environment
API Last Extended:20260330
Your Current Version:20260330
This import is compatible with version: 20260330
COMPATIBLE (You should be able to run this import without issues.)
ID offset during import: 23178133412095845
New ID offset for application: 0

APPLICATION 120 - Working Copy Test
[APEX application component output skipped]
--application/end_environment
... elapsed: 1.44 sec

...done

UPDATE SUMMARY
Run:                          2
Previously run:              35
Filtered out:                 0
-------------------------------
Total change sets:           37

Liquibase: Update has been successful. Rows affected: 0

Produced logfile: sqlcl-lb-1786762618943.log

Operation completed successfully.

Invalid object counts (INVALID status only):

Compiling invalid objects...

Compiling DEMO1 ...Done!

Invalid object counts after recompilation (INVALID status + synonyms with missing targets):

OWNER                OBJECT_TYPE             OBJECT_COUNT INVALID_COUNT
-------------------- ----------------------- ------------ -------------
DEMO1                INDEX                              6
DEMO1                LOB                                1
DEMO1                SEQUENCE                           2
DEMO1                TABLE                              4

Invalid objects:

0 rows selected.

Compilation errors:

0 rows selected.

Other compilation errors not listed
-----------------------------------
                                  0
SQL>
```

### `prj_status`: preview the next installation

Before an installation, I run:

```sql
conn -name proj_test
prj_status
```

The alias changes into `dist` and executes:

```text
lb status -changelog-file releases/main.changelog.xml
```

I think of this as an installation dry run. It shows the pending changesets that Liquibase currently believes it should apply. That simple preview can reveal that I connected to the wrong database, that a changeset belongs to another developer's unfinished work, or that the target environment's deployment history does not match my expectations.

`prj_status` does not prove that an installation will succeed, but it is a valuable last check before changing an environment.

```text
SQL> prj_status
Running the Liquibase Status Command to show pending changesets...
--Starting Liquibase at 2026-08-14T22:30:38.284170600 using Java 17.0.13 (version 4.33.0 #0 built at 2025-12-09 17:47+0000)
17 changesets have not been applied to CLA_DEPLOYER@[connection details redacted]
     aop_upgrade_25.2\_custom\aop_install.xml::SqlCl:1769116579255.1.1::SQLCL-Generated
     tacrep-11/cla_apex/package_specs/erp_emergency_event_util.sql::1784667704068::CLA_APEX
     tacrep-11/cla_apex/tables/erp_app_substitution.sql::1784667702170::CLA_APEX
     [12 additional changesets skipped]
     releases\apex\f1968\f1968.xml::INSTALL_1968::SQLCL-Generated
     _custom/custom_prompt.sql::1786760223440::SqlCl

Operation completed successfully.

SQL>
```

### `prj_sync`: record a baseline without executing changes

Sometimes an environment already contains the state described by the repository. This is common while establishing a baseline, mitigating drift, or reconciling hotfixes. In that situation, running every historical changeset would be unnecessary or harmful, but Liquibase still needs its history table to reflect the accepted baseline.

The command:

```sql
prj_sync
```

wraps:

```text
lb changelog-sync -changelog-file releases/main.changelog.xml
```

The important word is **sync**: this marks all pending changesets as executed without running their change logic. It effectively says, “This environment already represents these changes; record them and move forward.”

Because it changes deployment history, `prj_sync` should never be a reflexive response to an unexpected status. First confirm the target connection and prove that the database already has the intended state.

```text
SQL> prj_status
Running the Liquibase Status Command to show pending changesets...
--Starting Liquibase at 2026-08-14T22:37:34.495236100 using Java 17.0.13 (version 4.33.0 #0 built at 2025-12-09 17:47+0000)
16 changesets have not been applied to CLA_DEPLOYER@[connection details redacted]
     tacrep-11/cla_apex/package_specs/erp_emergency_event_util.sql::1784667704068::CLA_APEX
     tacrep-11/cla_apex/tables/erp_app_substitution.sql::1784667702170::CLA_APEX
     [12 additional changesets skipped]
     releases\apex\f1968\f1968.xml::INSTALL_1968::SQLCL-Generated
     _custom/custom_prompt.sql::1786760223440::SqlCl

Operation completed successfully.

SQL> prj_sync
Running the Liquibase changelog-sync Command to mark all changesets as executed...
--Starting Liquibase at 2026-08-14T23:00:58.798761600 using Java 17.0.13 (version 4.33.0 #0 built at 2025-12-09 17:47+0000)

Operation completed successfully.

SQL> prj_status
Running the Liquibase Status Command to show pending changesets...
--Starting Liquibase at 2026-08-14T23:01:56.104367100 using Java 17.0.13 (version 4.33.0 #0 built at 2025-12-09 17:47+0000)
CLA_DEPLOYER@[connection details redacted] is up to date

Operation completed successfully.

SQL>
```

### `prj_mr`: skip one already-satisfied changeset

`prj_sync` handles every pending changeset. Troubleshooting often requires a more precise tool.

Imagine that a deployment stops on an `ALTER TABLE ... ADD` statement because the column already exists in one target environment. This can happen after a direct production correction, a deployment that was not rolled back cleanly, or another form of drift. Once I have verified that the existing column really satisfies the intended changeset, I can run:

```sql
prj_mr
```

I remember `mr` as “make run.” Internally, the alias calls:

```text
lb mark-next-changeset-ran -changelog-file releases/main.changelog.xml
```

Despite the name, it does not execute the changeset. It marks only the next pending changeset as ran so that the following installation can continue with the next one.

This is a troubleshooting operation, not a way to suppress inconvenient errors. Before using it, inspect the next changeset and confirm that the target database already implements the same result.

The before-and-after status below makes the effect explicit. The AOP upgrade is the next pending changeset before `prj_mr`; afterward, the pending count falls from 17 to 16 and that first changeset no longer appears.

```text
SQL> prj_status
Running the Liquibase Status Command to show pending changesets...
--Starting Liquibase at 2026-08-14T22:30:38.284170600 using Java 17.0.13 (version 4.33.0 #0 built at 2025-12-09 17:47+0000)
17 changesets have not been applied to CLA_DEPLOYER@[connection details redacted]
     aop_upgrade_25.2\_custom\aop_install.xml::SqlCl:1769116579255.1.1::SQLCL-Generated
     tacrep-11/cla_apex/package_specs/erp_emergency_event_util.sql::1784667704068::CLA_APEX
     tacrep-11/cla_apex/tables/erp_app_substitution.sql::1784667702170::CLA_APEX
     [12 additional changesets skipped]
     releases\apex\f1968\f1968.xml::INSTALL_1968::SQLCL-Generated
     _custom/custom_prompt.sql::1786760223440::SqlCl

Operation completed successfully.

SQL> prj_mr
Running the Liquibase mark-next-changeset-ran Command to mark the next changeset as executed...
--Starting Liquibase at 2026-08-14T22:37:18.078485100 using Java 17.0.13 (version 4.33.0 #0 built at 2025-12-09 17:47+0000)

Operation completed successfully.

SQL> prj_status
Running the Liquibase Status Command to show pending changesets...
--Starting Liquibase at 2026-08-14T22:37:34.495236100 using Java 17.0.13 (version 4.33.0 #0 built at 2025-12-09 17:47+0000)
16 changesets have not been applied to CLA_DEPLOYER@[connection details redacted]
     tacrep-11/cla_apex/package_specs/erp_emergency_event_util.sql::1784667704068::CLA_APEX
     tacrep-11/cla_apex/tables/erp_app_substitution.sql::1784667702170::CLA_APEX
     [12 additional changesets skipped]
     releases\apex\f1968\f1968.xml::INSTALL_1968::SQLCL-Generated
     _custom/custom_prompt.sql::1786760223440::SqlCl

Operation completed successfully.

SQL>
```

### Small helpers that remove repeated work

Two additional aliases are useful when maintaining the repository:

- `prj_force_apex` removes the SQLcl-generated APEX deployment records from Liquibase metadata so that the applications can be redeployed by the next `prj_install`. It prompts before making the change. Use it only after confirming the connection and understanding why SQLcl Project's recorded state is wrong.
- `prj_rm_logs` removes `*.log` files throughout the repository. It is convenient when Liquibase leaves logs in generated directories, but review the repository first in case a log is intentionally retained.

A before-and-after check makes the log cleanup visible:

```text
SQL> ! find . -name "*.log"
./dist/sqlcl-lb-1776898824169.log
./dist/sqlcl-lb-1776900353388.log
[additional log files skipped]
./dist/sqlcl-lb-error1780358656681.log

SQL> prj_rm_logs
Removing Logs from the repo...

SQL> ! find . -name "*.log"
SQL>
```

After `prj_force_apex`, either run `prj_install` to redeploy the applications or `prj_sync` to record them as current without redeploying.

## Group 3: APEXlang shortcuts

APEXlang development has a tight edit-validate-import loop. The full `apex validate` and `apex import` commands require a source path and workspace name, even though both values can be derived from the application metadata.

The aliases reduce that interface to one argument: the application ID.

Validate the APEXlang source:

```sql
conn -name proj_dev
prj_validate 110
```

Import, or “compile,” the validated source back into APEX:

```sql
prj_compile 110
```

`prj_validate` resolves the APEXlang directory and workspace from `apex_applications`, then runs `apex validate`. `prj_compile` resolves the same values and runs `apex import`.

```text
SQL> conn -n proj_vm26
Connected.

SQL> prj_validate 120
Validating APEXlang app 120 from src/database/demo1/apex_apps/f120/working-copy-test -ws DEMO1 ...
Validation successful.

SQL>
```

```text
SQL> conn -n proj_vm26
Connected.
SQL> prj_compile 120
Compiling APEXlang app 120 from src/database/demo1/apex_apps/f120/working-copy-test -ws DEMO1 ...
Importing application ID: 120 into workspace: DEMO1
Import successful.

SQL>
```

These aliases are particularly effective with coding agents. A skill can instruct the agent to validate after an edit, correct any reported APEXlang error, and import only after validation succeeds. The agent operates through two stable commands, while the aliases keep workspace names and repository paths out of its prompt.

## A compact working routine

For a normal change destined for a developer-controlled environment, the core routine becomes the following. The commented blocks show exceptional paths and should be used only when their stated conditions apply.

```sql
-- Connect to the development environment.
conn -name proj_dev
prj_exp_app 110

-- Edit and review the APEXlang source files.

prj_validate 110
prj_compile 110

-- Edit Oracle Database objects and apply the changes to the development database.

project export -o TABLE1

-- Commit the exported source before staging.
! git add .
! git commit -m "ready to stage"

-- Stage the changes and remove false ORDS changes.
project stage
prj_rm_ords

-- Add custom DML after staging, then edit the generated changeset.
project stage add-custom -file-name changes1.sql

-- Deploy to the unit-test environment.
conn -name proj_test
prj_status

/*
-- Optional: force all APEX applications to be included in the next installation.
prj_force_apex
*/

prj_install

/*
-- Troubleshooting only: if the installation failed because the next
-- changeset is already satisfied, mark that one changeset and retry.
prj_mr
prj_install
*/

/*
-- Baseline or drift alternative: after verifying that the environment
-- already contains every pending change, use this instead of prj_install.
prj_sync
*/

-- Clean up the logs after reviewing them.
prj_rm_logs

```

Git remains part of every step: inspect exports, review the diff, commit only intended files, and merge through the team's normal process. Aliases make important operations shorter; they do not replace source control discipline or deployment review.

## Keep aliases transparent

The best aliases are not mysterious automation. Their names are consistent, their implementations are version-controlled, and a developer can inspect the XML to see exactly what each command will do.

That transparency is especially important for commands that restore Git paths, delete logs, or change Liquibase history. A short command should reduce typing, not reduce understanding.

Used that way, SQLcl aliases become more than conveniences. They provide a small, shared command vocabulary for developers, CI-oriented scripts, and coding agents working with the same SQLcl Project repository.

## References

- <a href="https://docs.oracle.com/en/database/oracle/sql-developer-command-line/26.1/sqcug/oracle-sqlcl-users-guide.pdf" target="_blank" rel="noopener noreferrer">Oracle SQLcl User's Guide, release 26.1</a>
- <a href="https://docs.oracle.com/en/database/oracle/sql-developer-command-line/26.1/sqcug/apexlang.html" target="_blank" rel="noopener noreferrer">Oracle SQLcl User's Guide: APEXlang commands</a>
- <a href="https://www.thatjeffsmith.com/archive/2015/11/object-search-in-sqlcl/" target="_blank" rel="noopener noreferrer">Jeff Smith: Object Search in SQLcl</a>
- <a href="https://forums.oracle.com/ords/apexds/post/sqlcl-corrupts-apex-static-files-during-export-apexlang-7800" target="_blank" rel="noopener noreferrer">Oracle Forums: SQLcl corrupts APEX static files during APEXlang export</a>
- <a href="https://forums.oracle.com/ords/apexds/post/sqlcl-project-export-should-remove-stale-apex-alias-folders-6627" target="_blank" rel="noopener noreferrer">Oracle Forums: SQLcl Project export should remove stale APEX alias folders</a>
- <a href="https://forums.oracle.com/ords/apexds/post/sqlcl-project-stage-command-always-regenerates-ords-changes-1990" target="_blank" rel="noopener noreferrer">Oracle Forums: SQLcl Project stage always regenerates ORDS changesets</a>
- <a href="https://github.com/akluev/realSQLclProject/blob/main/docs/12.-Common-Commands-and-Directives.md" target="_blank" rel="noopener noreferrer">realSQLclProject: Common Commands and Directives cheat sheet</a>
- <a href="https://github.com/akluev/realSQLclProject/blob/main/scripts/xml/sqlcl-project-aliases.xml" target="_blank" rel="noopener noreferrer">realSQLclProject: SQLcl Project alias collection</a>
