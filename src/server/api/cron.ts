import type { Request, Response } from "express";
import fetch from "node-fetch";

export async function handler(req: Request, res: Response): Promise<void> {
  const lat = '40.7375751'
  const lon = '-73.8788719'
  const data = await fetch(
    `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=081a314e861f49868f503b1ce665590b`
  );

  res.status(200).json(data);
}
