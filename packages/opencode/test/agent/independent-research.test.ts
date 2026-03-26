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

test("independent-research only allows webfetch", async () => {
  await using tmp = await tmpdir()
  await Instance.provide({
    directory: tmp.path,
    fn: async () => {
      const agent = await Agent.get("independent-research")
      expect(agent).toBeDefined()
      expect(evalPerm(agent, "webfetch")).toBe("allow")
      expect(evalPerm(agent, "read")).toBe("deny")
      expect(evalPerm(agent, "grep")).toBe("deny")
      expect(evalPerm(agent, "bash")).toBe("deny")
      expect(evalPerm(agent, "task")).toBe("deny")
    },
  })
})
