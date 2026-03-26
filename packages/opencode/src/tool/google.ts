import z from "zod"
import { Tool } from "./tool"
import { Process } from "../util/process"
import DESCRIPTION from "./google.txt"

const Result = z.object({
  title: z.string(),
  url: z.string(),
  abstract: z.string().optional(),
})

export const GoogleTool = Tool.define("google", {
  description: DESCRIPTION,
  parameters: z.object({
    query: z.string().describe("Search query to run with google"),
    numResults: z.number().int().min(1).max(20).optional().describe("Number of results to return (default: 8)"),
  }),
  async execute(params, ctx) {
    await ctx.ask({
      permission: "google",
      patterns: [params.query],
      always: ["*"],
      metadata: {
        query: params.query,
        numResults: params.numResults,
      },
    })

    let text = ""

    try {
      text = await Process.text(["ddgr", "--json", "--np", "-n", String(params.numResults ?? 8), params.query], {
        abort: ctx.abort,
      }).then((x) => x.text.trim())
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      if (msg.includes("spawn ddgr") || msg.includes("ddgr ENOENT")) {
        throw new Error("ddgr is not installed. Install it first to use this tool.")
      }
      throw err
    }

    if (!text) {
      return {
        title: `google: ${params.query}`,
        metadata: { matches: 0 },
        output: "No search results found.",
      }
    }

    const items = z.array(Result).parse(JSON.parse(text))
    if (items.length === 0) {
      return {
        title: `google: ${params.query}`,
        metadata: { matches: 0 },
        output: "No search results found.",
      }
    }

    return {
      title: `google: ${params.query}`,
      metadata: { matches: items.length },
      output: items
        .map((item, i) =>
          [`${i + 1}. ${item.title}`, item.url, item.abstract?.trim() || "No snippet available."].join("\n"),
        )
        .join("\n\n"),
    }
  },
})
