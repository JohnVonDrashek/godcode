import fs from "fs"
import path from "path"

export namespace DotOpencode {
  export function root() {
    const env = process.env.OPENCODE_DOT_OPENCODE_PATH
    if (env && fs.existsSync(env)) return env

    const dir = path.join(path.dirname(process.execPath), "dot-opencode")
    if (fs.existsSync(dir)) return dir

    return import.meta.dir
  }

  export function file(...parts: string[]) {
    return path.join(root(), ...parts)
  }
}
