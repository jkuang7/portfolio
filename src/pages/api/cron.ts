import type { NextApiRequest, NextApiResponse } from "next";
import fetch from "node-fetch";
import { PrismaClient } from "@prisma/client";
import type { Prisma } from "@prisma/client";

const prisma = new PrismaClient();

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const lat = "40.7376";
  const lon = "-73.8789";
  const dataResponse = await fetch(
    `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=081a314e861f49868f503b1ce665590b`
  );

  const weatherData = (await dataResponse.json()) as Prisma.JsonObject;

  try {
    const createdWeatherData = await prisma.weather.update({
      where: {
        latLon: `${lat},${lon}`,
      },
      data: {
        json: weatherData,
      },
    });

    res.status(200).json({ success: true, createdWeatherData });
    res.status(200).end("Hello Cron!");
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Something went wrong" });
  }
}
