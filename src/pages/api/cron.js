import fetch from "node-fetch";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function handler(req, res) {
  const lat = "40.7375751";
  const lon = "-73.8788719";
  const dataResponse = await fetch(
    `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=081a314e861f49868f503b1ce665590b`
  );

  const weatherData = await dataResponse.json();

  try {
    const createdWeatherData = await prisma.weather.update({
      where: {
        latLon: `${lat},${lon}`,
      },
      data: {
        json: JSON.stringify(weatherData),
      },
    });
    res.status(200).json(createdWeatherData);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Something went wrong" });
  }
}
