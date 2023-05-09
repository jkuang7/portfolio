import { createTRPCRouter, publicProcedure } from "~/server/api/trpc"
import { z } from "zod"
import fetch from "node-fetch"
import type { Prisma } from "@prisma/client"

// Get OpenWeatherMap API key from environment variables
const OPEN_WEATHER_MAP_KEY = process.env.OPEN_WEATHER_MAP_KEY as string

// Define the JSON schema for the input to this procedure
const userWeatherInputSchema = z.object({
  latLon: z.string(),
  location: z.string(),
})

// Create the TRPC router
export const userWeatherRouter = createTRPCRouter({
  // Add a procedure to the router
  addUserWeather: publicProcedure
    // Associate the input schema with this procedure
    .input(userWeatherInputSchema)
    // Define the procedure's implementation
    .mutation(async ({ ctx, input }) => {
      // Extract latitude and longitude from input
      const [lat, lon] = input.latLon.split(",") as [string, string]

      // Fetch weather data from OpenWeatherMap API
      const response = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${OPEN_WEATHER_MAP_KEY}`
      )

      const jsonResponse = await response.json()

      // Store the weather data in the Weather model
      const weather = await ctx.prisma.weather.create({
        data: {
          latLon: input.latLon,
          json: jsonResponse as Prisma.JsonObject,
        },
      })

      // Associate the weather entry with the current user
      await ctx.prisma.userWeather.create({
        data: {
          userId: ctx.userId as string,
          latLon: weather.latLon,
          location: input.location,
        },
      })

      return { weather }
    }),
})
