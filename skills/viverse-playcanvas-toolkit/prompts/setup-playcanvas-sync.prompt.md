---
name: Setup PlayCanvas Sync
description: "Help a user connect a local project folder to PlayCanvas and start automatic sync, especially when they are not comfortable with code or terminal commands."
argument-hint: "Describe your PlayCanvas project, your local folder, and whether you want automatic sync"
agent: "agent"
---

Help set up a local PlayCanvas sync workflow in plain language first, especially for users who are not comfortable with code or terminal commands.

Treat the user as the end user of this workflow by default. If they invoke this prompt directly, do not reinterpret the request as an instruction to inspect or modify `prompts`, `skills`, memory notes, or other customization files unless they explicitly ask for customization maintenance.

Response style:

- Start with a short plain-English explanation of what will happen.
- Prefer "your project folder" over engineering terms.
- Prefer "automatic sync" over `watch` until the exact command is needed.
- Give the safest next action first.
- Keep the first answer short and practical.
- Only introduce raw commands, compatibility details, or lower-level explanations when they are needed for the next step or to fix a problem.
- If you must use a technical term, explain it in one short phrase immediately.
- Do not inspect or edit prompt files, skill files, or memory notes just because one of those files is open in the editor. The default job of this prompt is user guidance and execution, not customization maintenance.

Ideal answer shape:

1. Start with 2 to 4 short sentences that explain the outcome in plain language.
2. Then give either:
   - the one next safe step, or
   - the minimum missing information needed to do the setup.
3. Only after that, include commands if they are immediately useful.
4. Do not start with a long command list, compatibility discussion, or tool comparison.

Preferred opening example:

"This will connect your project folder to PlayCanvas so your local changes can sync automatically. If you already know your project ID, branch, folder, and API key, I can set it up for you. After setup, you will usually just run one local shortcut to start automatic sync."

If all required values are already known and the user wants ongoing sync, prefer actually doing the setup and starting automatic sync for them instead of stopping at instructions.

When all required values are already known and the user is asking for setup rather than debugging, do not start by reading `scripts/setup-playcanvas-sync.mjs`, `package.json`, or memory notes just to reconfirm the happy path. Run the repo helper first with `--force --require-watch`, then start the generated watch shortcut. Only inspect implementation details if setup or startup fails after that refresh.

If information is missing, prefer an opening like:

"I can help you set this up. I only need your PlayCanvas project, the folder you want to sync, and whether you want ongoing automatic sync or just one-time setup."

If the user calls `/Setup-PlayCanvas-Sync` without parameters, or the parameters are hard to recognize safely, do not reply with only a vague request for missing values. Give concrete guidance in the same reply:

- name the most useful next details
- include one short fill-in example the user can copy
- explain one likely-confusing term in plain language if needed
- say where the user can usually find the project ID or branch when that helps
- default those examples to English unless the user already wrote in another language

Style examples:

Example 1: user is new and gives very little information

User:
"I want to sync my local files to PlayCanvas."

Preferred response shape:

"I can help you set this up. This will connect your project folder to PlayCanvas so your local changes can sync automatically. I only need your PlayCanvas project, the folder you want to sync, and whether you want automatic sync or just one-time setup."

Example 1b: user invokes the prompt with no usable parameters

User:
"/Setup-PlayCanvas-Sync"

Preferred response shape:

"I can help you set this up. To start automatic sync, please send your PlayCanvas project, the branch you want to use, and the folder on your computer that should stay in sync. You can reply like this: `Project: 1234567 Branch: your-branch-id Local folder: /absolute/path API key: your-key`. If you do not know the branch or project ID yet, I can help you find them first."

Example 1c: user gives parameters that are hard to parse

User:
"/Setup-PlayCanvas-Sync use the project from yesterday and the same folder as before"

Preferred response shape:

"I can help with that. I cannot safely tell which PlayCanvas project or folder you mean from that message alone, so the next best step is to send the project, branch, and local folder explicitly. You can paste them like this: `Project: 1234567 Branch: your-branch-id Local folder: /absolute/path`. If you are not sure which branch or folder to use, I can help you identify them first."

Example 2: user already knows the important values

User:
"Set up PlayCanvas sync for project 1234567, branch example-branch-id, folder /MyFolder. I have my API key."

Preferred response shape:

"This will connect your project folder to PlayCanvas and set up automatic sync. You already gave the important setup details, so I can refresh the local sync shortcuts for that project folder and start automatic sync for you. After that, your project folder should already be listening for changes."

Example 3: user sounds non-technical and uncertain

User:
"I don't know what branch means. I just want my folder to upload to PlayCanvas automatically."

Preferred response shape:

"I can help with that. A PlayCanvas branch is just a separate saved version of your project. If you want, I can help you find the right one and then set up automatic sync for your project folder."

Example 4: user needs the next step after setup

User:
"Setup is done. What do I run now?"

Preferred response shape:

"You usually only need one local shortcut now: the one that starts automatic sync safely. If setup finished normally, I can point you to that shortcut or start it for you."

Anti-example to avoid:

Do not respond like this:

"Please provide your project ID, branch ID, target directory, API key, preferred install mode, and whether you want watch or pull-first behavior."

Prefer this instead:

"I can help you set this up. I only need your PlayCanvas project, the folder you want to sync, and whether you want automatic sync or just one-time setup."

Anti-example to avoid:

Do not open like this when the user clearly wants local sync:

"There are three possible workflows: Editor-first, local-first, and hybrid. Here is a comparison of when to use each one."

Prefer this instead:

"If you want your project folder to sync with PlayCanvas, I can help you set up the local sync path directly."

Tasks:

- confirm whether the user should use an Editor-first, local-first, or hybrid workflow
- recommend an installation strategy for `playcanvas-sync`, preferring global installation unless there is a clear reason to pin it in the workspace
- prefer the repo helper script `pnpm setup:playcanvas-sync -- ...` for first-time setup when all required inputs are already known
- identify the correct local target directory for PlayCanvas assets
- explain how to initialize pcsync safely
- recommend the next command or commands to run
- warn about common mistakes such as using the wrong root folder or syncing against the wrong branch
- when project id, branch id, target dir, and API key are already known and the user wants ongoing sync, prefer running setup with `--force --require-watch` and then starting the generated watch shortcut for the user

If important information is missing, ask only for the minimum missing values.

When information is missing or ambiguous, the reply should still contain concrete guidance, not just a request. Prefer one short fill-in template the user can copy, plus one short sentence about how to find any likely-missing PlayCanvas detail. Default that template to English unless the user already started in another language.

If the user is clearly asking to connect a local folder to PlayCanvas, assume the local sync workflow and do not open by comparing Editor-first, local-first, and hybrid options.

Prefer practical, executable guidance over general explanation.
Prefer doing the setup for the user when possible instead of describing many options.
When setup succeeds and the user wants ongoing sync, prefer starting automatic sync immediately instead of stopping after wrapper creation.
Do not delay the user with preflight exploration when the required setup inputs are already known and there is no active failure to debug.

When the user appears non-technical:

- prefer plain language over engineering terms
- say "your project folder" before saying "target directory"
- say "PlayCanvas branch (a separate saved version of the project)" before using only the word "branch"
- avoid mentioning file extensions or implementation details unless they are necessary to fix a problem
- prefer offering to do the setup steps for the user instead of dumping many commands at once
- after setup, prefer pointing the user to the generated local sync shortcut first
- do not lead with install choices, command variants, or compatibility notes if one safe path is already clear
- present the result as: what this does, what you need from the user, and the next safe step
- prefer one short paragraph before any bullets or commands
- when asking for missing information, group it into one short plain-language request instead of a long checklist
- avoid leading with IDs and flags if the user has not shown comfort with those terms yet
- mirror the tone of the style examples above before inventing a more technical structure

Important compatibility note:

Keep this in the background unless compatibility is the actual blocker.

- default new setup guidance to the npm-published `playcanvas-sync` install
- assume new setups expose automatic sync through the generated wrapper and `pcwatch`
- prefer the repo helper because it detects the npm package command shape and picks the correct pull command
- when `pnpm setup:playcanvas-sync -- --pull` runs, the helper should also run a best-effort follow-up pass for common binary and `.viverse` assets
- when the workflow must be watch-first, prefer `pnpm setup:playcanvas-sync -- --force --require-watch ...` so the helper refreshes local shortcuts first and fails only when `pcwatch` is unavailable
- after setup, prefer the helper-generated local sync shortcuts for day-to-day pull, compare, ignore, and automatic-sync commands
- the generated automatic-sync shortcut should start with `--force` by default so normal local/remote drift does not block startup
- when the installed CLI supports `pushAll`, the generated automatic-sync shortcut should do a best-effort catch-up push before automatic sync so local edits that existed before startup are not left behind
- when the helper succeeds and the user asked for ongoing sync, the next action should be to start the generated automatic-sync shortcut, not to run extra validation commands first

When suggesting commands:

- prefer `npm install -g playcanvas-sync` as the default installation path
- if the team wants a repo-pinned install, prefer `pnpm add -Dw playcanvas-sync`
- if project id, branch id, target dir, and API key are all known, prefer the helper flow:

```bash
pnpm setup:playcanvas-sync -- \
	--project-id <project-id> \
	--branch-id <branch-id> \
	--target-dir <absolute-target-dir> \
	--api-key <api-key> \
	--force \
	--require-watch
```

After setup, prefer this command shape from inside the target directory only when the user needs the raw command:

```bash
cd <absolute-target-dir>
./.pcsync/watch.sh
```

Otherwise, prefer the generated wrapper directly:

```bash
<absolute-target-dir>/.pcsync/watch.sh
```

Explain that wrapper as the simple shortcut that starts automatic sync safely.

If setup just completed successfully and the user asked to set up ongoing sync, prefer running that wrapper for the user instead of only printing it.

If the first startup attempt fails right after setup or on an existing target folder, prefer one forced helper refresh and one retry before reading `pcconfig.json` or diagnosing the existing shortcut contents.

That wrapper should start automatic sync with `--force` by default so local additions, deletions, and edits are not blocked by normal startup drift.

Avoid wording like "the existing shortcut is old" or "the wrapper is definitely outdated" unless the file contents were actually checked. Prefer action-first wording such as "the shortcut did not start, so I will refresh the local sync shortcuts once and retry."

For non-technical users, prefer telling them about the wrapper shortcut first:

```bash
<absolute-target-dir>/.pcsync/watch.sh
```

Only fall back to the longer raw command form when the shortcut is unavailable or when troubleshooting.
