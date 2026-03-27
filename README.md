# HolyCode

Terminal-first coding agent for real projects.

HolyCode is CrusadeSoft's public fork of OpenCode, focused on an interactive terminal workflow plus scriptable one-shot runs.

Repository: `https://github.com/crusadesoft/holycode`

## Why HolyCode

- Interactive terminal UI with `holycode`
- One-shot execution with `holycode run`
- Project-aware runs in the current repo or a target directory
- Provider and model management from the CLI
- SDK and plugin packages for integrations and extensions

The source repository is public. The published packages are currently private on GitHub Packages.

## Install

HolyCode packages are currently distributed through GitHub Packages only.

You need:

- access to the `@crusadesoft` packages
- a GitHub token with package read access

Export a token first:

```bash
export GITHUB_TOKEN=your_github_token
```

Configure npm auth:

```ini
@crusadesoft:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
always-auth=true
```

Install the CLI:

```bash
npm install -g @crusadesoft/holycode@0.0.2
```

Install the libraries:

```bash
npm install @crusadesoft/sdk@0.0.2
npm install @crusadesoft/plugin@0.0.2
```

You can use `pnpm`, `yarn`, or `bun` instead if you prefer.

## Quick Start

Show the command list:

```bash
holycode --help
```

Start the interactive UI in the current directory:

```bash
holycode
```

Start it in another project:

```bash
holycode /path/to/project
```

Before doing real work, sign in to a provider or configure provider credentials for the models you want to use:

```bash
holycode providers list
holycode providers login
holycode models
```

## Common Usage

Run a single prompt without entering the full UI:

```bash
holycode run "Review this repository and suggest the next refactor"
```

Run against a specific directory:

```bash
holycode run --dir /path/to/project "Summarize this codebase"
```

Attach files to a run:

```bash
holycode run -f README.md -f package.json "Suggest cleanup work"
```

Continue the last session:

```bash
holycode run --continue "Apply the next step"
```

Pick a model explicitly when needed:

```bash
holycode run -m openai/gpt-5 "Draft a migration plan"
```

## Packages

`@crusadesoft/holycode`

- Terminal app and CLI
- Current private package version: `0.0.2`

`@crusadesoft/sdk`

- Typed client package for integrating with HolyCode programmatically
- Current private package version: `0.0.2`

`@crusadesoft/plugin`

- Plugin API for custom hooks and tools
- Current private package version: `0.0.2`

## Develop Locally

HolyCode development uses Bun.

```bash
bun install
bun dev
```

Run it against another directory:

```bash
bun dev /path/to/project
```

If you change the internal client/server contract, regenerate the JavaScript SDK:

```bash
./packages/sdk/js/script/build.ts
```

## Contributing

Read `CONTRIBUTING.md` before opening a PR.

Good contributions include:

- bug fixes
- provider support
- environment and packaging fixes
- performance work
- documentation improvements

For larger product or UI changes, start with an issue and expect design review first.
