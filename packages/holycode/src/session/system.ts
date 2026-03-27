import { Ripgrep } from "../file/ripgrep"

import { Instance } from "../project/instance"

import PROMPT_DEFAULT from "./prompt/default.txt"
import type { Provider } from "@/provider/provider"
import type { Agent } from "@/agent/agent"
import { Permission } from "@/permission"
import { Skill } from "@/skill"
import { Tune } from "@/util/tune"
import { Config } from "@/config/config"

export namespace SystemPrompt {
  export function provider(_model: Provider.Model) {
    return [PROMPT_DEFAULT]
  }

  export function prompt(model: Provider.Model, agent: Agent.Info, override?: string) {
    if (override) return [override]
    if (agent.name === "build" && agent.options?.tune) return [Tune.prompt(Tune.from(agent.options.tune))]
    if (agent.prompt) return [agent.prompt]
    return provider(model)
  }

  export async function environment(model: Provider.Model) {
    const project = Instance.project
    return [
      [
        `You are powered by the model named ${model.api.id}. The exact model ID is ${model.providerID}/${model.api.id}`,
        `If the user explicitly asks you to switch agents or to enter/exit plan mode, you must call the appropriate switch tool such as agent_switch, plan_enter, or plan_exit. Do not claim that you already switched unless that tool call succeeded.`,
        `Here is some useful information about the environment you are running in:`,
        `<env>`,
        `  Working directory: ${Instance.directory}`,
        `  Workspace root folder: ${Instance.worktree}`,
        `  Is directory a git repo: ${project.vcs === "git" ? "yes" : "no"}`,
        `  Platform: ${process.platform}`,
        `  Today's date: ${new Date().toDateString()}`,
        `</env>`,
        `<directories>`,
        `  ${
          project.vcs === "git" && false
            ? await Ripgrep.tree({
                cwd: Instance.directory,
                limit: 50,
              })
            : ""
        }`,
        `</directories>`,
      ].join("\n"),
    ]
  }

  export async function picture() {
    const text = (await Config.get()).big_picture?.trim()
    if (!text) return
    return [
      "Here is the project's big picture. Use it to keep decisions aligned with the long-term goal while still following the user's direct request.",
      "<big-picture>",
      text,
      "</big-picture>",
    ].join("\n")
  }

  export async function skills(agent: Agent.Info) {
    if (Permission.disabled(["skill"], agent.permission).has("skill")) return

    const list = await Skill.available(agent)

    return [
      "Skills provide specialized instructions and workflows for specific tasks.",
      "Use the skill tool to load a skill when a task matches its description.",
      // the agents seem to ingest the information about skills a bit better if we present a more verbose
      // version of them here and a less verbose version in tool description, rather than vice versa.
      Skill.fmt(list, { verbose: true }),
    ].join("\n")
  }
}
