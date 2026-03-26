import { afterEach, expect, test } from "bun:test"
import { Agent } from "../../src/agent/agent"
import { Permission } from "../../src/permission"
import { Instance } from "../../src/project/instance"
import { tmpdir } from "../fixture/fixture"

function evalPerm(agent: Agent.Info | undefined, permission: string): Permission.Action | undefined {
  if (!agent) return undefined
  return Permission.evaluate(permission, "*", agent.permission).action
}

afterEach(async () => {
  await Instance.disposeAll()
})

test("all built-in agents allow core web tools", async () => {
  await using tmp = await tmpdir()
  await Instance.provide({
    directory: tmp.path,
    fn: async () => {
      for (const name of [
        "build",
        "plan",
        "shadow",
        "shadow-main",
        "general",
        "explore",
        "independent-research",
        "compaction",
        "title",
        "summary",
      ]) {
        const agent = await Agent.get(name)
        expect(agent).toBeDefined()
        expect(evalPerm(agent, "google")).toBe("allow")
        expect(evalPerm(agent, "websearch")).toBe("allow")
        expect(evalPerm(agent, "webfetch")).toBe("allow")
      }
    },
  })
})
