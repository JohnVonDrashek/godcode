import { Hono } from "hono"
import { describeRoute, validator, resolver } from "hono-openapi"
import z from "zod"
import { Config } from "../../config/config"
import { Provider } from "../../provider/provider"
import { mapValues } from "remeda"
import { errors } from "../error"
import { Log } from "../../util/log"
import { lazy } from "../../util/lazy"

const log = Log.create({ service: "server" })

const TuneUpdate = z.object({
  agent: z.string(),
  tune: z.object({
    order: z.array(z.string()),
    values: z.record(z.string(), z.string()),
  }),
})

const BigPictureUpdate = z.object({
  big_picture: z.string().optional(),
})

export const ConfigRoutes = lazy(() =>
  new Hono()
    .get(
      "/",
      describeRoute({
        summary: "Get configuration",
        description: "Retrieve the current OpenCode configuration settings and preferences.",
        operationId: "config.get",
        responses: {
          200: {
            description: "Get config info",
            content: {
              "application/json": {
                schema: resolver(Config.Info),
              },
            },
          },
        },
      }),
      async (c) => {
        return c.json(await Config.get())
      },
    )
    .patch(
      "/",
      describeRoute({
        summary: "Update configuration",
        description: "Update OpenCode configuration settings and preferences.",
        operationId: "config.update",
        responses: {
          200: {
            description: "Successfully updated config",
            content: {
              "application/json": {
                schema: resolver(Config.Info),
              },
            },
          },
          ...errors(400),
        },
      }),
      validator("json", Config.Info),
      async (c) => {
        const config = c.req.valid("json")
        await Config.update(config)
        return c.json(config)
      },
    )
    .patch(
      "/tune",
      describeRoute({
        summary: "Update project tune",
        description: "Update project-local tune settings in the hidden project tune file.",
        operationId: "config.tune.update",
        responses: {
          200: {
            description: "Successfully updated project tune",
            content: {
              "application/json": {
                schema: resolver(z.boolean()),
              },
            },
          },
          ...errors(400),
        },
      }),
      validator("json", TuneUpdate),
      async (c) => {
        const input = c.req.valid("json")
        await Config.updateProjectTune(input)
        return c.json(true)
      },
    )
    .patch(
      "/big-picture",
      describeRoute({
        summary: "Update project big picture",
        description: "Update the project vision stored in the root holycode config file for the current project.",
        operationId: "config.bigPicture.update",
        responses: {
          200: {
            description: "Successfully updated project big picture",
            content: {
              "application/json": {
                schema: resolver(z.boolean()),
              },
            },
          },
          ...errors(400),
        },
      }),
      validator("json", BigPictureUpdate),
      async (c) => {
        const input = c.req.valid("json")
        await Config.updateProject(input)
        return c.json(true)
      },
    )
    .get(
      "/providers",
      describeRoute({
        summary: "List config providers",
        description: "Get a list of all configured AI providers and their default models.",
        operationId: "config.providers",
        responses: {
          200: {
            description: "List of providers",
            content: {
              "application/json": {
                schema: resolver(
                  z.object({
                    providers: Provider.Info.array(),
                    default: z.record(z.string(), z.string()),
                  }),
                ),
              },
            },
          },
        },
      }),
      async (c) => {
        using _ = log.time("providers")
        const providers = await Provider.list().then((x) => mapValues(x, (item) => item))
        return c.json({
          providers: Object.values(providers),
          default: mapValues(providers, (item) => Provider.sort(Object.values(item.models))[0].id),
        })
      },
    ),
)
