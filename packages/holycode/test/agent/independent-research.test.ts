import { afterEach, expect, test } from "bun:test"
import { Agent } from "../../src/agent/agent"
import { Permission } from "../../src/permission"
import { Instance } from "../../src/project/instance"
import { ProviderID, ModelID } from "../../src/provider/schema"
import { ToolRegistry } from "../../src/tool/registry"
import { tmpdir } from "../fixture/fixture"

function evalPerm(agent: Agent.Info | undefined, permission: string): Permission.Action | undefined {
  if (!agent) return undefined
  return Permission.evaluate(permission, "*", agent.permission).action
}

afterEach(async () => {
  await Instance.disposeAll()
})

test("independent-research only allows google, websearch, and webfetch", async () => {
  await using tmp = await tmpdir()
  await Instance.provide({
    directory: tmp.path,
    fn: async () => {
      const agent = await Agent.get("independent-research")
      expect(agent).toBeDefined()
      expect(evalPerm(agent, "google")).toBe("allow")
      expect(evalPerm(agent, "websearch")).toBe("allow")
      expect(evalPerm(agent, "webfetch")).toBe("allow")
      expect(evalPerm(agent, "read")).toBe("deny")
      expect(evalPerm(agent, "grep")).toBe("deny")
      expect(evalPerm(agent, "bash")).toBe("deny")
      expect(evalPerm(agent, "task")).toBe("deny")
    },
  })
})

test("independent-research exposes websearch in tool registry", async () => {
  await using tmp = await tmpdir()
  await Instance.provide({
    directory: tmp.path,
    fn: async () => {
      const agent = await Agent.get("independent-research")
      expect(agent).toBeDefined()
      const tools = await ToolRegistry.tools(
        { providerID: ProviderID.make("openai"), modelID: ModelID.make("gpt-5.4") },
        agent,
      )
      expect(tools.map((item) => item.id)).toContain("websearch")
    },
  })
})
