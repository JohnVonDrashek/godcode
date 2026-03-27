import fs from "fs"
import path from "path"

export namespace DotHolycode {
  export function root() {
    const env = process.env.HOLYCODE_DOT_HOLYCODE_PATH
    if (env && fs.existsSync(env)) return env

    const dir = path.join(path.dirname(process.execPath), "dot-holycode")
    if (fs.existsSync(dir)) return dir

    return import.meta.dir
  }

  export function file(...parts: string[]) {
    return path.join(root(), ...parts)
  }
}
