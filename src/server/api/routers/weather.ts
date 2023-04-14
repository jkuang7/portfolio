import { z } from "zod";

import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";

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
};

//helpers
const convertKelvinToFahrenheit = (kelvin: number | undefined) => {
  if (kelvin === undefined) {
    return undefined;
  }
  return Math.round(((kelvin - 273.15) * 9) / 5 + 32);
};

const weatherDTO = (data: Weather) => {
  const weatherData = {
    name: data?.name,
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
  };

  //update iconImageURL in weatherData to the corresponding image link
  if (data.weather[0]?.icon) {
    const iconId = data.weather[0]?.icon;
    const iconImageURL = weatherIconMap[iconId];
    weatherData.iconImageURL = iconImageURL || "";
  }

  return weatherData;
};

//routers
export const weatherRouter = createTRPCRouter({
  getWeather: publicProcedure.query(async ({ ctx }) => {
    const weatherData = await ctx.prisma.weather.findMany({
      take: 100,
      where: {
        showOnMainPage: true,
      },
      orderBy: [{ location: "asc" }],
    });

    return weatherData.map((data) => {
      const res = data.json?.valueOf() as Weather;
      return { ...weatherDTO(res), updatedAt: data.updatedAt.toString() };
    });
  }),

  getUserWeather: publicProcedure.query(async ({ ctx }) => {
    //get user's location
  }),
});
