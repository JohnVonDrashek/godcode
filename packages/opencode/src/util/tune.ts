import fs from "fs"
import path from "path"
import matter from "gray-matter"
import { ConfigMarkdown } from "@/config/markdown"

type TuneDef = {
  title: string
  help: string
  values: Record<string, { label: string; hint: string; path: string; prompt: string }>
}

type TuneOptions = {
  order: string[]
  sections: Record<string, { title: string; help: string; default?: string }>
}

type TuneState = {
  keys: string[]
  defs: Record<string, TuneDef>
  values: Record<string, string>
}

const cache: { sig?: string; state?: TuneState } = {}

function root() {
  return process.env.OPENCODE_TUNE_DIR || path.join(import.meta.dir, "../session/prompt/tune")
}

function title(input: string) {
  return input
    .split(/[-_]/g)
    .filter(Boolean)
    .map((item) => item[0].toUpperCase() + item.slice(1))
    .join(" ")
}

function shown(file: string) {
  const rel = path.relative(process.cwd(), file)
  return rel.startsWith("..") ? file : rel
}

function scan(dir: string): string[] {
  if (!fs.existsSync(dir)) return []
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((item) => {
    const next = path.join(dir, item.name)
    if (item.isDirectory()) return scan(next)
    if (!item.isFile() || !item.name.endsWith(".txt") || item.name === "options.txt") return []
    return [next]
  })
}

function parse(file: string) {
  const text = fs.readFileSync(file, "utf8")
  try {
    return matter(text)
  } catch {
    return matter(ConfigMarkdown.fallbackSanitization(text))
  }
}

function options() {
  const file = path.join(root(), "options.txt")
  if (!fs.existsSync(file)) {
    return {
      order: [],
      sections: {},
    } satisfies TuneOptions
  }
  const md = parse(file)
  const data = md.data as Record<string, unknown>
  return {
    order: Array.isArray(data.order) ? data.order.filter((item): item is string => typeof item === "string") : [],
    sections: Object.fromEntries(
      Object.entries(((data.sections as Record<string, unknown>) ?? {}) as Record<string, unknown>).map(
        ([key, value]) => {
          const item = (value ?? {}) as Record<string, unknown>
          return [
            key,
            {
              title: typeof item.name === "string" ? item.name : title(key),
              help: typeof item.description === "string" ? item.description : "",
              default: typeof item.default === "string" ? item.default : undefined,
            },
          ]
        },
      ),
    ),
  } satisfies TuneOptions
}

function load() {
  const files = scan(root()).sort()
  const cfg = options()
  const file = path.join(root(), "options.txt")
  const sig = files
    .map((item) => `${item}:${fs.statSync(item).mtimeMs}`)
    .concat([`${file}:${fs.existsSync(file) ? fs.statSync(file).mtimeMs : 0}`])
    .join("|")
  if (cache.sig === sig && cache.state) return cache.state

  const map = new Map<
    string,
    {
      key: string
      title: string
      help: string
      values: Array<{
        key: string
        label: string
        hint: string
        path: string
        prompt: string
      }>
    }
  >()

  for (const file of files) {
    const md = parse(file)
    const dir = path.basename(path.dirname(file))
    const key = dir
    const data = md.data as Record<string, unknown>
    const item = map.get(key) || {
      key,
      title: cfg.sections[key]?.title || title(dir),
      help: cfg.sections[key]?.help || "",
      values: [],
    }
    item.values.push({
      key: path.basename(file, ".txt"),
      label: typeof data.name === "string" ? data.name : title(path.basename(file, ".txt")),
      hint: typeof data.description === "string" ? data.description : typeof data.hint === "string" ? data.hint : "",
      path: shown(file),
      prompt: md.content.trim(),
    })
    map.set(key, item)
  }

  const sections = [...map.values()].sort((a, b) => {
    const ai = cfg.order.indexOf(a.key)
    const bi = cfg.order.indexOf(b.key)
    if (ai !== -1 || bi !== -1) {
      if (ai === -1) return 1
      if (bi === -1) return -1
      if (ai !== bi) return ai - bi
    }
    return a.title.localeCompare(b.title) || a.key.localeCompare(b.key)
  })
  const defs = Object.fromEntries(
    sections.map((item) => {
      const values = item.values.toSorted((a, b) => a.label.localeCompare(b.label) || a.key.localeCompare(b.key))
      return [
        item.key,
        {
          title: item.title,
          help: item.help,
          values: Object.fromEntries(
            values.map((value) => [
              value.key,
              { label: value.label, hint: value.hint, path: value.path, prompt: value.prompt },
            ]),
          ),
        },
      ]
    }),
  )
  const values = Object.fromEntries(
    sections.map((item) => {
      const list = item.values.toSorted((a, b) => a.label.localeCompare(b.label) || a.key.localeCompare(b.key))
      const selected =
        list.find((value) => value.key === cfg.sections[item.key]?.default) ||
        list.find((value) => value.key === "default") ||
        list[0]
      return [item.key, selected.key]
    }),
  )
  const state = {
    keys: sections.map((item) => item.key),
    defs,
    values,
  }
  cache.sig = sig
  cache.state = state
  return state
}

function legacy(key: string, value: string) {
  const state = load()
  if (value in (state.defs[key]?.values ?? {})) return value
  if (value === "codex") return "default"
  if (key === "base") {
    if (value === "minimal") return "lean"
    if (value === "extra") return "agentic"
  }
  if (key === "editing") {
    if (value === "extra") return "strict"
    if (value === "lean" || value === "light" || value === "off") return "default"
  }
  if (key === "tooling") {
    if (value === "extra") return "deep"
    if (value === "lean" || value === "light" || value === "off") return "focused"
  }
  if (key === "git") {
    if (value === "extra") return "cautious"
    if (value === "lean" || value === "light" || value === "off") return "permissive"
  }
  if (key === "frontend") {
    if (value === "extra") return "art-direct"
    if (value === "lean" || value === "off" || value === "preserve") return "preserve"
  }
  if (key === "presenting") {
    if (value === "extra") return "teaching"
    if (value === "lean" || value === "off" || value === "concise") return "terse"
  }
  if (key === "format") {
    if (value === "extra") return "structured"
    if (value === "lean" || value === "light" || value === "off") return "plain"
  }
  const match = Object.entries(state.defs[key]?.values ?? {}).find(
    ([, item]) => item.label.toLowerCase() === value.toLowerCase(),
  )
  return match?.[0] || state.values[key] || value
}

export namespace Tune {
  export type Key = string
  export type Value = Record<string, string>
  export type Info = {
    order: string[]
    values: Record<string, string>
  }

  export function reload() {
    cache.sig = undefined
    cache.state = undefined
  }

  export const DEFAULT: Info = {
    get order() {
      return [...load().keys]
    },
    get values() {
      return { ...load().values }
    },
  }

  export function list() {
    return [...load().keys]
  }

  export function meta(key: Key) {
    return load().defs[key]
  }

  export function copy(info: Info) {
    return {
      order: [...info.order],
      values: { ...info.values },
    }
  }

  export function from(input: unknown) {
    const state = load()
    if (!input || typeof input !== "object") return copy(DEFAULT)
    const info = input as Partial<Info>
    const seen = new Set<string>()
    const order = Array.isArray(info.order)
      ? info.order.filter((item): item is string => {
          if (typeof item !== "string") return false
          if (!state.keys.includes(item)) return false
          if (seen.has(item)) return false
          seen.add(item)
          return true
        })
      : []
    for (const key of state.keys) {
      if (seen.has(key)) continue
      order.push(key)
    }
    const values = { ...state.values }
    if (info.values && typeof info.values === "object") {
      for (const key of state.keys) {
        const raw = (info.values as Record<string, unknown>)[key]
        if (typeof raw !== "string") continue
        const next = legacy(key, raw)
        if (next in state.defs[key].values) values[key] = next
      }
    }
    return { order, values }
  }

  export function equal(a: Info, b: Info) {
    return (
      a.order.every((item, i) => item === b.order[i]) &&
      Object.keys(load().values).every((key) => a.values[key] === b.values[key])
    )
  }

  export function active(info: Info) {
    return !equal(info, DEFAULT)
  }

  export function prompt(info: Info) {
    const tune = from(info)
    return tune.order
      .map((key) => load().defs[key]?.values[tune.values[key]]?.prompt)
      .filter(Boolean)
      .join("\n\n")
  }

  export function system(info: Info) {
    return prompt(info)
  }

  export function summary(info: Info) {
    const tune = from(info)
    if (!active(tune)) return undefined
    return tune.order.map((key) => load().defs[key].values[tune.values[key]].label.toLowerCase()).join(" / ")
  }

  export function cycle(info: Info, key: Key, dir: 1 | -1) {
    const tune = copy(from(info))
    const vals = Object.keys(load().defs[key]?.values ?? {})
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
