# As-Built Standard

**Applies to:** `04-tech-decisions.md` and `05-tech-requirements.md` in existing-app mode, checked against the codebase.
**Based on:** EGM's re-implementation standard, narrowed to what a Strapi design review needs.

## Core principle

The documents pass if every statement is true of the code at the cited commit, and nothing that the Strapi design standard asks about is silently missing.

## 1. Accuracy

Every claim matches the code, and the cited file exists and actually says that. A wrong claim is a **Blocker** if it concerns the data model, auth, or permissions, and a **Major** otherwise.

## 2. Citations

Every claim cites a file path. An uncited claim is a Major.

## 3. Coverage

Each of these appears in the documents if it exists in the code. A missing one is a **Major**, or a **Blocker** if it is auth, permissions, or code that writes data:

- content types, components, and extensions of plugin types (such as the Users & Permissions `user`);
- custom routes and controller overrides;
- policies and middlewares (route, global, and Document Service);
- lifecycle files;
- cron tasks;
- local plugins;
- auth setup and any permission seeding;
- environment variable names from `.env.example` and the code;
- frontend routes that call Strapi, and how the frontend sends the session.

## 4. Unknowns are flagged, not guessed

Facts the code can't show — permissions set in the admin panel, data in the database, hosting settings — are marked `⚠️ not in code`. A guess written as fact is a Major.

## 5. Description, not judgment

The documents describe what the code does. Evaluations ("insecure", "should be") belong in review findings, not here. Each one is a Nit.

## 6. Versions

The Strapi version, the Node engine, and key package versions match `package.json` and the lockfile. The Node engine is written as *declared* ("`engines`: ≤ 22"), never as tested support, unless someone actually ran it.
