import { platform, release } from "os"
import path from "path"
import { pathToFileURL } from "url"
import { lazy } from "@/util/lazy"
import { Process } from "@/util/process"
import { which } from "@/util/which"

export namespace Sound {
  export type Intent = "agent-finished" | "needs-input" | "error" | "tool-start" | "tool-finish" | "tool-error"

  const files: Record<Intent, string> = {
    "agent-finished": path.join(import.meta.dir, "../sound/agent-finished.mp3"),
    "needs-input": path.join(import.meta.dir, "../sound/needs-input.mp3"),
    error: path.join(import.meta.dir, "../sound/error.mp3"),
    "tool-start": path.join(import.meta.dir, "../sound/tool-start.mp3"),
    "tool-finish": path.join(import.meta.dir, "../sound/tool-finish.mp3"),
    "tool-error": path.join(import.meta.dir, "../sound/tool-error.mp3"),
  }

  function bell() {
    if (!process.stdout.isTTY) return
    process.stdout.write("\x07")
  }

  const player = lazy(() => {
    const os = platform()

    if (os === "darwin" && which("afplay")) {
      return async (file: string) => {
        const proc = Process.spawn(["afplay", file], { stdout: "ignore", stderr: "ignore" })
        await proc.exited.catch(() => {})
      }
    }

    if (os === "win32") {
      return async (file: string) => {
        const uri = pathToFileURL(file).href.replace(/'/g, "''")
        const script = [
          "Add-Type -AssemblyName presentationCore",
          "$p = New-Object System.Windows.Media.MediaPlayer",
          `$p.Open([Uri]'${uri}')`,
          "$p.Play()",
          "Start-Sleep -Milliseconds 1500",
          "$p.Close()",
        ].join("; ")
        const proc = Process.spawn(["powershell.exe", "-NonInteractive", "-NoProfile", "-Command", script], {
          stdout: "ignore",
          stderr: "ignore",
        })
        await proc.exited.catch(() => {})
      }
    }

    if (os === "linux" || release().includes("WSL")) {
      if (which("paplay")) {
        return async (file: string) => {
          const proc = Process.spawn(["paplay", file], { stdout: "ignore", stderr: "ignore" })
          await proc.exited.catch(() => {})
        }
      }
      if (which("mpg123")) {
        return async (file: string) => {
          const proc = Process.spawn(["mpg123", "-q", file], { stdout: "ignore", stderr: "ignore" })
          await proc.exited.catch(() => {})
        }
      }
      if (which("aplay")) {
        return async (file: string) => {
          const proc = Process.spawn(["aplay", "-q", file], { stdout: "ignore", stderr: "ignore" })
          await proc.exited.catch(() => {})
        }
      }
      if (which("ffplay")) {
        return async (file: string) => {
          const proc = Process.spawn(["ffplay", "-nodisp", "-autoexit", "-loglevel", "quiet", file], {
            stdout: "ignore",
            stderr: "ignore",
          })
          await proc.exited.catch(() => {})
        }
      }
    }

    return async () => {
      bell()
    }
  })

  export async function play(intent: Intent) {
    const file = files[intent]
    await player()(file)
  }
}
