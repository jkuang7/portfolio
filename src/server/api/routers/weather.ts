import { z } from "zod"

import { createTRPCRouter, publicProcedure } from "~/server/api/trpc"

import type { Weather } from "@prisma/client"

import axios from "axios"

interface weatherInput {
  coord: {
    lon: number
    lat: number
  }
  weather: {
    id: number
    main: string
    description: string
    icon: string
  }[]
  base: string
  main: {
    temp: number
    feels_like: number
    temp_min: number
    temp_max: number
    pressure: number
    humidity: number
  }
  visibility: number
  wind: { speed: number; deg: number }
  cloud: { all: number }
  dt: number
  sys: {
    type: number
    id: number
    country: string
    sunrise: number
    sunset: number
  }
  timezone: number
  id: number
  name: string
  cod: number
}

const weatherIconMap: { [key: string]: string } = {
  "01d": "https://openweathermap.org/img/wn/01d@2x.png",
  "01n": "https://openweathermap.org/img/wn/01n@2x.png",
  "02d": "https://openweathermap.org/img/wn/02d@2x.png",
  "02n": "https://openweathermap.org/img/wn/02n@2x.png",
  "03d": "https://openweathermap.org/img/wn/03d@2x.png",
  "03n": "https://openweathermap.org/img/wn/03n@2x.png",
  "04d": "https://openweathermap.org/img/wn/04d@2x.png",
  "04n": "https://openweathermap.org/img/wn/04n@2x.png",
  "09d": "https://openweathermap.org/img/wn/09d@2x.png",
  "09n": "https://openweathermap.org/img/wn/09n@2x.png",
  "10d": "https://openweathermap.org/img/wn/10d@2x.png",
  "10n": "https://openweathermap.org/img/wn/10n@2x.png",
  "11d": "https://openweathermap.org/img/wn/11d@2x.png",
  "11n": "https://openweathermap.org/img/wn/11n@2x.png",
  "13d": "https://openweathermap.org/img/wn/13d@2x.png",
  "13n": "https://openweathermap.org/img/wn/13n@2x.png",
  "50d": "https://openweathermap.org/img/wn/50d@2x.png",
  "50n": "https://openweathermap.org/img/wn/50n@2x.png",
}

//helpers
const convertKelvinToFahrenheit = (kelvin: number | undefined) => {
  if (kelvin === undefined) {
    return undefined
  }
  return Math.round(((kelvin - 273.15) * 9) / 5 + 32)
}

const weatherDTO = (weather: Weather) => {
  const data = weather.json?.valueOf() as weatherInput

  const weatherData = {
    name: data?.name,
    location: weather.location,
    description: data?.weather[0]?.description,
    temp: convertKelvinToFahrenheit(data?.main?.temp),
    feels_like: convertKelvinToFahrenheit(data?.main?.feels_like),
    temp_min: convertKelvinToFahrenheit(data?.main?.temp_min),
    temp_max: convertKelvinToFahrenheit(data?.main?.temp_max),
    pressure: data?.main?.pressure,
    humidity: data?.main?.humidity,
    wind: data?.wind?.speed,
    lon: data?.coord?.lon,
    lat: data?.coord?.lat,
    iconImageURL: "",
    updatedAt: weather.updatedAt,
  }

  //update iconImageURL in weatherData to the corresponding image link
  if (data.weather[0]?.icon) {
    const iconId = data.weather[0]?.icon
    const iconImageURL = weatherIconMap[iconId]
    weatherData.iconImageURL = iconImageURL || ""
  }

  return weatherData
}

import { Redis } from "@upstash/redis"
import { Ratelimit } from "@upstash/ratelimit"
import { TRPCError } from "@trpc/server"

const redis = Redis.fromEnv()

//ratelimit 50 requests per 60 minutes
const ratelimit = new Ratelimit({
  redis: redis,
  limiter: Ratelimit.fixedWindow(50, "60m"),
  analytics: true,
})

interface CacheResult<T> {
  weather: T[]
  source: "cache" | "database"
}

//Redis Cache
async function cacheFetch<T>(
  cacheKey: string,
  fetchFn: () => Promise<T[]>,
  cacheExpiry = 60
): Promise<CacheResult<T>> {
  const cacheResult = await redis.get(cacheKey)

  if (cacheResult) {
    return {
      weather: cacheResult as T[],
      source: "cache",
    }
  }

  const data = await fetchFn()

  await redis.set(cacheKey, JSON.stringify(data), { ex: cacheExpiry })

  return {
    weather: data,
    source: "database",
  }
}

interface GeocodeResult {
  results: {
    address_components: {
      long_name: string
      short_name: string
      types: string[]
    }[]
    formatted_address: string
    geometry: {
      location: {
        lat: number
        lng: number
      }
      location_type: string
      viewport: {
        northeast: {
          lat: number
          lng: number
        }
        southwest: {
          lat: number
          lng: number
        }
      }
    }
    place_id: string
    plus_code: {
      compound_code: string
      global_code: string
    }
    types: string[]
  }[]
  status: string
}

//routers
export const weatherRouter = createTRPCRouter({
  getWeatherForMainPage: publicProcedure.query(async ({ ctx }) => {
    const weatherData = await cacheFetch("mainPageWeather", async () => {
      const { success } = await ratelimit.limit(ctx.userId as string)
      if (!success) {
        throw new TRPCError({ code: "TOO_MANY_REQUESTS" })
      }

      const data = await ctx.prisma.weather.findMany({
        take: 100,
        where: {
          showOnMainPage: true,
        },
        orderBy: [{ location: "asc" }],
      })

      return data.map((data) => weatherDTO(data))
    })

    return weatherData
  }),

  getWeatherForUserPage: publicProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ ctx, input }) => {
      const cacheKey = `userPageWeather:${input.userId}`

      const weatherData = await cacheFetch(cacheKey, async () => {
        const { success } = await ratelimit.limit(ctx.userId as string)

        if (!success) {
          throw new TRPCError({ code: "TOO_MANY_REQUESTS" })
        }
        const userWeathers = await ctx.prisma.userWeather.findMany({
          where: {
            userId: input.userId,
          },
          take: 100,
        })

        const weathers = await ctx.prisma.weather.findMany({
          where: {
            latLon: {
              in: userWeathers.map((uw) => uw.latLon),
            },
          },
        })

        return weathers.map((data) => weatherDTO(data))
      })

      return weatherData
    }),

  getWeatherForLocation: publicProcedure
    .input(z.object({ location: z.string(), address: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const GOOGLE_CLOUD_API_KEY = process.env.GOOGLE_CLOUD_API_KEY as string

      const params = {
        address: input.address,
        key: GOOGLE_CLOUD_API_KEY,
      }

      const { data } = (await axios.get<GeocodeResult>(
        "https://maps.googleapis.com/maps/api/geocode/json",
        { params }
      )) as { data: GeocodeResult }

      const lat = data?.results[0]?.geometry?.location?.lat.toString() as string
      const lon = data?.results[0]?.geometry.location.lng.toString() as string
      const latLon = `${lat},${lon}`

      const OPEN_WEATHER_MAP_KEY = process.env.OPEN_WEATHER_MAP_KEY as string

      const response = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${OPEN_WEATHER_MAP_KEY}`
      )

      const jsonResponse = (await response.json()) as weatherInput

      const weather = await ctx.prisma.weather.upsert({
        where: {
          latLon,
        },
        create: {
          latLon,
          json: JSON.stringify(jsonResponse),
          showOnMainPage: false,
          location: input.location,
        },
        update: {
          json: JSON.stringify(jsonResponse),
          showOnMainPage: false,
          location: input.location,
        },
      })

      await ctx.prisma.userWeather.upsert({
        where: {
          userId_latLon: {
            userId: ctx.userId as string,
            latLon: latLon,
          },
        },
        create: {
          userId: ctx.userId as string,
          latLon,
        },
        update: {},
      })

      const weathers = await ctx.prisma.weather.findMany({
        where: {
          latLon: {
            in: [latLon],
          },
        },
      })

      return weathers.map((data) => weatherDTO(data))
    }),
})
