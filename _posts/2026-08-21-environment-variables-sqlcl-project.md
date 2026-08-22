---
title: "Substitution Variables in SQLcl Project: An Underused Liquibase Feature"
date: 2026-08-21
description: Liquibase property substitution lets you inject values from a properties file or OS environment variables into any changeset. Available since the first SQLcl Project release (24.3 onward) but absent from the official docs — which explains why it is so often overlooked.
tags:
  - sqlcl
  - sqlcl-project
  - liquibase
  - oracle-database
---

Substitution variables are a long-standing Liquibase feature that SQLcl Project inherits out of the box — yet they are absent from the official SQLcl Project documentation, which goes a long way to explaining why community forums regularly see questions about customising deployments per environment, enhancement requests for features that already exist, and developers who simply do not know this capability is there. The feature has been available since the first SQLcl Project release (24.3 onward). SQLcl 26.1 put it in the spotlight with schema-agnostic deployments, but that is only one application of a much more broadly useful tool.

## Table of Contents
- [Table of Contents](#table-of-contents)
- [TL;DR](#tldr)
- [Setting up the test project](#setting-up-the-test-project)
  - [Create a baseline](#create-a-baseline)
  - [Adding a substitution changeset](#adding-a-substitution-changeset)
  - [Modify The properties file](#modify-the-properties-file)
  - [First deployment: variables from the properties file](#first-deployment-variables-from-the-properties-file)
  - [OS environment variables take precedence](#os-environment-variables-take-precedence)
- [Real-world examples](#real-world-examples)
  - [Example 1: Pre-deployment environment check](#example-1-pre-deployment-environment-check)
  - [Example 2: Environment-specific configuration with graceful skip](#example-2-environment-specific-configuration-with-graceful-skip)
- [Conclusion](#conclusion)
- [Sources](#sources)


## TL;DR

- Liquibase has supported `${VAR_NAME}` substitution tokens in changeset SQL for years; SQLcl Project inherits this feature without any additional configuration.
- The feature is absent from the official SQLcl Project documentation — which explains why it regularly surfaces as forum questions and why many developers working with SQLcl Project do not know it is there.
- Values are resolved from two sources: a properties file passed to Liquibase at deploy time, or OS-level environment variables set on the deploying machine — both work independently and can be combined.
- Dan McGhan's excellent post on `stage.substituteSchemas` explains how SQLcl 26.1 leverages this mechanism for schema-agnostic deployments; the core substitution feature itself has been available since the first SQLcl Project release (24.3 onward) and has many more use cases.
- Substitution is the cleanest way to make any changeset environment-aware — inject server names, API endpoints, schema names, or any environment-specific value without touching the changeset files.
- If a variable is missing at deploy time, Liquibase silently writes the literal placeholder (e.g. `${AMS_SERVER_FQDN}`) into the database; a Liquibase precondition can catch this before it causes silent data corruption.
- This article walks through the feature end-to-end: a minimal test project that confirms the resolution order, followed by two real-world patterns — a pre-deployment variable check and an environment-specific changeset with graceful skip.


## Setting up the test project

Let's walk through the feature end-to-end with a minimal test project.

### Create a baseline

For this demo I used a schema called `DEMO1` — the same name you will see referenced throughout the rest of this post. The only database privileges required are `CREATE SESSION` and `CREATE TABLE`; Liquibase needs `CREATE TABLE` to create its changelog tracking table.

From inside SQLcl, run:

```sql
! git init
project init -name subst
```

Output should look something like this:

```text
SQL> ! git init
Initialized empty Git repository in C:/repo/tests/subst/.git/

SQL> project init -name subst
PROJECT DETAILS
------------------------
Project name:    subst
Schema(s):
Directory:       C:\repo\tests\subst
Connection name:
Project root:     subst
Your project has been successfully created
```

SQLcl Project creates the standard structure and a `.dbtools/project.config.json` file. Open that file and set your schema name — for this walkthrough the schema is `DEMO1`:

```json
{
  "project" : "subst",
  "sqlcl" : {
    "connectionName" : "",
    "autoConnect" : false,
    "version" : "26.1.2.0"
  },
  "schemas" : [ "DEMO1" ],
  ...
}
```

Commit the result. That is your `main` baseline.

### Adding a substitution changeset

From inside SQLcl, check out a feature branch and add a custom changeset:

```sql
! git checkout -b test1
project stage add-custom -file-name subst.sql
```

Output should look something like this:

```text
SQL> ! git checkout -b test1
Switched to a new branch 'test1'

SQL> project stage add-custom -file-name subst.sql
Process completed successfully
```

SQLcl Project creates the staged file at `dist/releases/next/changes/test1/_custom/subst.sql`. Open it and replace the placeholder content with a set of `prompt` commands that print substitution tokens, plus the `runAlways:true` attribute so every deployment reruns it:

```sql
-- liquibase formatted sql
-- changeset  SqlCl:1787320902732 stripComments:false logicalFilePath:_custom\subst.sql runAlways:true
-- sqlcl_snapshot dist\releases\next\changes\test1\_custom\subst.sql:null:null:custom

prompt "TEST1: ${TEST1}"
prompt "TEST2: ${TEST2}"
prompt "TEST3: ${TEST3}"
prompt "TEST4: ${TEST4}"

-- parameters
prompt "parameter.demo1: ${parameter.demo1}"
prompt "demo1: ${demo1}"
```

`runAlways:true` is essential for this test setup because we want to re-run the changeset every time we change a variable and verify the output. Beyond testing, this matters in production too: most changesets that read substitution variables should carry either `runAlways:true` or `runOnChange:true`. Configuration values, server endpoints, and schema names can change between deployments — a changeset that only runs once on first install will never pick up those changes.

> **Note:** Use `runAlways:true` when the changeset must execute on every deployment regardless of content (for example, a DML that refreshes a configuration table). Use `runOnChange:true` when re-execution should be triggered only when the changeset file itself is modified. For substitution-variable-driven changesets, `runOnChange:true` is usually the right choice (see the real-world example below).

### Modify The properties file

When you ran `project stage`, SQLcl Project created `dist/env/default.properties`. Initially it contains one line:

```properties
parameter.demo1=demo1
```

This is the schema mapping used by the `stage.substituteSchemas` feature Dan McGhan describes. For this walkthrough, add four more variables to it:

```properties
parameter.demo1=demo1

test1="TEST1 lowercase"
parameter.TEST2="parameter TEST2"
TEST3="TEST3"
```

This file is a standard Liquibase defaults file. If you open `dist/install.sql` you will see it passed directly to `lb update` via the `-def` flag:

```sql
lb update -log -changelog-file releases/main.changelog.xml \
  -search-path "." -def env/default.properties
```

That is the connection between the file and the deployment. Any variable defined in it is available to every changeset in the deployment as a `${VAR_NAME}` token.

> **Note:** Liquibase documentation mentions two alternative ways to specify the defaults file without the `-def` flag: the `LIQUIBASE_DEFAULTS_FILE` environment variable and a JVM system property. Neither works with the Liquibase runtime embedded in SQLcl. Always pass the file explicitly via `-def` as shown above.

### First deployment: variables from the properties file

Connect to the schema and run `prj_install` — the alias from the <a href="/blog/2026/08/13/sqlcl-project-aliases/" target="_blank" rel="noopener noreferrer">SQLcl Project Aliases</a> post. If you are not familiar with it, run `alias details prj_install` to see exactly what it does:

```text
SQL> alias details prj_install
prj_install
-----------
cd dist
prompt Running Project Installer Script...
set define off
@install.sql
cd ..
```

It changes into the `dist` folder, runs `install.sql`, then returns to the project root.

> **Note:** This is the recommended approach for environments you control directly — developer VMs, integration test databases, and similar. You do not need `project gen-artifact` and `project deploy` to deploy to your own VM. Those commands exist for producing formal, auditable release artifacts destined for production or shared environments managed by a DBA.

To run the first deployment:

```text
SQL> conn -n demo_vm26
Connected.
SQL> prj_install
Running Project Installer Script...
Installing/updating schemas
--Starting Liquibase at 2026-08-21T10:12:47 ...
Running Changeset: _custom/subst.sql::1787320902732::SqlCl
TEST1: "TEST1 lowercase"
TEST2: "parameter TEST2"
TEST3: "TEST3"
TEST4: ${TEST4}
parameter.demo1: ${parameter.demo1}
demo1: demo1
```

Four things stand out in this output.

1. **Variable names are case-insensitive.** The properties file contains `test1` in lowercase. The changeset references `${TEST1}` in uppercase. Liquibase still matches them. This is different from OS environment variables on Linux and macOS, where `TEST1` and `test1` are distinct names.

2. **The `parameter.` prefix is stripped before substitution.** A line written as `parameter.TEST2="parameter TEST2"` is exposed as `${TEST2}`, not as `${parameter.TEST2}`. You can see this clearly: `${TEST2}` resolves to `"parameter TEST2"`, while `${parameter.demo1}` is not resolved at all — it prints the literal placeholder. The usable name is always the part after `parameter.`. This prefix is documented in the SQLcl 26.1 User Reference (section 6.1.4) as part of the schema substitution mechanism: `project stage` generates entries like `parameter.demo1=demo1` in `dist/env/default.properties` so that `${demo1}` resolves to the target schema name. The stripping behaviour applies to any variable written with this prefix, but the prefix is intended for schema mappings — for your own substitution variables, write them without it.

3. **The schema variable follows the same rule.** The auto-generated line `parameter.demo1=demo1` works identically: `${demo1}` resolves to `demo1`; `${parameter.demo1}` does not resolve.

4. **Missing variables are silent.** `TEST4` was not defined anywhere. Liquibase does not raise an error — it writes the literal text `${TEST4}` into the database exactly as written in the changeset. In a `prompt` command the consequence is cosmetic; in a DML changeset, the placeholder ends up stored in the table.

### OS environment variables take precedence

Set `TEST1` as an OS variable, exit SQLcl, and re-connect:

```text
$ export TEST1="Test1 from OS"
$ sql -nolog
SQL> conn -n demo_vm26
Connected.
SQL> prj_install
Running Project Installer Script...
Running Changeset: _custom/subst.sql::1787320902732::SqlCl
TEST1: Test1 from OS
TEST2: "parameter TEST2"
TEST3: "TEST3"
TEST4: ${TEST4}
parameter.demo1: ${parameter.demo1}
demo1: demo1
```

`TEST1` now shows `Test1 from OS` even though the properties file still contains `test1="TEST1 lowercase"`. The OS environment variable wins. All other variables — defined only in the properties file — are unchanged.

This establishes the resolution order: **OS environment variables override the properties file**. The properties file acts as the default; the OS supplies environment-specific overrides without any file changes.

## Real-world examples

### Example 1: Pre-deployment environment check

The silent-failure behaviour from the test above becomes a real problem in production deployments. The standard remedy is a dedicated `runAlways:true` changeset placed at the very beginning of the deployment that explicitly checks every required variable and halts if anything is missing.

The key challenge is detecting an unresolved placeholder without triggering substitution in the check itself. Writing `'${MY_VAR}'` in a SQL comparison would cause Liquibase to substitute it before the query runs. The solution is to split the literal using concatenation so Liquibase never sees the token:

{% raw %}
```sql
like '$'||'{%}'
```
{% endraw %}

A full pre-check changeset builds a collection of all required variable values, then loops through looking for any that still match the unresolved pattern:

{% raw %}
```sql
-- liquibase formatted sql
-- changeset ADMIN:1733418388854 stripComments:false runAlways:true logicalFilePath:pre-install/_custom/pre-check-env.sql

declare
  -- List every required variable. If a variable is not needed in this
  -- environment, set it to 'NULL' or 'N/A' in the properties file rather
  -- than leaving it absent.
  l_env_variables apex_t_varchar2 := apex_t_varchar2(
    -- passwords
    q'`${APP_PASSWORD}`',
    q'`${APP_PASSWORD_CHANGED}`',
    -- host ACLs
    q'`${IDCS_HOST}`',
    q'`${OAC_HOST}`',
    -- OCI config
    q'`${OCI_VAULT_VALUE}`',
    q'`${OCI_REGION_VALUE}`',
    q'`${OCI_TENANCYID_VALUE}`',
    -- JIRA config
    q'`${JIRA_CREDENTIALS_SECRETNAME_VALUE}`',
    q'`${JIRA_LIST_ARRAY_VALUE}`',
    -- generic
    q'`${ENV_VALUE}`'
  );
  l_missing apex_t_varchar2 := apex_t_varchar2();
begin
  for i in l_env_variables.first .. l_env_variables.last loop
    if l_env_variables(i) like '$'||'{%}' then
      apex_string.push(l_missing,
        trim(translate(l_env_variables(i), '$'||'{}', '   ')));
    end if;
  end loop;
  if l_missing.count > 0 then
    raise_application_error(-20000,
      'The following environment variables must be set: '
      || apex_string.join(l_missing, ', '));
  end if;
end;
/
```
{% endraw %}

A few things worth noting:

- `q'`...`'` is Oracle's alternative quoting mechanism. It lets variable values contain single quotes, dollar signs, or other special characters without breaking the string literal.
- `translate(value, '$'||'{}', '   ')` strips the `$`, `{`, and `}` characters to extract the bare variable name for the error message.
- `runAlways:true` ensures this check runs on every deployment, not just the first. A variable that was set last week may not be set today.
- Place this changeset in an early-release changelog so it executes before any DDL/DML changesets that will use variables. If it raises an error, Liquibase stops the deployment immediately.

### Example 2: Environment-specific configuration with graceful skip

The second pattern handles a different situation: a changeset that should run in some environments and be silently skipped in others, and that should re-run automatically whenever the variable value changes.

The `ams_config_dml.sql` changeset below maintains metadata of a connection to <a href="https://www.united-codes.com/products/apexmessageservice/" target="_blank" rel="noopener noreferrer">AMS (APEX Messaging Service by United Codes)</a> in a configuration table. It uses `runOnChange:true` combined with an `onFail:CONTINUE` precondition:

```sql
-- changeset SqlCl:1761249915279 stripComments:false logicalFilePath:dev-01\_custom\ams_config_dml.sql runOnChange:true
--preconditions onFail:CONTINUE
--precondition-sql-check expectedResult:0 SELECT count(*) FROM dual WHERE '${AMS_SERVER_FQDN}' ='$'||'{'||'AMS_SERVER_FQDN'||'}'

begin
  cla_apex.cla_configuration_pkg.upsert (
    p_instance_id => 1,
    p_key_type_id => 1,
    p_key         => 'ams_server',
    p_description => 'Local AMS server URL',
    p_value       => 'https://${AMS_SERVER_FQDN}',
    p_key_group   => 'ams'
  );
end;
/

begin
  cla_apex.cla_configuration_pkg.upsert (
    p_instance_id => 1,
    p_key_type_id => 1,
    p_key         => 'ams_api_key',
    p_description => 'Local AMS API Key',
    p_value       => '${AMS_API_KEY}',
    p_key_group   => 'ams'
  );
end;
/

commit
/
```

The three behaviours this produces:

**Variable not set.** Liquibase substitutes `${AMS_SERVER_FQDN}` with nothing — the token remains as a literal. The precondition detects this (the string equals its own unresolved form), the count is `1`, and `onFail:CONTINUE` skips the changeset. The deployment continues. No error, no corrupted data.

**Variable set, value unchanged since last run.** Because Liquibase performs substitution before computing the changeset checksum, the resolved changeset has the same checksum as last time. `runOnChange:true` does not trigger a re-run. The changeset is skipped efficiently.

**Variable set, value has changed.** The resolved SQL is different from last time, so the checksum differs. `runOnChange:true` detects the change and re-executes the changeset, upserting the new server address or API key into the configuration table.

In practice this deployment pattern lets the same changelog work cleanly across very different environments. In a controlled environment with containerised deployment, `AMS_SERVER_FQDN` and `AMS_API_KEY` are always provided by the container — the configuration table stays in sync automatically. When a value needs to change, a DBA updates it in the container configuration and the next deployment picks it up via `runOnChange:true`. Local development VMs or environments that do not use AMS simply leave the variables unset — the precondition catches that silently and moves on.

## Conclusion

Substitution variables are one of the most practical tools available in a SQLcl Project deployment. They require no additional setup beyond what every project already has, yet they are absent from the official SQLcl Project documentation — which is exactly why they are so often overlooked.

The properties file is not a requirement. `dist/env/default.properties` is simply a Liquibase defaults file passed via the `-def` flag in `install.sql`. You can swap it for a different file per environment, calculate the path at deploy time, or remove the flag entirely and supply all values as OS environment variables. The simplest setup is no properties file at all — just set the variables on the machine before running the deployment.

> **Note:** `dist/env/default.properties` does have one unique role: when `stage.substituteSchemas=true`, `project stage` writes schema mappings directly into this file and `install.sql` references it by this exact path. If you rename or replace the file for your own variables, schema substitution will still work as long as you keep the `parameter.<schema>=<value>` entries in whatever file you pass to `-def`. But the file that `project stage` generates and updates is always `dist/env/default.properties`.

A useful practical split:

- **Non-sensitive configuration** — server names, endpoints, feature flags, schema mappings — belongs in environment-specific properties files managed alongside the deployment.
- **Secrets** — passwords, API keys, tokens — should never be written to a file in the repository. Supply them as OS environment variables at runtime; they automatically override any value in the properties file.

Two caveats are worth keeping in mind:

**Silent failure on a missing variable.** If a variable is not defined, Liquibase does not raise an error — it writes the literal placeholder (e.g. `${MY_VAR}`) into the database. This is counterintuitive and easy to miss. The pre-check changeset pattern from Example 1 is the standard remedy: it catches every unset variable before any DML runs.

**The `parameter.` prefix.** This prefix is documented in the SQLcl 26.1 User Reference (section 6.1.4) as part of the schema substitution mechanism. `project stage` generates entries like `parameter.demo1=demo1` in `dist/env/default.properties` so that `${demo1}` resolves to the target schema name at deploy time. Any variable written with this prefix undergoes the same stripping, but the prefix is reserved for schema mappings. For your own substitution variables, write them without the `parameter.` prefix — and never reference them as `${parameter.MY_VAR}`, which will not resolve.

## Sources

- <a href="https://github.com/akluev/realSQLclProject/blob/main/docs/12.-Common-Commands-and-Directives.md#8-environment-variables" target="_blank" rel="noopener noreferrer">realSQLclProject: Environment Variables — Common Commands and Directives</a>
- <a href="https://danmcghan.hashnode.dev/schema-agnostic-staged-changesets-with-stage-substituteschemas" target="_blank" rel="noopener noreferrer">Dan McGhan: Schema-agnostic Staged Changesets with stage.substituteSchemas</a>
- <a href="https://docs.oracle.com/en/database/oracle/sql-developer-command-line/26.1/sqcug/introduction.html#GUID-1361C582-6A5E-48B7-9CBA-A85973AF0587" target="_blank" rel="noopener noreferrer">Oracle SQLcl 26.1 User Reference: Section 6.1.4 — Support for Schema Substitution</a>
- <a href="https://docs.liquibase.com/secure/reference-guide-5-1/parameters/defaults-file" target="_blank" rel="noopener noreferrer">Liquibase Docs: defaults-file parameter</a>
- <a href="https://www.united-codes.com/products/apexmessageservice/" target="_blank" rel="noopener noreferrer">United Codes: APEX Messaging Service (AMS)</a>
