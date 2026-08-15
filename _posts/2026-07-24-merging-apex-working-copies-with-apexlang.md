---
title: "Merging APEX Working Copies with APEXlang"
date: 2026-07-24
description: A practical workflow for combining parallel Oracle APEX development by using working copies, APEXlang, and SQLcl together.
---

Two developers make different changes to the same Oracle APEX application. One branch is merged into the repository, but another version of the application is still active in the APEX workspace. Both streams contain valuable work, and some of the changes affect the same page.

How do we combine them without losing either developer's work?

I demonstrated one approach during an APEX Instant Tips broadcast. The technique uses three capabilities together:

- APEX working copies preserve and compare application state.
- APEXlang makes conflicting page definitions editable as source.
- SQLcl validates and imports the reconciled application.

The result is a practical workflow for resolving application drift and merging parallel development, including cases where both developers changed the same page.

<div class="video-embed">
  <iframe width="1801" height="1013" src="https://www.youtube.com/embed/uqgRy-S8k2k?list=PLCAYBJ7ynpQQQrdwKFBZu8Kx9VTFt-pRP" title="APEX Instant Tips #204: Working copies" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>
</div>

## The demo application

The demo uses application 120, a deliberately small application that makes each change easy to see.

The original version has a blue region on page 1 containing the text:

> I am blue like the sky.

Selecting it opens a picture of the sky on page 2. I will call this the **Blue version**.

Another developer has changed the same application independently. Their version has a yellow region on page 1. Selecting it opens a picture of wheat on page 3. I will call this the **Yellow version**.

The desired result must retain both sets of behavior:

- the Blue region, page 2, and `sky.jpg`; and
- the Yellow region, page 3, and `wheat.jpg`.

The separate pages and static files are straightforward. The complication is page 1, because both developers changed it.

## Step 1: Preserve the current application as a working copy

Before importing the incoming Yellow version, create a working copy of the current application and name it **Blue**.

At this point, the working copy and the main application are identical. The working copy is a preserved APEX-side snapshot of the Blue stream of work.

This step should happen before replacing the main application. If the current application contains changes that exist nowhere else, verify that the working copy was created successfully before continuing.

## Step 2: Import the incoming version as the main application

Use SQLcl `apex import` to install the incoming application from the repository into the same workspace as the new main application.

In this workflow, importing the application replaces the main application while leaving the existing Blue working copy available. After the import:

- the Blue version is preserved as the working copy; and
- the incoming Yellow version is installed as the main application.

Run the application and confirm that the incoming behavior is present. In the demo, page 1 is now yellow, and its action opens the wheat image on page 3.

## Step 3: Compare the working copy with the main application

Open the Blue working copy and select **Compare with Main**.

The comparison identifies the two kinds of changes we need to handle:

| Component | Blue working copy | Yellow main application | Conflict? |
|---|---|---|---|
| Static file | `sky.jpg` | `wheat.jpg` | No |
| Separate page | Page 2 | Page 3 | No |
| Shared page | Blue changes on page 1 | Yellow changes on page 1 | Yes |

Page 2, page 3, and the two images are independent changes. The normal working-copy merge can preserve them.

Page 1 requires more care. Its comparison shows differences in regions, buttons, dynamic actions, and other page components. Choosing either complete version of the page would discard some of the other developer's work.

## Step 4: Reconcile the conflicting page in APEXlang

This is where APEXlang changes the workflow.

Open the page 1 APEXlang source for the incoming Yellow version in Visual Studio Code. Add the required Blue components to that source: in this example, the Blue region, button, and dynamic action.

The Yellow source becomes the base, and the Blue changes are applied deliberately to it. The resulting page definition contains both streams of work.

This is a semantic merge rather than a blind text merge. Review the component structure and relationships carefully. In particular, check that:

- component identifiers and names do not collide;
- buttons still target the correct dynamic actions;
- region and item references remain valid;
- page-level processing order is intentional; and
- both developers' behavior is represented in the combined source.

## Step 5: Validate and import the reconciled source

Validate the updated APEXlang before importing it:

```sql
apex validate -input <apexlang-application-path> -ws <workspace-name>
```

Correct every compiler error, then import the validated application:

```sql
apex import -input <apexlang-application-path> -ws <workspace-name>
```

At this stage, the main application contains the Yellow version plus the Blue changes manually reconciled on page 1.

The import does not finish the complete merge. The Blue working copy still contains the independent page 2 and `sky.jpg` changes that must be brought into the main application.

## Step 6: Compare again before merging

Return to the working-copy screen and compare the Blue working copy with the main application again.

The comparison now tells a different story:

- the main application's page 1 already contains the combined Blue and Yellow behavior;
- the working copy still contains the original Blue version of page 1; and
- page 2 and `sky.jpg` still need to be preserved from the working copy.

This second comparison is an important checkpoint. It confirms what has already been reconciled and what remains to be merged.

## Step 7: Selectively merge the working copy

Use the normal APEX working-copy merge to bring the remaining Blue changes into the main application, but **exclude page 1**.

Excluding page 1 is essential. Its conflicts were already resolved through APEXlang. Merging the original working-copy version of page 1 could overwrite the combined result and restore the problem we just solved.

Select only the changes that still need to be preserved, including page 2 and the sky image, and then complete the merge.

The final application now contains:

- the combined Blue and Yellow regions on page 1;
- the Blue page 2 and sky image; and
- the Yellow page 3 and wheat image.

## Step 8: Test the combined application

Run the application and test both paths.

In the demo, page 1 now resembles the Ukrainian flag: blue on top and yellow below. Selecting blue opens the sky; selecting yellow opens the wheat.

The visual result is memorable, but the important result is technical: neither developer's work was lost.

## Why the workflow works

Each tool handles the part of the merge it understands best:

```text
APEX working copy  -> preserve and compare the current application
APEXlang           -> reconcile conflicting component definitions
SQLcl              -> validate and import the combined application
Working-copy merge -> selectively restore non-conflicting changes
```

Working copies provide an application-aware comparison and selective merge. APEXlang gives us a source representation for resolving a page that both developers changed. SQLcl provides the compiler gate and the import path back into APEX.

The technique does not eliminate the need for judgment. It gives us better places to apply that judgment.

## Safety rules

When applying this workflow to a real application:

1. Commit or otherwise preserve every repository change before starting.
2. Confirm the target database, workspace, and application ID before importing.
3. Create and verify the working copy before replacing the main application.
4. Classify differences as independent or conflicting before merging anything.
5. Reconcile shared-page conflicts in APEXlang and validate the complete application.
6. Compare the working copy with main again after the import.
7. Exclude already-reconciled pages from the later working-copy merge.
8. Test every retained behavior, not merely whether the application imports successfully.
9. Export the final combined application back to the repository so APEX and Git agree again.

That final export closes the loop. The repository should represent the same combined application that was tested in APEX.

APEX working copies, APEXlang, and SQLcl solve different parts of the problem. Used together, they provide a controlled way to resolve application drift and combine parallel development without reducing the decision to "keep my page" or "keep their page."
