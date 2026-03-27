import z from "zod"
import { Tool } from "./tool"
import { runTask } from "./task"
import DESCRIPTION from "./independent-research.txt"

const parameters = z.object({
  description: z.string().describe("A short (3-5 words) description of the research task"),
  prompt: z.string().describe("The external research task for the subagent to perform"),
  command: z.string().describe("The command that triggered this task").optional(),
})

export const IndependentResearchTool = Tool.define("independent-research", {
  description: DESCRIPTION,
  parameters,
  async execute(params, ctx) {
    return runTask(
      {
        ...params,
        subagent_type: "independent-research",
      },
      ctx,
      {
        isolated: true,
        resume: false,
        parts: [
          {
            type: "text",
            text: params.prompt,
          },
        ],
      },
    )
  },
})
