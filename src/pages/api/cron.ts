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
      const coord = `${lat},${lon}`;
      const response = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=081a314e861f49868f503b1ce665590b`
      );
      return [coord, (await response.json()) as Prisma.JsonObject];
    })
  );

  responses.map(async (weatherData) => {
    try {
      const coord = weatherData[0] as string;
      await prisma.weather.update({
        where: {
          latLon: coord,
        },
        data: {
          json: weatherData[1] as Prisma.JsonObject,
        },
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Something went wrong" });
    }
  });

  res.status(200).json({ message: "success", responses });
}
