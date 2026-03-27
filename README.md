# HolyCode

CrusadeSoft's terminal-first AI coding agent fork.

## What It Does

- Runs an interactive AI coding assistant in the terminal
- Supports one-shot CLI runs like code review, repo summaries, and edits
- Publishes fork-owned packages for the CLI, SDK, and plugin layer

## Why HolyCode

- Keeps this fork installable under CrusadeSoft-owned package names
- Gives us a place to ship fork-specific workflow and product changes
- Separates HolyCode usage from the upstream OpenCode branding

## Install

- GitHub Packages only
- Current package visibility: private
- You need GitHub access to the package before install will work

1. Create a GitHub token with package read access.

```bash
export GITHUB_TOKEN=your_github_token
```

2. Add scope and auth config to `.npmrc`.

```ini
@crusadesoft:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
always-auth=true
```

3. Install the package you need.

```bash
# CLI
npm install -g @crusadesoft/holycode

# SDK
npm install @crusadesoft/sdk

# Plugin
npm install @crusadesoft/plugin
```

4. Optional package manager variants.

```bash
pnpm add -g @crusadesoft/holycode
pnpm add @crusadesoft/sdk @crusadesoft/plugin

yarn global add @crusadesoft/holycode
yarn add @crusadesoft/sdk @crusadesoft/plugin

bun add -g @crusadesoft/holycode
bun add @crusadesoft/sdk @crusadesoft/plugin
```

## Usage

- Start the interactive CLI:

```bash
holycode
```

- Run a one-shot prompt:

```bash
holycode run "Review this repository and suggest the next refactor"
```

- Run against a specific directory:

```bash
holycode run --dir /path/to/project "Summarize the current codebase"
```

## Packages

- CLI: `@crusadesoft/holycode`
- SDK: `@crusadesoft/sdk`
- Plugin: `@crusadesoft/plugin`

## Contributing

- For repository contribution guidelines, see `CONTRIBUTING.md`
