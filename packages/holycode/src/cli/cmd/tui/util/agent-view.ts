type View = {
  providerID: string
  modelID: string
  agent: string
  sessionID: string
  request: unknown
}

function rec(input: unknown): Record<string, unknown> | undefined {
  if (!input || typeof input !== "object" || Array.isArray(input)) return
  return input as Record<string, unknown>
}

function text(input: unknown) {
  return typeof input === "string" ? input : undefined
}

function list(input: unknown) {
  return Array.isArray(input) ? input : []
}

function code(input: string, lang = "text") {
  const mark = input.includes("```") ? "````" : "```"
  return `${mark}${lang}\n${input || "(empty)"}\n${mark}`
}

function json(input: unknown) {
  return code(JSON.stringify(input, null, 2) ?? "null", "json")
}

function render(input: unknown): string {
  const str = text(input)
  if (str !== undefined) return code(str)

  if (Array.isArray(input)) {
    if (input.length === 0) return code("[]", "json")
    return input.map((item, index) => `Item ${index + 1}\n\n${render(item)}`).join("\n\n")
  }

  const obj = rec(input)
  if (!obj) return json(input)
  if (obj.type === "text" && typeof obj.text === "string") return code(obj.text)
  return json(input)
}

function section(title: string, body: string) {
  return `## ${title}\n\n${body}`
}

function renderMessages(input: unknown) {
  const msgs = list(input)
  if (msgs.length === 0) return "No messages."

  return msgs
    .map((msg, index) => {
      const obj = rec(msg)
      if (!obj) return `### Message ${index + 1}\n\n${json(msg)}`
      const role = text(obj.role) ?? `message ${index + 1}`
      const parts = [`### Message ${index + 1}: ${role}`]
      if ("content" in obj) parts.push(render(obj.content))
      const meta = Object.fromEntries(Object.entries(obj).filter(([key]) => key !== "content"))
      if (Object.keys(meta).length > 1 || !("role" in meta)) parts.push(json(meta))
      return parts.join("\n\n")
    })
    .join("\n\n")
}

export function formatAgentView(input: View, filepath: string) {
  const req = rec(input.request) ?? {}
  const parts = [
    "# Agent View",
    [
      `- provider: ${input.providerID}`,
      `- model: ${input.modelID}`,
      `- agent: ${input.agent}`,
      `- session: ${input.sessionID}`,
      `- raw snapshot: ${filepath}`,
    ].join("\n"),
    section("System", render(req.system)),
    section("Messages", renderMessages(req.messages)),
    section("Prompt", render(req.prompt)),
    section("Headers", json(req.headers)),
    section("Provider Options", json(req.providerOptions)),
    section("Active Tools", render(req.activeTools)),
    section("Tool Choice", json(req.toolChoice)),
    section(
      "Sampling",
      json({
        maxOutputTokens: req.maxOutputTokens,
        temperature: req.temperature,
        topP: req.topP,
        topK: req.topK,
        isOpenaiOauth: req.isOpenaiOauth,
      }),
    ),
    section("Tools", json(req.tools)),
  ]

  return parts.join("\n\n") + "\n"
}
