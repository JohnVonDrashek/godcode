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
}

const init: Pref = {
  agent_finished: true,
  needs_input: false,
  error: false,
  tool_start: false,
  tool_finish: false,
  tool_error: false,
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
    const seen = new Set<string>()
    const tool = new Map<string, string>()
    const last = new Map<string, number>()

    function current() {
      if (route.data.type !== "session") return
      return route.data.sessionID
    }

    function save(next: Pref) {
      setStore(next)
      kv.set("sound", next)
    }

    function set(key: keyof Pref, value: boolean) {
      save({ ...store, [key]: value })
    }

    function toggle(key: keyof Pref) {
      set(key, !store[key])
    }

    function ping(name: keyof Pref, intent: Player.Intent, key: string = intent) {
      if (!store[name]) return
      const now = Date.now()
      if (now - (last.get(key) ?? 0) < 250) return
      last.set(key, now)
      void Player.play(intent)
    }

    function preview(intent: Player.Intent) {
      void Player.play(intent)
    }

    sdk.event.listen((e) => {
      const evt = e.details
      if (evt.type === "message.updated") {
        const info = evt.properties.info
        if (info.role !== "assistant") return
        if (!info.time.completed) return
        if (current() !== info.sessionID) return
        if (seen.has(info.id)) return
        seen.add(info.id)
        ping("agent_finished", "agent-finished", info.id)
        return
      }
      if (evt.type === "permission.asked") {
        if (current() !== evt.properties.sessionID) return
        ping("needs_input", "needs-input", evt.properties.id)
        return
      }
      if (evt.type === "question.asked") {
        if (current() !== evt.properties.sessionID) return
        ping("needs_input", "needs-input", evt.properties.id)
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
      preview,
    }
  },
})
