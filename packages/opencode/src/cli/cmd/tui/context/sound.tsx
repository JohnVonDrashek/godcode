import { createSimpleContext } from "./helper"
import { useKV } from "./kv"
import { useSDK } from "./sdk"
import { useRoute } from "./route"
import { useSync } from "./sync"
import { Sound as Player } from "@tui/util/sound"
import { createStore } from "solid-js/store"
import { Session } from "@/session"

type Pref = {
  agent_finished: boolean
  needs_input: boolean
  error: boolean
  tool_start: boolean
  tool_finish: boolean
  tool_error: boolean
  volume: number
}

const init: Pref = {
  agent_finished: false,
  needs_input: false,
  error: false,
  tool_start: false,
  tool_finish: false,
  tool_error: false,
  volume: 10,
}

function clamp(volume: number) {
  return Math.min(100, Math.max(0, Math.round(volume)))
}

function norm(input: unknown): Pref {
  if (!input || typeof input !== "object") return { ...init }
  const item = input as Record<string, unknown>
  return {
    agent_finished: typeof item.agent_finished === "boolean" ? item.agent_finished : init.agent_finished,
    needs_input: typeof item.needs_input === "boolean" ? item.needs_input : init.needs_input,
    error: typeof item.error === "boolean" ? item.error : init.error,
    tool_start: typeof item.tool_start === "boolean" ? item.tool_start : init.tool_start,
    tool_finish: typeof item.tool_finish === "boolean" ? item.tool_finish : init.tool_finish,
    tool_error: typeof item.tool_error === "boolean" ? item.tool_error : init.tool_error,
    volume: typeof item.volume === "number" ? clamp(item.volume) : init.volume,
  }
}

export const { use: useSound, provider: SoundProvider } = createSimpleContext({
  name: "Sound",
  init: () => {
    const kv = useKV()
    const sdk = useSDK()
    const route = useRoute()
    const sync = useSync()
    const [store, setStore] = createStore(norm(kv.get("sound", init)))
    const tool = new Map<string, string>()
    const last = new Map<string, number>()
    const status = new Map<string, string>()
    const pending = new Map<string, Set<string>>()

    function current() {
      if (route.data.type !== "session") return
      return route.data.sessionID
    }

    function save(next: Pref) {
      setStore(next)
      kv.set("sound", next)
    }

    function set(key: keyof Pref, value: boolean | number) {
      save({ ...store, [key]: value })
    }

    function toggle(key: keyof Pref) {
      if (key === "volume") return
      set(key, !store[key])
    }

    function volume(next: number) {
      set("volume", clamp(next))
    }

    function ping(name: keyof Pref, intent: Player.Intent, key: string = intent) {
      if (!store[name]) return
      const now = Date.now()
      if (now - (last.get(key) ?? 0) < 250) return
      last.set(key, now)
      void Player.play(intent, store.volume)
    }

    function preview(intent: Player.Intent) {
      void Player.play(intent, store.volume)
    }

    function wait(sessionID: string, id: string) {
      const set = pending.get(sessionID) ?? new Set<string>()
      set.add(id)
      pending.set(sessionID, set)
    }

    function resolve(sessionID: string, id: string) {
      const set = pending.get(sessionID)
      if (!set) return
      set.delete(id)
      if (set.size) return
      pending.delete(sessionID)
    }

    sdk.event.listen((e) => {
      const evt = e.details
      if (evt.type === "session.status") {
        if (current() !== evt.properties.sessionID) return
        const prev = status.get(evt.properties.sessionID)
        const next = evt.properties.status.type
        status.set(evt.properties.sessionID, next)
        if (next !== "idle" || prev === "idle") return
        if (pending.get(evt.properties.sessionID)?.size) return
        if ((sync.data.permission[evt.properties.sessionID]?.length ?? 0) > 0) return
        if ((sync.data.question[evt.properties.sessionID]?.length ?? 0) > 0) return
        const list = sync.data.message[evt.properties.sessionID] ?? []
        const info = list[list.length - 1]
        if (!info || info.role !== "assistant") return
        if (info.error || !info.time.completed) return
        ping("agent_finished", "agent-finished", `${evt.properties.sessionID}:idle`)
        return
      }
      if (evt.type === "permission.asked") {
        if (current() !== evt.properties.sessionID) return
        wait(evt.properties.sessionID, evt.properties.id)
        ping("needs_input", "needs-input", evt.properties.id)
        return
      }
      if (evt.type === "permission.replied") {
        resolve(evt.properties.sessionID, evt.properties.requestID)
        return
      }
      if (evt.type === "question.asked") {
        if (current() !== evt.properties.sessionID) return
        wait(evt.properties.sessionID, evt.properties.id)
        ping("needs_input", "needs-input", evt.properties.id)
        return
      }
      if (evt.type === "question.replied" || evt.type === "question.rejected") {
        resolve(evt.properties.sessionID, evt.properties.requestID)
        return
      }
      if (evt.type === Session.Event.Error.type) {
        const err = evt.properties.error
        if (err && typeof err === "object" && err.name === "MessageAbortedError") return
        ping("error", "error")
        return
      }
      if (evt.type !== "message.part.updated") return
      const part = evt.properties.part
      if (part.type !== "tool") return
      const id = current()
      if (!id) return
      if (!sync.data.message[id]?.some((item) => item.id === part.messageID)) return
      const prev = tool.get(part.id)
      const next = part.state.status
      if (prev === next) return
      tool.set(part.id, next)
      if (next === "running") {
        ping("tool_start", "tool-start", `${part.id}:running`)
        return
      }
      if (next === "completed") {
        ping("tool_finish", "tool-finish", `${part.id}:completed`)
        return
      }
      if (next === "error") {
        ping("tool_error", "tool-error", `${part.id}:error`)
      }
    })

    return {
      get state() {
        return store
      },
      set,
      toggle,
      volume,
      preview,
    }
  },
})
