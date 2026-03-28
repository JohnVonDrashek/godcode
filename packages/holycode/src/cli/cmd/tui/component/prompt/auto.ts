export type State = {
  text: string
  sessionID?: string
  armed: boolean
  last?: string
}

export function read(value: unknown) {
  if (!value || typeof value !== "object") return
  const item = value as Record<string, unknown>
  if (typeof item.text !== "string") return
  const text = item.text.trim()
  if (!text) return
  return {
    text,
    armed: item.armed === true,
    ...(typeof item.sessionID === "string" ? { sessionID: item.sessionID } : {}),
    ...(typeof item.last === "string" ? { last: item.last } : {}),
  } satisfies State
}

export function owns(item: State | undefined, sessionID?: string) {
  if (!item) return false
  if (!item.sessionID) return true
  return item.sessionID === sessionID
}

export function arm(item: State, sessionID?: string) {
  return {
    ...item,
    armed: true,
    sessionID: item.sessionID ?? sessionID,
  } satisfies State
}

export function ready(
  item: State | undefined,
  input: {
    sessionID?: string
    status: "idle" | "busy" | "retry"
    messageID?: string
    error?: boolean
    completed?: boolean
  },
) {
  if (!item?.armed) return false
  if (!owns(item, input.sessionID)) return false
  if (input.status !== "idle") return false
  if (!input.messageID) return false
  if (!input.completed) return false
  if (input.error) return false
  if (item.last === input.messageID) return false
  return true
}

export function short(text: string, size = 36) {
  if (text.length <= size) return text
  return text.slice(0, size - 3) + "..."
}
