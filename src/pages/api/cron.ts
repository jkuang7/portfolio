import type { NextApiRequest, NextApiResponse } from "next";
import fetch from "node-fetch";
import { PrismaClient } from "@prisma/client";
import type { Prisma } from "@prisma/client";

const prisma = new PrismaClient();

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const locations = [{ lat: "40.7376", lon: "-73.8789", loc: "North Beach" }];

  const responses = await Promise.all(
    locations.map(async (loc) => {
      const lat = loc.lat;
      const lon = loc.lon;
      const response = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=081a314e861f49868f503b1ce665590b`
      );
      return [loc, (await response.json()) as Prisma.JsonObject];
    })
  );

  responses.map(async (weatherData) => {
    try {
      const lat = weatherData[0]?.lat as string;
      const lon = weatherData[0]?.lon as string;
      const coord = `${lat},${lon}`;

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
          location: weatherData[0]?.loc as string,
        },
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Something went wrong" });
    }
  });

  res.status(200).json({ message: "success" });
}
