import { Config } from "effect"

function truthy(key: string) {
  const value = process.env[key]?.toLowerCase()
  return value === "true" || value === "1"
}

function falsy(key: string) {
  const value = process.env[key]?.toLowerCase()
  return value === "false" || value === "0"
}

export namespace Flag {
  export const HOLYCODE_GIT_BASH_PATH = process.env["HOLYCODE_GIT_BASH_PATH"]
  export const HOLYCODE_CONFIG = process.env["HOLYCODE_CONFIG"]
  export declare const HOLYCODE_TUI_CONFIG: string | undefined
  export declare const HOLYCODE_CONFIG_DIR: string | undefined
  export const HOLYCODE_CONFIG_CONTENT = process.env["HOLYCODE_CONFIG_CONTENT"]
  export const HOLYCODE_DISABLE_AUTOUPDATE = truthy("HOLYCODE_DISABLE_AUTOUPDATE")
  export const HOLYCODE_ALWAYS_NOTIFY_UPDATE = truthy("HOLYCODE_ALWAYS_NOTIFY_UPDATE")
  export const HOLYCODE_DISABLE_PRUNE = truthy("HOLYCODE_DISABLE_PRUNE")
  export const HOLYCODE_DISABLE_TERMINAL_TITLE = truthy("HOLYCODE_DISABLE_TERMINAL_TITLE")
  export const HOLYCODE_PERMISSION = process.env["HOLYCODE_PERMISSION"]
  export const HOLYCODE_DISABLE_DEFAULT_PLUGINS = truthy("HOLYCODE_DISABLE_DEFAULT_PLUGINS")
  export const HOLYCODE_DISABLE_LSP_DOWNLOAD = truthy("HOLYCODE_DISABLE_LSP_DOWNLOAD")
  export const HOLYCODE_ENABLE_EXPERIMENTAL_MODELS = truthy("HOLYCODE_ENABLE_EXPERIMENTAL_MODELS")
  export const HOLYCODE_DISABLE_AUTOCOMPACT = truthy("HOLYCODE_DISABLE_AUTOCOMPACT")
  export const HOLYCODE_DISABLE_MODELS_FETCH = truthy("HOLYCODE_DISABLE_MODELS_FETCH")
  export const HOLYCODE_DISABLE_CLAUDE_CODE = truthy("HOLYCODE_DISABLE_CLAUDE_CODE")
  export const HOLYCODE_DISABLE_CLAUDE_CODE_PROMPT =
    HOLYCODE_DISABLE_CLAUDE_CODE || truthy("HOLYCODE_DISABLE_CLAUDE_CODE_PROMPT")
  export const HOLYCODE_DISABLE_CLAUDE_CODE_SKILLS =
    HOLYCODE_DISABLE_CLAUDE_CODE || truthy("HOLYCODE_DISABLE_CLAUDE_CODE_SKILLS")
  export const HOLYCODE_DISABLE_EXTERNAL_SKILLS =
    HOLYCODE_DISABLE_CLAUDE_CODE_SKILLS || truthy("HOLYCODE_DISABLE_EXTERNAL_SKILLS")
  export declare const HOLYCODE_DISABLE_PROJECT_CONFIG: boolean
  export const HOLYCODE_FAKE_VCS = process.env["HOLYCODE_FAKE_VCS"]
  export declare const HOLYCODE_CLIENT: string
  export const HOLYCODE_ENABLE_QUESTION_TOOL = truthy("HOLYCODE_ENABLE_QUESTION_TOOL")

  // Experimental
  export const HOLYCODE_EXPERIMENTAL = truthy("HOLYCODE_EXPERIMENTAL")
  export const HOLYCODE_EXPERIMENTAL_FILEWATCHER = Config.boolean("HOLYCODE_EXPERIMENTAL_FILEWATCHER").pipe(
    Config.withDefault(false),
  )
  export const HOLYCODE_EXPERIMENTAL_DISABLE_FILEWATCHER = Config.boolean(
    "HOLYCODE_EXPERIMENTAL_DISABLE_FILEWATCHER",
  ).pipe(Config.withDefault(false))
  export const HOLYCODE_EXPERIMENTAL_ICON_DISCOVERY =
    HOLYCODE_EXPERIMENTAL || truthy("HOLYCODE_EXPERIMENTAL_ICON_DISCOVERY")

  export const HOLYCODE_ENABLE_EXA =
    truthy("HOLYCODE_ENABLE_EXA") || HOLYCODE_EXPERIMENTAL || truthy("HOLYCODE_EXPERIMENTAL_EXA")
  export const HOLYCODE_EXPERIMENTAL_BASH_DEFAULT_TIMEOUT_MS = number("HOLYCODE_EXPERIMENTAL_BASH_DEFAULT_TIMEOUT_MS")
  export const HOLYCODE_EXPERIMENTAL_OUTPUT_TOKEN_MAX = number("HOLYCODE_EXPERIMENTAL_OUTPUT_TOKEN_MAX")
  export const HOLYCODE_EXPERIMENTAL_OXFMT = HOLYCODE_EXPERIMENTAL || truthy("HOLYCODE_EXPERIMENTAL_OXFMT")
  export const HOLYCODE_EXPERIMENTAL_LSP_TY = truthy("HOLYCODE_EXPERIMENTAL_LSP_TY")
  export const HOLYCODE_EXPERIMENTAL_LSP_TOOL = HOLYCODE_EXPERIMENTAL || truthy("HOLYCODE_EXPERIMENTAL_LSP_TOOL")
  export const HOLYCODE_DISABLE_FILETIME_CHECK = Config.boolean("HOLYCODE_DISABLE_FILETIME_CHECK").pipe(
    Config.withDefault(false),
  )
  export const HOLYCODE_EXPERIMENTAL_PLAN_MODE = HOLYCODE_EXPERIMENTAL || truthy("HOLYCODE_EXPERIMENTAL_PLAN_MODE")
  export const HOLYCODE_EXPERIMENTAL_MARKDOWN = !falsy("HOLYCODE_EXPERIMENTAL_MARKDOWN")
  export const HOLYCODE_MODELS_URL = process.env["HOLYCODE_MODELS_URL"]
  export const HOLYCODE_MODELS_PATH = process.env["HOLYCODE_MODELS_PATH"]
  export const HOLYCODE_DB = process.env["HOLYCODE_DB"]
  export const HOLYCODE_DISABLE_CHANNEL_DB = truthy("HOLYCODE_DISABLE_CHANNEL_DB")
  export const HOLYCODE_SKIP_MIGRATIONS = truthy("HOLYCODE_SKIP_MIGRATIONS")
  export const HOLYCODE_STRICT_CONFIG_DEPS = truthy("HOLYCODE_STRICT_CONFIG_DEPS")

  function number(key: string) {
    const value = process.env[key]
    if (!value) return undefined
    const parsed = Number(value)
    return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined
  }
}

// Dynamic getter for HOLYCODE_DISABLE_PROJECT_CONFIG
// This must be evaluated at access time, not module load time,
// because external tooling may set this env var at runtime
Object.defineProperty(Flag, "HOLYCODE_DISABLE_PROJECT_CONFIG", {
  get() {
    return truthy("HOLYCODE_DISABLE_PROJECT_CONFIG")
  },
  enumerable: true,
  configurable: false,
})

// Dynamic getter for HOLYCODE_TUI_CONFIG
// This must be evaluated at access time, not module load time,
// because tests and external tooling may set this env var at runtime
Object.defineProperty(Flag, "HOLYCODE_TUI_CONFIG", {
  get() {
    return process.env["HOLYCODE_TUI_CONFIG"]
  },
  enumerable: true,
  configurable: false,
})

// Dynamic getter for HOLYCODE_CONFIG_DIR
// This must be evaluated at access time, not module load time,
// because external tooling may set this env var at runtime
Object.defineProperty(Flag, "HOLYCODE_CONFIG_DIR", {
  get() {
    return process.env["HOLYCODE_CONFIG_DIR"]
  },
  enumerable: true,
  configurable: false,
})

// Dynamic getter for HOLYCODE_CLIENT
// This must be evaluated at access time, not module load time,
// because some commands override the client at runtime
Object.defineProperty(Flag, "HOLYCODE_CLIENT", {
  get() {
    return process.env["HOLYCODE_CLIENT"] ?? "cli"
  },
  enumerable: true,
  configurable: false,
})
