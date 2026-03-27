import z from "zod"
import { Tool } from "./tool"
import { Agent } from "../agent/agent"
import { Question } from "../question"
import { Session } from "../session"
import { MessageV2 } from "../session/message-v2"
import { Provider } from "../provider/provider"
import { type SessionID, MessageID, PartID } from "../session/schema"
import DESCRIPTION from "./agent-switch.txt"

async function model(sessionID: SessionID) {
  for await (const item of MessageV2.stream(sessionID)) {
    if (item.info.role === "user" && item.info.model) return item.info.model
  }
  return Provider.defaultModel()
}

async function targets(current?: string) {
  return Agent.list().then((list) =>
    list.filter(
      (item) => item.switch === true && item.mode !== "subagent" && item.hidden !== true && item.name !== current,
    ),
  )
}

export async function jump(ctx: Tool.Context, next: string, text: string) {
  const msg: MessageV2.User = {
    id: MessageID.ascending(),
    sessionID: ctx.sessionID,
    role: "user",
    time: {
      created: Date.now(),
    },
    agent: next,
    model: await model(ctx.sessionID),
  }
  await Session.updateMessage(msg)
  await Session.updatePart({
    id: PartID.ascending(),
    messageID: msg.id,
    sessionID: ctx.sessionID,
    type: "text",
    text,
    synthetic: true,
  } satisfies MessageV2.TextPart)
}

export const AgentSwitchTool = Tool.define("agent_switch", {
  description: DESCRIPTION,
  parameters: z.object({
    agent: z.string().describe("Primary agent to switch to"),
  }),
  async execute(params, ctx) {
    const list = await targets(ctx.agent)
    const next = list.find((item) => item.name === params.agent)
    if (!next) {
      const hint = list.length ? ` Available switch targets: ${list.map((item) => item.name).join(", ")}` : ""
      throw new Error(`Agent \"${params.agent}\" is not a switchable primary agent.${hint}`)
    }

    const answers = await Question.ask({
      sessionID: ctx.sessionID,
      questions: [
        {
          question: `Would you like to switch to the ${next.name} agent?`,
          header: "Switch Agent",
          custom: false,
          options: [
            { label: "Yes", description: `Switch to ${next.name}` },
            { label: "No", description: `Stay with ${ctx.agent}` },
          ],
        },
      ],
      tool: ctx.callID ? { messageID: ctx.messageID, callID: ctx.callID } : undefined,
    })

    if (answers[0]?.[0] === "No") throw new Question.RejectedError()

    await jump(ctx, next.name, `User has requested to switch to the ${next.name} agent. Continue with that agent.`)

    return {
      title: `Switching to ${next.name}`,
      output: `User confirmed switching to ${next.name}. Wait for further instructions.`,
      metadata: {
        agent: next.name,
      },
    }
  },
})
