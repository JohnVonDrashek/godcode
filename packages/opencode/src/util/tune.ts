import baseAgentic from "@/session/prompt/tune/base/agentic.txt"
import baseDefault from "@/session/prompt/tune/base/default.txt"
import baseLean from "@/session/prompt/tune/base/lean.txt"
import editingDefault from "@/session/prompt/tune/editing/default.txt"
import editingRefactor from "@/session/prompt/tune/editing/refactor.txt"
import editingStrict from "@/session/prompt/tune/editing/strict.txt"
import formatDefault from "@/session/prompt/tune/format/default.txt"
import formatPlain from "@/session/prompt/tune/format/plain.txt"
import formatStructured from "@/session/prompt/tune/format/structured.txt"
import frontendArt from "@/session/prompt/tune/frontend/art-direct.txt"
import frontendDefault from "@/session/prompt/tune/frontend/default.txt"
import frontendPreserve from "@/session/prompt/tune/frontend/preserve.txt"
import gitCautious from "@/session/prompt/tune/git/cautious.txt"
import gitDefault from "@/session/prompt/tune/git/default.txt"
import gitPermissive from "@/session/prompt/tune/git/permissive.txt"
import presentingDefault from "@/session/prompt/tune/presenting/default.txt"
import presentingTeaching from "@/session/prompt/tune/presenting/teaching.txt"
import presentingTerse from "@/session/prompt/tune/presenting/terse.txt"
import toolingDeep from "@/session/prompt/tune/tooling/deep.txt"
import toolingDefault from "@/session/prompt/tune/tooling/default.txt"
import toolingFocused from "@/session/prompt/tune/tooling/focused.txt"

type TuneKey = "base" | "editing" | "tooling" | "git" | "frontend" | "presenting" | "format"

type TuneValue = Record<TuneKey, string>

export namespace Tune {
  export type Key = TuneKey
  export type Value = TuneValue
  export type Info = {
    order: TuneKey[]
    values: TuneValue
  }

  const keys = ["base", "editing", "tooling", "git", "frontend", "presenting", "format"] as const

  const defs: Record<
    TuneKey,
    {
      title: string
      help: string
      values: Record<string, { label: string; hint: string; path: string; prompt: string }>
    }
  > = {
    base: {
      title: "Base",
      help: "Sets the agent's role and top-level operating stance",
      values: {
        lean: {
          label: "Lean",
          hint: "Says HolyCode is a CLI coding agent and should help directly, without the extra operating-frame sentence.",
          path: "packages/opencode/src/session/prompt/tune/base/lean.txt",
          prompt: baseLean.trim(),
        },
        default: {
          label: "Default",
          hint: "Defines HolyCode as an interactive CLI coding tool and explicitly says the rest of the prompt is operating instructions.",
          path: "packages/opencode/src/session/prompt/tune/base/default.txt",
          prompt: baseDefault.trim(),
        },
        agentic: {
          label: "Agentic",
          hint: "Adds a bias toward using repo context, making practical progress, and choosing reasonable defaults to keep the user unblocked.",
          path: "packages/opencode/src/session/prompt/tune/base/agentic.txt",
          prompt: baseAgentic.trim(),
        },
      },
    },
    editing: {
      title: "Editing",
      help: "Controls how conservative code edits should be",
      values: {
        strict: {
          label: "Strict",
          hint: "Adds explicit pressure to keep diffs small, preserve nearby naming/style, and remove avoidable churn before finishing.",
          path: "packages/opencode/src/session/prompt/tune/editing/strict.txt",
          prompt: editingStrict.trim(),
        },
        default: {
          label: "Default",
          hint: "Requires ASCII by default, comments only when needed, and `apply_patch` for ordinary edits unless the change is generated or bulk scripted.",
          path: "packages/opencode/src/session/prompt/tune/editing/default.txt",
          prompt: editingDefault.trim(),
        },
        refactor: {
          label: "Refactor",
          hint: "Allows renames, helper extraction, and broader local restructuring when that clearly simplifies the code without drifting into speculative redesign.",
          path: "packages/opencode/src/session/prompt/tune/editing/refactor.txt",
          prompt: editingRefactor.trim(),
        },
      },
    },
    tooling: {
      title: "Tooling",
      help: "Controls search depth and tool selection style",
      values: {
        focused: {
          label: "Focused",
          hint: "Cuts down exploratory reads and broad searches so the agent moves faster once the likely path is clear.",
          path: "packages/opencode/src/session/prompt/tune/tooling/focused.txt",
          prompt: toolingFocused.trim(),
        },
        default: {
          label: "Default",
          hint: "Prefers Read/Edit/Glob/Grep for file work, Bash for terminal work, and parallel calls when tasks are independent.",
          path: "packages/opencode/src/session/prompt/tune/tooling/default.txt",
          prompt: toolingDefault.trim(),
        },
        deep: {
          label: "Deep",
          hint: "Pushes the agent to gather more surrounding context up front, batch useful reads, and prefer dedicated repo tools over shell exploration.",
          path: "packages/opencode/src/session/prompt/tune/tooling/deep.txt",
          prompt: toolingDeep.trim(),
        },
      },
    },
    git: {
      title: "Git",
      help: "Controls how cautious the agent is with git state",
      values: {
        permissive: {
          label: "Permissive",
          hint: "Keeps the core safety rules but is less likely to add extra warnings or hesitation around routine requested git work.",
          path: "packages/opencode/src/session/prompt/tune/git/permissive.txt",
          prompt: gitPermissive.trim(),
        },
        default: {
          label: "Default",
          hint: "Protects unrelated user changes, assumes the tree may be dirty, avoids amend by default, and blocks destructive git commands unless explicitly requested.",
          path: "packages/opencode/src/session/prompt/tune/git/default.txt",
          prompt: gitDefault.trim(),
        },
        cautious: {
          label: "Cautious",
          hint: "Adds stronger warnings around dirty files, scopes git changes more tightly, and is extra careful around commits, rebases, and irreversible operations.",
          path: "packages/opencode/src/session/prompt/tune/git/cautious.txt",
          prompt: gitCautious.trim(),
        },
      },
    },
    frontend: {
      title: "Frontend",
      help: "Controls how much visual direction to apply in UI work",
      values: {
        preserve: {
          label: "Preserve",
          hint: "Focuses on matching the existing design system and only keeps a light reminder to avoid generic-looking UI.",
          path: "packages/opencode/src/session/prompt/tune/frontend/preserve.txt",
          prompt: frontendPreserve.trim(),
        },
        default: {
          label: "Default",
          hint: "Pushes against bland layouts with typography, color, motion, and background guidance while still preserving an existing design system when present.",
          path: "packages/opencode/src/session/prompt/tune/frontend/default.txt",
          prompt: frontendDefault.trim(),
        },
        "art-direct": {
          label: "Art Direct",
          hint: "Pushes harder on hierarchy, spacing, interaction states, and one strong visual idea so the UI feels more intentionally art-directed.",
          path: "packages/opencode/src/session/prompt/tune/frontend/art-direct.txt",
          prompt: frontendArt.trim(),
        },
      },
    },
    presenting: {
      title: "Presenting",
      help: "Controls explanation style and how much rationale to include",
      values: {
        terse: {
          label: "Terse",
          hint: "Keeps explanations short, avoids extra wrap-up, and focuses on the action taken plus only the most necessary code-change note.",
          path: "packages/opencode/src/session/prompt/tune/presenting/terse.txt",
          prompt: presentingTerse.trim(),
        },
        default: {
          label: "Default",
          hint: "Tells the agent to act without permission questions, ask only when truly needed, summarize substantial work, and suggest next steps when useful.",
          path: "packages/opencode/src/session/prompt/tune/presenting/default.txt",
          prompt: presentingDefault.trim(),
        },
        teaching: {
          label: "Teaching",
          hint: "Adds more rationale, plain-language tradeoffs, and cross-file or subsystem explanation so the user can understand why the result is shaped the way it is.",
          path: "packages/opencode/src/session/prompt/tune/presenting/teaching.txt",
          prompt: presentingTeaching.trim(),
        },
      },
    },
    format: {
      title: "Format",
      help: "Controls how structured the final response should feel",
      values: {
        plain: {
          label: "Plain",
          hint: "Uses lighter structure, fewer sections, and only as much formatting as the task needs while still keeping responses easy to scan.",
          path: "packages/opencode/src/session/prompt/tune/format/plain.txt",
          prompt: formatPlain.trim(),
        },
        default: {
          label: "Default",
          hint: "Applies the house style for bullets, code fences, concise tone, and clickable file references without forcing extra structure.",
          path: "packages/opencode/src/session/prompt/tune/format/default.txt",
          prompt: formatDefault.trim(),
        },
        structured: {
          label: "Structured",
          hint: "Pushes harder on grouping related points, avoiding long bullet walls, and keeping file references close to the explanation they support.",
          path: "packages/opencode/src/session/prompt/tune/format/structured.txt",
          prompt: formatStructured.trim(),
        },
      },
    },
  }

  const base: TuneValue = {
    base: "default",
    editing: "default",
    tooling: "default",
    git: "default",
    frontend: "default",
    presenting: "default",
    format: "default",
  }

  export const DEFAULT: Info = {
    order: [...keys],
    values: base,
  }

  export function list() {
    return [...keys]
  }

  export function meta(key: Key) {
    return defs[key]
  }

  export function copy(info: Info) {
    return {
      order: [...info.order],
      values: { ...info.values },
    }
  }

  function legacy(key: TuneKey, value: string) {
    if (value === "codex") return "default"
    if (key === "base") {
      if (value === "minimal") return "lean"
      if (value === "extra") return "agentic"
      return value
    }
    if (key === "editing") {
      if (value === "extra") return "strict"
      if (value === "lean" || value === "light" || value === "off") return "default"
      return value
    }
    if (key === "tooling") {
      if (value === "extra") return "deep"
      if (value === "lean" || value === "light" || value === "off") return "focused"
      return value
    }
    if (key === "git") {
      if (value === "extra") return "cautious"
      if (value === "lean" || value === "light" || value === "off") return "permissive"
      return value
    }
    if (key === "frontend") {
      if (value === "extra") return "art-direct"
      if (value === "lean" || value === "off" || value === "preserve") return "preserve"
      return value
    }
    if (key === "presenting") {
      if (value === "extra") return "teaching"
      if (value === "lean" || value === "off" || value === "concise") return "terse"
      return value
    }
    if (key === "format") {
      if (value === "extra") return "structured"
      if (value === "lean" || value === "light" || value === "off") return "plain"
      return value
    }
    return value
  }

  export function from(input: unknown) {
    if (!input || typeof input !== "object") return copy(DEFAULT)
    const info = input as Partial<Info>
    const seen = new Set<TuneKey>()
    const order = Array.isArray(info.order)
      ? info.order.filter((item): item is TuneKey => {
          if (!keys.includes(item as TuneKey)) return false
          if (seen.has(item as TuneKey)) return false
          seen.add(item as TuneKey)
          return true
        })
      : []
    for (const key of keys) {
      if (seen.has(key)) continue
      order.push(key)
    }
    const values: TuneValue = { ...DEFAULT.values }
    if (info.values && typeof info.values === "object") {
      for (const key of keys) {
        const value = (info.values as Record<string, unknown>)[key]
        const next = typeof value === "string" ? legacy(key, value) : value
        if (typeof next === "string" && next in defs[key].values) values[key] = next
      }
    }
    return { order, values }
  }

  export function equal(a: Info, b: Info) {
    return a.order.every((item, i) => item === b.order[i]) && keys.every((key) => a.values[key] === b.values[key])
  }

  export function active(info: Info) {
    return !equal(info, DEFAULT)
  }

  export function prompt(info: Info) {
    const tune = from(info)
    return tune.order
      .map((key) => defs[key].values[tune.values[key]].prompt)
      .filter(Boolean)
      .join("\n\n")
  }

  export function system(info: Info) {
    return prompt(info)
  }

  export function summary(info: Info) {
    const tune = from(info)
    if (!active(tune)) return undefined
    return tune.order.map((key) => defs[key].values[tune.values[key]].label.toLowerCase()).join(" / ")
  }

  export function cycle(info: Info, key: Key, dir: 1 | -1) {
    const tune = copy(from(info))
    const vals = Object.keys(defs[key].values)
    let next = vals.indexOf(tune.values[key]) + dir
    if (next < 0) next = vals.length - 1
    if (next >= vals.length) next = 0
    tune.values[key] = vals[next]
    return tune
  }

  export function move(info: Info, key: Key, dir: 1 | -1) {
    const tune = copy(from(info))
    const i = tune.order.indexOf(key)
    if (i === -1) return tune
    const j = i + dir
    if (j < 0 || j >= tune.order.length) return tune
    ;[tune.order[i], tune.order[j]] = [tune.order[j], tune.order[i]]
    return tune
  }
}
