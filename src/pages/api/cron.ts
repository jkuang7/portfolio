import type { Request, Response } from "express";
import fetch from "node-fetch";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface Weather {
  coord: {
    lon: number;
    lat: number;
  };
  weather: {
    id: number;
    main: string;
    description: string;
    icon: string;
  }[];
  base: string;
  main: {
    temp: number;
    feels_like: number;
    temp_min: number;
    temp_max: number;
    pressure: number;
    humidity: number;
  };
  visibility: number;
  wind: { speed: number; deg: number };
  cloud: { all: number };
  dt: number;
  sys: {
    type: number;
    id: number;
    country: string;
    sunrise: number;
    sunset: number;
  };
  timezone: number;
  id: number;
  name: string;
  cod: number;
}

export async function handler(req: Request, res: Response): Promise<void> {
  const lat = "40.7375751";
  const lon = "-73.8788719";
  const dataResponse = await fetch(
    `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=081a314e861f49868f503b1ce665590b`
  );

  const weatherData = (await dataResponse.json()) as Weather;

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
