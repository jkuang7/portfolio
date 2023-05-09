import type { NextApiRequest, NextApiResponse } from "next"
import fetch from "node-fetch"
import { PrismaClient } from "@prisma/client"
import type { Prisma } from "@prisma/client"

const prisma = new PrismaClient()

const OPEN_WEATHER_MAP_KEY = process.env.OPEN_WEATHER_MAP_KEY as string

const seed = async () => {
  const locations = [
    {
      lat: "40.70",
      lon: "-74.6377",
      location: "New York",
      showOnHomePage: true,
    },
    {
      lat: "36.2048",
      lon: "138.2529",
      location: "Japan",
      showOnHomePage: true,
    },
    {
      lat: "36.7783",
      lon: "-119.4179",
      location: "California",
      showOnHomePage: true,
    },
    {
      lat: "40.7376",
      lon: "-73.8789",
      location: "Elmhurst",
      showOnHomePage: false,
    },
  ]
  const getWeatherDataFromAPI = await Promise.all(
    locations.map(async (loc) => {
      const lat = loc.lat
      const lon = loc.lon
      const response = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${OPEN_WEATHER_MAP_KEY}`
      )
      return [loc, (await response.json()) as Prisma.JsonObject]
    })
  )

  const USER_ADMIN_ID = process.env.USER_ADMIN_ID as string

  await prisma.user.create({
    data: {
      id: "admin",
    },
  })

  await prisma.user.create({
    data: {
      id: USER_ADMIN_ID,
    },
  })

  const addWeatherToDb = getWeatherDataFromAPI.map(async (data) => {
    const lat = data[0]?.lat as string
    const lon = data[0]?.lon as string
    const coord = `${lat},${lon}`

    return await prisma.weather.upsert({
      where: {
        latLon: coord,
      },
      update: {
        json: data[1] as Prisma.JsonObject,
      },
      create: {
        latLon: coord,
        json: data[1] as Prisma.JsonObject,
      },
    })
  })
  const weathers = await Promise.all(addWeatherToDb)

  locations.map(async (loc) => {
    if (loc.showOnHomePage) {
      await prisma.userWeather.create({
        data: {
          userId: "admin",
          latLon: `${loc.lat as string},${loc.lon as string}`,
          showOnHomePage: loc.showOnHomePage as boolean,
          location: loc.location as string,
        },
      })
    } else {
      await prisma.userWeather.create({
        data: {
          userId: USER_ADMIN_ID,
          latLon: `${loc.lat as string},${loc.lon as string}`,
          showOnHomePage: loc.showOnHomePage as boolean,
          location: loc.location as string,
        },
      })
    }
  })

  return weathers
}

const updateWeather = async () => {
  const weatherEntries = await prisma.weather.findMany()

  if (weatherEntries.length == 0) {
    return []
  }

  const getWeatherDataAPI = await Promise.all(
    weatherEntries.map(async (data) => {
      const latLon = data.latLon
      const [lat, lon] = latLon.split(",") as [string, string]

      const response = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${OPEN_WEATHER_MAP_KEY}`
      )

      return [latLon, (await response.json()) as Prisma.JsonObject]
    })
  )

  const updateWeatherInDb = getWeatherDataAPI.map(async (data) => {
    const latLon = data[0] as string

    await prisma.weather.update({
      where: {
        latLon: latLon,
      },
      data: {
        json: data[1] as Prisma.JsonObject,
      },
    })
  })

  return Promise.all(updateWeatherInDb)
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
    const updatingWeather = await updateWeather()

    if (updatingWeather.length == 0) {
      await seed()
    }

    updatingWeather.length > 0
      ? res.status(200).json({
          message: `success`,
        })
      : res.status(500).json({ message: "Failure, no entries updated" })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: "Something went wrong" })
  }
}
