import { Config } from "../config/config"
import z from "zod"
import { Provider } from "../provider/provider"
import { ModelID, ProviderID } from "../provider/schema"
import { generateObject, streamObject, type ModelMessage } from "ai"
import { Instance } from "../project/instance"
import { Truncate } from "../tool/truncate"
import { Auth } from "../auth"
import { ProviderTransform } from "../provider/transform"

import PROMPT_GENERATE from "./generate.txt"
import PROMPT_COMPACTION from "./prompt/compaction.txt"
import PROMPT_SHADOW from "../session/prompt/shadow.txt"
import PROMPT_SHADOW_MAIN from "../session/prompt/shadow-main.txt"
import PROMPT_SUMMARY from "./prompt/summary.txt"
import PROMPT_TITLE from "./prompt/title.txt"
import PLAN from "@/dot-holycode/agents/plan"
import ARCHITECT from "@/dot-holycode/agents/architect"
import REFACTOR from "@/dot-holycode/agents/refactor"
import { Permission } from "@/permission"
import { mergeDeep, pipe, sortBy, values } from "remeda"
import { Global } from "@/global"
import path from "path"
import { Plugin } from "@/plugin"
import { Skill } from "../skill"
import { Effect, ServiceMap, Layer } from "effect"
import { InstanceState } from "@/effect/instance-state"
import { makeRunPromise } from "@/effect/run-service"
import { Tune } from "@/util/tune"
import { Glob } from "@/util/glob"
import { pathToFileURL } from "url"
import { Log } from "@/util/log"

export namespace Agent {
  const log = Log.create({ service: "agent" })

  export const Info = z
    .object({
      name: z.string(),
      description: z.string().optional(),
      mode: z.enum(["subagent", "primary", "all"]),
      switch: z.boolean().optional(),
      native: z.boolean().optional(),
      hidden: z.boolean().optional(),
      topP: z.number().optional(),
      temperature: z.number().optional(),
      color: z.string().optional(),
      permission: Permission.Ruleset,
      model: z
        .object({
          modelID: ModelID.zod,
          providerID: ProviderID.zod,
        })
        .optional(),
      variant: z.string().optional(),
      prompt: z.string().optional(),
      options: z.record(z.string(), z.any()),
      steps: z.number().int().positive().optional(),
    })
    .meta({
      ref: "Agent",
    })
  export type Info = z.infer<typeof Info>

  export interface PatchCtx {
    readonly defaults: Permission.Ruleset
    readonly user: Permission.Ruleset
    readonly directory: string
    readonly worktree: string
    readonly global: typeof Global.Path
    readonly permission: {
      readonly fromConfig: typeof Permission.fromConfig
      readonly merge: typeof Permission.merge
    }
  }

  export interface HookCtx {
    readonly session: unknown
    readonly persist?: boolean
    readonly directory: string
    readonly worktree: string
    readonly plan: string
  }

  export interface Source {
    readonly name?: string
    readonly description?: string
    readonly mode?: Info["mode"]
    readonly switch?: boolean
    readonly native?: boolean
    readonly hidden?: boolean
    readonly topP?: number
    readonly temperature?: number
    readonly color?: string
    readonly permission?: Permission.Ruleset
    readonly model?: string | NonNullable<Info["model"]>
    readonly variant?: string
    readonly prompt?: string
    readonly options?: Record<string, unknown>
    readonly steps?: number
    readonly patch?: (ctx: PatchCtx, info: Info) => MaybePromise<Partial<Source>>
    readonly enter?: (ctx: HookCtx) => MaybePromise<string | undefined>
    readonly leave?: (ctx: HookCtx) => MaybePromise<string | undefined>
  }

  interface Def {
    readonly info: Source
    readonly enter?: Source["enter"]
    readonly leave?: Source["leave"]
    readonly patch?: Source["patch"]
  }

  type MaybePromise<T> = T | Promise<T>

  export interface Interface {
    readonly get: (agent: string) => Effect.Effect<Agent.Info>
    readonly list: () => Effect.Effect<Agent.Info[]>
    readonly defaultAgent: () => Effect.Effect<string>
    readonly enter: (agent: string, input: HookCtx) => Effect.Effect<string | undefined>
    readonly leave: (agent: string, input: HookCtx) => Effect.Effect<string | undefined>
    readonly generate: (input: {
      description: string
      model?: { providerID: ProviderID; modelID: ModelID }
    }) => Effect.Effect<{
      identifier: string
      whenToUse: string
      systemPrompt: string
    }>
  }

  type State = Omit<Interface, "generate">

  const patterns = ["/.holycode/agent/", "/.holycode/agents/", "/agent/", "/agents/"]

  function rel(item: string) {
    const normalized = item.replaceAll("\\", "/")
    for (const pattern of patterns) {
      const index = normalized.indexOf(pattern)
      if (index === -1) continue
      return normalized.slice(index + pattern.length)
    }
  }

  function trim(file: string) {
    const ext = path.extname(file)
    return ext.length ? file.slice(0, -ext.length) : file
  }

  function split(input: Source) {
    const { patch, enter, leave, ...info } = input
    return {
      info,
      patch,
      enter,
      leave,
    } satisfies Def
  }

  async function loadDefs() {
    const result: Record<string, Def> = {
      [PLAN.name ?? "plan"]: split(PLAN),
      [ARCHITECT.name ?? "architect"]: split(ARCHITECT),
      [REFACTOR.name ?? "refactor"]: split(REFACTOR),
    }
    await Config.waitForDependencies()

    for (const dir of await Config.directories()) {
      for (const item of await Glob.scan("{agent,agents}/**/*.{ts,js}", {
        cwd: dir,
        absolute: true,
        dot: true,
        symlink: true,
      })) {
        const file = rel(item) ?? path.basename(item)
        const name = trim(file)

        await import(pathToFileURL(item).href)
          .then((mod) => mod.default ?? mod.agent ?? mod)
          .then((mod) => {
            if (!mod || typeof mod !== "object") throw new Error(`Agent module ${item} must export an object`)
            const def = split({ ...(mod as Source), name: (mod as Source).name ?? name })
            result[def.info.name ?? name] = def
          })
          .catch((err) => {
            log.error("failed to load code agent", {
              path: item,
              error: err instanceof Error ? err.message : String(err),
            })
            throw err
          })
      }
    }

    return result
  }

  function apply(item: Info, input: Partial<Source>) {
    if (input.model) item.model = typeof input.model === "string" ? Provider.parseModel(input.model) : input.model
    item.variant = input.variant ?? item.variant
    item.prompt = input.prompt ?? item.prompt
    item.description = input.description ?? item.description
    item.temperature = input.temperature ?? item.temperature
    item.topP = input.topP ?? item.topP
    item.mode = input.mode ?? item.mode
    item.switch = input.switch ?? item.switch
    item.color = input.color ?? item.color
    item.hidden = input.hidden ?? item.hidden
    item.name = input.name ?? item.name
    item.steps = input.steps ?? item.steps
    item.native = input.native ?? item.native
    item.options = mergeDeep(item.options, input.options ?? {})
    item.permission = Permission.merge(item.permission, input.permission ?? [])
    return item
  }

  export class Service extends ServiceMap.Service<Service, Interface>()("@holycode/Agent") {}

  export const layer = Layer.effect(
    Service,
    Effect.gen(function* () {
      const config = () => Effect.promise(() => Config.get())
      const auth = yield* Auth.Service

      const state = yield* InstanceState.make<State>(
        Effect.fn("Agent.state")(function* (ctx) {
          const cfg = yield* config()
          const skillDirs = yield* Effect.promise(() => Skill.dirs())
          const defs = yield* Effect.promise(() => loadDefs())
          const whitelistedDirs = [Truncate.GLOB, ...skillDirs.map((dir) => path.join(dir, "*"))]

          const defaults = Permission.fromConfig({
            "*": "allow",
            doom_loop: "ask",
            external_directory: {
              "*": "ask",
              ...Object.fromEntries(whitelistedDirs.map((dir) => [dir, "allow"])),
            },
            question: "deny",
            plan_enter: "deny",
            plan_exit: "deny",
            // mirrors github.com/github/gitignore Node.gitignore pattern for .env files
            read: {
              "*": "allow",
              "*.env": "ask",
              "*.env.*": "ask",
              "*.env.example": "allow",
            },
          })

          const user = Permission.fromConfig(cfg.permission ?? {})

          const agents: Record<string, Info> = {
            build: {
              name: "build",
              description: "The default agent. Executes tools based on configured permissions.",
              switch: true,
              options: {
                tune: Tune.DEFAULT,
              },
              permission: Permission.merge(
                defaults,
                Permission.fromConfig({
                  question: "allow",
                  plan_enter: "allow",
                  websearch: "allow",
                }),
                user,
              ),
              mode: "primary",
              native: true,
            },
            shadow: {
              name: "shadow",
              description:
                "Shadow mode. A read-only agent that runs in parallel with the main agent, providing a second perspective.",
              options: {},
              prompt: PROMPT_SHADOW,
              permission: Permission.merge(
                defaults,
                Permission.fromConfig({
                  "*": "deny",
                  google: "allow",
                  grep: "allow",
                  glob: "allow",
                  list: "allow",
                  webfetch: "allow",
                  websearch: "allow",
                  codesearch: "allow",
                  read: "allow",
                  task: "allow",
                  external_directory: {
                    "*": "ask",
                    ...Object.fromEntries(whitelistedDirs.map((dir) => [dir, "allow"])),
                  },
                }),
                user,
              ),
              mode: "primary",
              native: true,
            },
            "shadow-main": {
              name: "shadow-main",
              description: "The main agent used in shadow mode.",
              options: {},
              prompt: PROMPT_SHADOW_MAIN,
              permission: Permission.merge(
                defaults,
                Permission.fromConfig({
                  question: "allow",
                  plan_enter: "allow",
                }),
                user,
              ),
              mode: "primary",
              native: true,
              hidden: true,
            },
            general: {
              name: "general",
              permission: Permission.merge(
                defaults,
                Permission.fromConfig({
                  todoread: "deny",
                  todowrite: "deny",
                }),
                user,
              ),
              options: {},
              mode: "subagent",
              native: true,
            },
            explore: {
              name: "explore",
              permission: Permission.merge(
                defaults,
                Permission.fromConfig({
                  "*": "deny",
                  google: "allow",
                  grep: "allow",
                  glob: "allow",
                  list: "allow",
                  bash: "allow",
                  webfetch: "allow",
                  websearch: "allow",
                  codesearch: "allow",
                  read: "allow",
                  external_directory: {
                    "*": "ask",
                    ...Object.fromEntries(whitelistedDirs.map((dir) => [dir, "allow"])),
                  },
                }),
                user,
              ),
              options: {},
              mode: "subagent",
              native: true,
            },
            "independent-research": {
              name: "independent-research",
              permission: Permission.merge(
                defaults,
                Permission.fromConfig({
                  "*": "deny",
                  google: "allow",
                  websearch: "allow",
                  webfetch: "allow",
                }),
                user,
              ),
              options: {},
              mode: "subagent",
              native: true,
            },
            compaction: {
              name: "compaction",
              mode: "primary",
              native: true,
              hidden: true,
              prompt: PROMPT_COMPACTION,
              permission: Permission.merge(
                defaults,
                Permission.fromConfig({
                  "*": "deny",
                  google: "allow",
                  websearch: "allow",
                  webfetch: "allow",
                }),
                user,
              ),
              options: {},
            },
            title: {
              name: "title",
              mode: "primary",
              options: {},
              native: true,
              hidden: true,
              temperature: 0.5,
              permission: Permission.merge(
                defaults,
                Permission.fromConfig({
                  "*": "deny",
                  google: "allow",
                  websearch: "allow",
                  webfetch: "allow",
                }),
                user,
              ),
              prompt: PROMPT_TITLE,
            },
            summary: {
              name: "summary",
              mode: "primary",
              options: {},
              native: true,
              hidden: true,
              permission: Permission.merge(
                defaults,
                Permission.fromConfig({
                  "*": "deny",
                  google: "allow",
                  websearch: "allow",
                  webfetch: "allow",
                }),
                user,
              ),
              prompt: PROMPT_SUMMARY,
            },
          }

          for (const [name, def] of Object.entries(defs)) {
            let item = agents[name]
            if (!item)
              item = agents[name] = {
                name,
                mode: "all",
                permission: Permission.merge(defaults, user),
                options: {},
                native: false,
              }

            apply(item, def.info)
            if (def.patch) {
              apply(
                item,
                yield* Effect.promise(() =>
                  Promise.resolve(
                    def.patch!(
                      {
                        defaults,
                        user,
                        directory: Instance.directory,
                        worktree: Instance.worktree,
                        global: Global.Path,
                        permission: {
                          fromConfig: Permission.fromConfig,
                          merge: Permission.merge,
                        },
                      },
                      item,
                    ),
                  ),
                ),
              )
            }
          }

          for (const [key, value] of Object.entries(cfg.agent ?? {})) {
            if (value.disable) {
              delete agents[key]
              delete defs[key]
              continue
            }
            let item = agents[key]
            if (!item)
              item = agents[key] = {
                name: key,
                mode: "all",
                permission: Permission.merge(defaults, user),
                options: {},
                native: false,
              }
            if (value.model) item.model = Provider.parseModel(value.model)
            item.variant = value.variant ?? item.variant
            item.prompt = value.prompt ?? item.prompt
            item.description = value.description ?? item.description
            item.temperature = value.temperature ?? item.temperature
            item.topP = value.top_p ?? item.topP
            item.mode = value.mode ?? item.mode
            item.switch = value.switch ?? item.switch
            item.color = value.color ?? item.color
            item.hidden = value.hidden ?? item.hidden
            item.name = value.name ?? item.name
            item.steps = value.steps ?? item.steps
            item.options = mergeDeep(item.options, value.options ?? {})
            item.permission = Permission.merge(item.permission, Permission.fromConfig(value.permission ?? {}))
          }

          // Ensure Truncate.GLOB is allowed unless explicitly configured
          for (const name in agents) {
            const agent = agents[name]
            const explicit = agent.permission.some((r) => {
              if (r.permission !== "external_directory") return false
              if (r.action !== "deny") return false
              return r.pattern === Truncate.GLOB
            })
            if (explicit) continue

            agents[name].permission = Permission.merge(
              agents[name].permission,
              Permission.fromConfig({ external_directory: { [Truncate.GLOB]: "allow" } }),
            )
          }

          const get = Effect.fnUntraced(function* (agent: string) {
            return agents[agent]
          })

          const list = Effect.fnUntraced(function* () {
            const cfg = yield* config()
            return pipe(
              agents,
              values(),
              sortBy(
                [(x) => (cfg.default_agent ? x.name === cfg.default_agent : x.name === "build"), "desc"],
                [(x) => x.name, "asc"],
              ),
            )
          })

          const defaultAgent = Effect.fnUntraced(function* () {
            const c = yield* config()
            if (c.default_agent) {
              const agent = agents[c.default_agent]
              if (!agent) throw new Error(`default agent "${c.default_agent}" not found`)
              if (agent.mode === "subagent") throw new Error(`default agent "${c.default_agent}" is a subagent`)
              if (agent.hidden === true) throw new Error(`default agent "${c.default_agent}" is hidden`)
              return agent.name
            }
            const visible = Object.values(agents).find((a) => a.mode !== "subagent" && a.hidden !== true)
            if (!visible) throw new Error("no primary visible agent found")
            return visible.name
          })

          const enter = Effect.fnUntraced(function* (agent: string, input: HookCtx) {
            if (!defs[agent]?.enter) return
            return yield* Effect.promise(() => Promise.resolve(defs[agent].enter!(input)))
          })

          const leave = Effect.fnUntraced(function* (agent: string, input: HookCtx) {
            if (!defs[agent]?.leave) return
            return yield* Effect.promise(() => Promise.resolve(defs[agent].leave!(input)))
          })

          return {
            get,
            list,
            defaultAgent,
            enter,
            leave,
          } satisfies State
        }),
      )

      return Service.of({
        get: Effect.fn("Agent.get")(function* (agent: string) {
          return yield* InstanceState.useEffect(state, (s) => s.get(agent))
        }),
        list: Effect.fn("Agent.list")(function* () {
          return yield* InstanceState.useEffect(state, (s) => s.list())
        }),
        defaultAgent: Effect.fn("Agent.defaultAgent")(function* () {
          return yield* InstanceState.useEffect(state, (s) => s.defaultAgent())
        }),
        enter: Effect.fn("Agent.enter")(function* (agent: string, input: HookCtx) {
          return yield* InstanceState.useEffect(state, (s) => s.enter(agent, input))
        }),
        leave: Effect.fn("Agent.leave")(function* (agent: string, input: HookCtx) {
          return yield* InstanceState.useEffect(state, (s) => s.leave(agent, input))
        }),
        generate: Effect.fn("Agent.generate")(function* (input: {
          description: string
          model?: { providerID: ProviderID; modelID: ModelID }
        }) {
          const cfg = yield* config()
          const model = input.model ?? (yield* Effect.promise(() => Provider.defaultModel()))
          const resolved = yield* Effect.promise(() => Provider.getModel(model.providerID, model.modelID))
          const language = yield* Effect.promise(() => Provider.getLanguage(resolved))

          const system = [PROMPT_GENERATE]
          yield* Effect.promise(() =>
            Plugin.trigger("experimental.chat.system.transform", { model: resolved }, { system }),
          )
          const existing = yield* InstanceState.useEffect(state, (s) => s.list())

          const params = {
            experimental_telemetry: {
              isEnabled: cfg.experimental?.openTelemetry,
              metadata: {
                userId: cfg.username ?? "unknown",
              },
            },
            temperature: 0.3,
            messages: [
              ...system.map(
                (item): ModelMessage => ({
                  role: "system",
                  content: item,
                }),
              ),
              {
                role: "user",
                content: `Create an agent configuration based on this request: \"${input.description}\".\n\nIMPORTANT: The following identifiers already exist and must NOT be used: ${existing.map((i) => i.name).join(", ")}\n  Return ONLY the JSON object, no other text, do not wrap in backticks`,
              },
            ],
            model: language,
            schema: z.object({
              identifier: z.string(),
              whenToUse: z.string(),
              systemPrompt: z.string(),
            }),
          } satisfies Parameters<typeof generateObject>[0]

          // TODO: clean this up so provider specific logic doesnt bleed over
          const authInfo = yield* auth.get(model.providerID).pipe(Effect.orDie)
          if (model.providerID === "openai" && authInfo?.type === "oauth") {
            return yield* Effect.promise(async () => {
              const result = streamObject({
                ...params,
                providerOptions: ProviderTransform.providerOptions(resolved, {
                  store: false,
                }),
                onError: () => {},
              })
              for await (const part of result.fullStream) {
                if (part.type === "error") throw part.error
              }
              return result.object
            })
          }

          return yield* Effect.promise(() => generateObject(params).then((r) => r.object))
        }),
      })
    }),
  )

  export const defaultLayer = layer.pipe(Layer.provide(Auth.layer))

  const runPromise = makeRunPromise(Service, defaultLayer)

  export async function get(agent: string) {
    return runPromise((svc) => svc.get(agent))
  }

  export async function list() {
    return runPromise((svc) => svc.list())
  }

  export async function defaultAgent() {
    return runPromise((svc) => svc.defaultAgent())
  }

  export async function enter(agent: string, input: HookCtx) {
    return runPromise((svc) => svc.enter(agent, input))
  }

  export async function leave(agent: string, input: HookCtx) {
    return runPromise((svc) => svc.leave(agent, input))
  }

  export async function generate(input: { description: string; model?: { providerID: ProviderID; modelID: ModelID } }) {
    return runPromise((svc) => svc.generate(input))
  }
}
