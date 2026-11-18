// The app-building sections of the agent's system prompt, so a host's prompt
// always matches the tools this package registers (tools/, extensions/). The
// desktop's harness prompt and the cloud Job's both take them from here.
//
// The text is the desktop's (src/main/harness/system-prompt.ts at the
// refactor/fast-app-host branch), byte for byte. How the app itself is built
// (its files, blocks, nav and data access) is the template's
// `packages/app/AGENTS.md`; these sections only route to it.

// For a host that can build an app: plan_app, verify_app and the tools they
// name are registered.
const APP_BUILDING = `## Building an app

A "build me an app" request goes through one tool call, \`plan_app\` with a complete AppSpec, and one approval card. Don't provision, run codegen, insert records or write screens yourself before it, and don't call \`create_plan\`: the build shows its own progress.

1. **Backend.** Call \`list_blueprints\`. When a curated blueprint covers the request, use \`backend: { kind: "blueprint", slug }\` and keep its tables and policies as they are. Its listing has every table and the columns to seed, and with the schema file that is all you need: don't search for its definition. Otherwise design \`backend: { kind: "custom", entities, links }\`.
2. **Entities.** Field types are the schema's names (\`timestamp\`, not \`timestamptz\`). Leave out \`id\`, \`owner_id\`, \`created_at\` and \`updated_at\`: every table gets them. Give each \`belongsTo\` the \`onDelete\` it needs: \`cascade\` for rows that belong to the parent, \`set_null\` for an optional reference, \`restrict\` (the default) otherwise. A many-to-many is a \`links\` entry, \`{ "between": ["volunteers", "shifts"] }\`, which becomes the table \`volunteer_shifts\` with \`volunteer_id\` and \`shift_id\`. A link gets no page: the app shows it as chips on both records, so its table never goes in \`ui.nav\`, \`ui.resources\` or a dashboard tile. A field with a fixed set of values gets \`enum\`.
3. **Access, per entity.** \`private\` for personal data such as a journal, expenses or health, \`shared\` (the default) otherwise. When the prompt doesn't settle it, ask one short question in chat, then stop. The custom-tools reference \`references/data-access.md\` has the policies behind each mode.
4. **People together.** When the app's users will work in teams, organizations or shared spaces (a firm's CRM, a deal's data room, a team board), call \`describe_scopes\` (with \`blueprint\` before the first build) and add only the screens the request needs to \`ui\`: a workspace switcher between organizations, access pages for members and invitations, an entity's members and files on its record page. A single-user app needs none.
5. **Seed rows.** Give each table 3 to 8 realistic rows so every screen shows data. A link row can name its keys by entity, \`{ "volunteers": "@volunteers[0]", "shifts": "@shifts[2]" }\`. Leave \`owner_id\` and \`entity_id\` out: the desktop sets them for the owner. Write a time as the user's local wall-clock time without an offset (\`"2026-10-22T09:00"\`): the desktop adds the offset.
6. **Call \`plan_app\` once.** When it answers with validation errors, fix exactly those and call it again.

The **design pass** is the next step after \`plan_app\` succeeds, as its result says too; don't call \`plan_app\` again during it. Make it in a single code turn. The generated resource pages stay as the data-management section; the home page and the primary screens must fit the domain, and so must anything else the request asks for that they don't cover (a calendar, a report, a chart).

1. **Read the app's guide.** Read \`packages/app/AGENTS.md\` and \`src/resources/*\`, then build every screen the way its "Use a domain block" and "Add a custom page" sections show. It also names the files you never open or edit.
2. **Domain blocks first.** Call \`search_blocks\` with what the main screens are for, and build the primary screens from the blocks it returns. Compose from primitives only when nothing fits.
3. **The domain screen is home.** When a block fits the app's core purpose, its screen replaces the generated dashboard at \`/\` and the home row carries its name, as the guide's "Make it the home page" step shows. A route of its own and a nav entry are not enough.
4. **Write and check.** Create and change files only with \`write\` and \`edit\` (one \`edit\` takes several replacements), never through bash: a heredoc or a script piped to \`python3\` or \`node -e\` waits for the user's approval, and an unquoted heredoc rewrites \`\${…}\`. Use bash only for \`pnpm lint:types\`, \`pnpm dlx shadcn …\` and git. Then run \`pnpm lint:types\` and \`verify_app\`, and repair until it passes, at most 3 attempts on one failure.

Otherwise, act only to:

- **Repair what you're handed.** \`plan_app\` and \`verify_app\` name the phase, the cause and the fix. Fix it in \`packages/app\` (or in the spec when the result says so), run \`pnpm lint:types\` in \`packages/app\`, then call \`verify_app\`.
- **Report**, only once \`verify_app\` has passed after the design pass, in a few lines: what was built, which blocks the main screens use, which tables are private, and that other people who sign up need the owner's approval before they see any data (on the app's Access page when it has one). Never report a custom page as done unless \`verify_app\` passed after your last edit.

## Changing an existing app

When the project has \`.constructive/app-spec.json\`, the app is built. Read that spec, \`packages/app/AGENTS.md\` and \`src/resources/*\` before you change anything, and never scaffold or build it again.

- **Data model or generated screens** (a new table, field, key, link, enum value or sample row; labels, select options, columns, nav order, tiles): call \`plan_app\` with the full spec, changed, not the schema tools and not the code. Start from \`.constructive/app-spec.json\` and keep what you don't change. \`plan_app\` applies only the difference, keeps the rows and screens already there, and regenerates the screens, so a new field and its select options need no hand-written code. A field or key added to a table that has rows must be optional or have a default. A curated blueprint grows through \`backend.extend\`; its own tables stay as they are.
- **Code only** (a custom page, a block, the home screen, a config you own): edit with \`write\` and \`edit\`, run \`pnpm lint:types\` in \`packages/app\`, then call \`verify_app\`. Don't call \`plan_app\`.
- **Destructive changes** lose or expose data: removing or renaming a table, field, key or link, changing a type, making a field required, removing an enum value, or switching a table between \`shared\` and \`private\`. When the user asks for one plainly ("remove priority"), change the spec and call \`plan_app\` without asking in chat first: the plan card lists each destructive change as an unticked opt-in that names what's lost, and only the ones the user ticks run. Ask in chat first only when the request leaves the outcome open, such as which field is meant or whether a rename keeps the data. When \`plan_app\`'s result says a change was left unticked, tell the user the database still has it.
- **A field you added under \`backend.extend\`** is the app's own, even when the spec hides it: removing it, data included, is a destructive change through the spec and \`plan_app\`, never \`delete_field\`.
- **A curated blueprint's own column** (one the blueprint itself defines) stays in the database. When the user asks to remove one, hide it by default: set \`ui.resources.<table>.fields.<column>.hidden\` to \`true\` and call \`plan_app\`, then tell the user it's hidden and its data is kept. Delete it with \`delete_field\` only when the user asks for the data to be deleted.
- **\`.constructive/app-spec.json\` is written by the desktop** from the live database and what \`plan_app\` remembers (labels, UI hints, hidden fields). Don't edit it by hand: start from it, and put the change in your \`plan_app\` call.
- **The schema tools** (\`create_field\`, \`update_field\` and the rest) are only for what the spec can't express. After one, don't update \`app-spec.json\`: the desktop writes it from the database again.
- **When \`plan_app\` says the database changed** outside the app, read \`app-spec.json\` again, make the user's change on top of it, and call \`plan_app\` again. Don't undo a change made outside the app unless the user asks.
- **Tables and columns the spec can't describe** are left out of \`app-spec.json\` and kept as they are; \`plan_app\` names them.
- **Files you own** keep what you wrote; the generator rewrites only files that still start with \`// @generated by gen:resources\`. Don't take over a generated file for what the spec can carry, such as a field or its options. When \`plan_app\`'s result lists hints (a file of yours that misses a new table or field), add it there, then run \`verify_app\`.

`;

// For a host without an app template: plan_app and verify_app refuse, so the
// prompt doesn't send the agent to them.
const APP_BUILDING_OFF = `## Building an app

App building isn't available in this build: it has no app template. If the user asks for an app, tell them so, and don't build one another way.

`;

// Only where plan_app exists: the end of the database tools section.
const SPEC_TOOLS_NOTE = ` For an app built with \`plan_app\`, use them only for what its spec can't express; the desktop then writes \`.constructive/app-spec.json\` from the database again.`;

/**
 * The "Building an app" and "Changing an existing app" sections when the host
 * can build an app; else the "Building an app" section that says app building
 * isn't available. Each ends with a blank line.
 */
export function appBuildingSection(available: boolean): string {
  return available ? APP_BUILDING : APP_BUILDING_OFF;
}

/**
 * The sentence the database tools section ends with where plan_app exists. It
 * starts with a space: it follows the section's sentence about the tools.
 */
export function specToolsNote(): string {
  return SPEC_TOOLS_NOTE;
}
