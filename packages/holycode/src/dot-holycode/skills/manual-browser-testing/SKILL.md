---
name: manual-browser-testing
description: Use for testing via browser manually. Best for really understanding what the user is seeing.
---

# Manual Browser Testing

Use `@playwright/cli` for browser interaction.

**IMPORTANT:** Always use a unique named session (`-s=`) for every browser interaction to avoid conflicts with other agents. `openssl rand -hex 6` for random string. 

### Start
If it is not, installed you can ask user permission to install with this command:
  - `npm install -g @playwright/cli@latest`

Make sure to add .playwright-cli to the .gitignore because that's where all of your session data is getting dumped.

### Named sessions (`-s=name`)

Named sessions allow multiple browsers simultaneously (e.g., testing calls between two users):
- `playwright-cli -s=caller open https://app.forumline.net` — open Chrome session named "caller"
- `PLAYWRIGHT_MCP_BROWSER=webkit playwright-cli -s=callee open https://app.forumline.net` — open WebKit (Safari) session named "callee"
- Sessions persist until explicitly closed; commands target a session with `-s=name`

### Core commands

- `playwright-cli open <url>` — open browser, get snapshot
- `playwright-cli snapshot` — read current page state (accessibility tree with element refs)
- `playwright-cli click <ref>` / `fill <ref> <text>` — interact with elements
- `playwright-cli screenshot --filename /tmp/name.png` — save screenshot, then `Read` the image to view it
- `playwright-cli console info` — check console logs (filter by level: info, error, warning)
- `playwright-cli network` — list network requests
- `playwright-cli eval <js>` — run JavaScript on the page
- `playwright-cli reload` — reload current page

### Session management

- `playwright-cli list` — list all open browser sessions
- `playwright-cli close-all` — close all browser sessions
- `playwright-cli kill-all` — force kill zombie sessions

### Cleanup

- `rm -rf .playwright-cli` to remove the session cache from the repo root

### Parallel testing with sub-agents

Named sessions enable fully parallel browser testing across sub-agents. Each agent gets its own session name, so they never interfere:
- `playwright-cli -s=agent1 open http://localhost:8788` — Agent 1's isolated browser
- `playwright-cli -s=agent2 open http://localhost:8788` — Agent 2's isolated browser
- You can also set `PLAYWRIGHT_CLI_SESSION=agent1` as an env var instead of `-s=` on every command
- Use `playwright-cli list` to see all active sessions, `playwright-cli close-all` to clean up
- This means bug-finding and verification can be parallelized across multiple agents, each with their own browser instance

### Multi-browser testing workflow

1. Open Chrome and WebKit sessions with `-s=` and `PLAYWRIGHT_MCP_BROWSER=webkit`
2. Use `snapshot` to get element refs (refs change between snapshots — always re-snapshot before clicking)
3. Use `screenshot` + `Read` to see visual state (overlays, modals not visible in accessibility tree)
4. Use `console info` to capture diagnostic logs from each browser
5. For mic/camera permissions: user must manually click "Allow" on the browser popup