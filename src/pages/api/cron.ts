import type { NextApiRequest, NextApiResponse } from "next"
import fetch from "node-fetch"
import { PrismaClient } from "@prisma/client"
import type { Prisma } from "@prisma/client"

const prisma = new PrismaClient()

const WEATHER_KEY = process.env.WEATHER_KEY as string

const seed = async () => {
  const mainPageLocations = [
    { lat: "40.7376", lon: "-73.8789", name: "New York" },
  ]
  const mainPageDataFromAPI = await Promise.all(
    mainPageLocations.map(async (loc) => {
      const lat = loc.lat
      const lon = loc.lon
      const response = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${WEATHER_KEY}`
      )
      return [loc, (await response.json()) as Prisma.JsonObject]
    })
  )

  const updateMainPageWeatherEntriesInDb = mainPageDataFromAPI.map(
    async (weatherData) => {
      const lat = weatherData[0]?.lat as string
      const lon = weatherData[0]?.lon as string
      const coord = `${lat},${lon}`

      await prisma.weather.upsert({
        where: {
          latLon: coord,
        },
        update: {
          json: weatherData[1] as Prisma.JsonObject,
        },
        create: {
          latLon: coord,
          json: weatherData[1] as Prisma.JsonObject,
          showOnMainPage: true,
          location: weatherData[0]?.name as string,
        },
      })
    }
  )
  return Promise.all(updateMainPageWeatherEntriesInDb)
}

const updateWeatherEntries = async () => {
  const weatherEntriesFromDb = await prisma.weather.findMany()

  const weatherEntriesFromAPI = await Promise.all(
    weatherEntriesFromDb.map(async (data) => {
      const latLon = data.latLon
      const [lat, lon] = latLon.split(",") as [string, string]

      const response = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${WEATHER_KEY}`
      )

      return [latLon, (await response.json()) as Prisma.JsonObject]
    })
  )

  const updateWeatherEntriesInDb = weatherEntriesFromAPI.map(
    async (weatherData) => {
      const latLon = weatherData[0] as string

      await prisma.weather.update({
        where: {
          latLon: latLon,
        },
        data: {
          json: weatherData[1] as Prisma.JsonObject,
        },
      })
    }
  )

  return Promise.all(updateWeatherEntriesInDb)
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.query.key !== "ZxNf82j") {
    res.status(404).end()
    return
  }

  try {
    const updateWeatherEntriesFromDb = await updateWeatherEntries()

    if (updateWeatherEntriesFromDb.length == 0) {
      await seed()
    }

    updateWeatherEntriesFromDb.length > 0
      ? res.status(200).json({
          message: `success}`,
        })
      : res.status(500).json({ message: "failure" })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: "Something went wrong" })
  }
}
