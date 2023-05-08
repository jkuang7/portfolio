import { z } from "zod"

import { createTRPCRouter, publicProcedure } from "~/server/api/trpc"

import type { Weather, Prisma } from "@prisma/client"

import axios from "axios"

import { Redis } from "@upstash/redis"
import { Ratelimit } from "@upstash/ratelimit"
import { TRPCError } from "@trpc/server"

interface WeatherInput {
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

interface CacheResult<T> {
  weather: T[]
  source: "cache" | "database"
}

const WEATHER_ICON_MAP: { [key: string]: string } = {
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

const REDIS = Redis.fromEnv()

//ratelimit 50 requests per 60 minutes
const RATELIMIT = new Ratelimit({
  redis: REDIS,
  limiter: Ratelimit.fixedWindow(50, "60m"),
  analytics: true,
})

//Redis Cache
async function cacheFetch<T>(
  cacheKey: string,
  fetchFn: () => Promise<T[]>,
  cacheExpiry = 60
): Promise<CacheResult<T>> {
  const cacheResult = await REDIS.get(cacheKey)

  if (cacheResult) {
    return {
      weather: cacheResult as T[],
      source: "cache",
    }
  }

  const data = await fetchFn()

  await REDIS.set(cacheKey, JSON.stringify(data), { ex: cacheExpiry })

  return {
    weather: data,
    source: "database",
  }
}

const weatherDTO = (weather: Weather) => {
  const data = weather.json?.valueOf() as WeatherInput

  const convertKelvinToFahrenheit = (kelvin: number | undefined) => {
    if (kelvin === undefined) {
      return undefined
    }
    return Math.round(((kelvin - 273.15) * 9) / 5 + 32)
  }

  //clean up data
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

  //update iconImageURL
  if (data.weather[0]?.icon) {
    const iconId = data.weather[0]?.icon
    const iconImageURL = WEATHER_ICON_MAP[iconId]
    weatherData.iconImageURL = iconImageURL || ""
  }

  return weatherData
}

//routers
export const weatherRouter = createTRPCRouter({
  getWeatherForMainPage: publicProcedure.query(async ({ ctx }) => {
    const weatherData = await cacheFetch("mainPageWeather", async () => {
      const { success } = await RATELIMIT.limit(ctx.userId as string)
      if (!success) {
        throw new TRPCError({ code: "TOO_MANY_REQUESTS" })
      }

      const data = await ctx.prisma.weather.findMany({
        take: 100,
        where: {
          showOnHomePage: true,
        },
        orderBy: [{ location: "asc" }],
      })

      return data.map((data) => weatherDTO(data))
    })

    return weatherData
  }),

  getWeatherForUserPage: publicProcedure.query(async ({ ctx }) => {
    const cacheKey = `userPageWeather:${ctx.userId as string}`

    const weatherData = await cacheFetch(cacheKey, async () => {
      const { success } = await RATELIMIT.limit(ctx.userId as string)

      if (!success) {
        throw new TRPCError({ code: "TOO_MANY_REQUESTS" })
      }
      const userWeathers = await ctx.prisma.userWeather.findMany({
        where: {
          userId: ctx.userId as string,
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
      const getLatLonFromGoogleAPI = async (address: string) => {
        const GOOGLE_CLOUD_API_KEY = process.env.GOOGLE_CLOUD_API_KEY as string

        const params = {
          address: address,
          key: GOOGLE_CLOUD_API_KEY,
        }

        const { data } = (await axios.get<GeocodeResult>(
          "https://maps.googleapis.com/maps/api/geocode/json",
          { params }
        )) as { data: GeocodeResult }

        return data?.results[0]?.geometry?.location as {
          lat: number
          lng: number
        }
      }

      const getOpenWeatherMapData = async (lat: number, lon: number) => {
        const OPEN_WEATHER_MAP_KEY = process.env.OPEN_WEATHER_MAP_KEY as string

        const response = await fetch(
          `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${OPEN_WEATHER_MAP_KEY}`
        )

        return (await response.json()) as WeatherInput
      }

      const mapWeatherToUserWeather = async (data: unknown, coord: string) => {
        const weather = await ctx.prisma.weather.findUnique({
          where: {
            latLon: coord,
          },
        })

        if (!weather?.json) {
          const createNewWeather = await ctx.prisma.weather.create({
            data: {
              latLon: coord,
              json: data as Prisma.JsonObject,
              showOnHomePage: false,
              location: input.location,
            },
          })
          console.log("Creating new weather", createNewWeather)
        }

        await ctx.prisma.userWeather.upsert({
          where: {
            userId_latLon: {
              userId: ctx.userId as string,
              latLon: coord,
            },
          },
          create: {
            userId: ctx.userId as string,
            latLon: coord,
          },
          update: {},
        })
      }

      const getWeatherFromCurrentUser = async () => {
        const userWeathers = await ctx.prisma.userWeather.findMany({
          where: {
            userId: ctx.userId as string,
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
      }

      const cacheKey = `getWeatherFromCurrentUser:${ctx.userId as string}${
        input.location
      }${input.address}`

      const weatherData = await cacheFetch(cacheKey, async () => {
        const { success } = await RATELIMIT.limit(ctx.userId as string)

        if (!success) {
          throw new TRPCError({ code: "TOO_MANY_REQUESTS" })
        }

        const { lat, lng: lon } = await getLatLonFromGoogleAPI(input.address)
        const openWeatherData = await getOpenWeatherMapData(lat, lon)
        const coord =
          openWeatherData.coord.lat.toString() +
          "," +
          openWeatherData.coord.lon.toString()
        await mapWeatherToUserWeather(openWeatherData, coord)
        return await getWeatherFromCurrentUser()
      })

      console.log(weatherData)

      return weatherData
    }),
})
