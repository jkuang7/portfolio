import { z } from "zod";

import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";

interface weather {
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
  "02d": "https://openweathermap.org/img/wn/02d@2x.png",
  "03d": "https://openweathermap.org/img/wn/03d@2x.png",
  "04d": "https://openweathermap.org/img/wn/04d@2x.png",
  "09d": "https://openweathermap.org/img/wn/09d@2x.png",
  "10d": "https://openweathermap.org/img/wn/10d@2x.png",
  "11d": "https://openweathermap.org/img/wn/11d@2x.png",
  "13d": "https://openweathermap.org/img/wn/13d@2x.png",
  "50d": "https://openweathermap.org/img/wn/50d@2x.png",
};

//helpers
const convertKelvinToFahrenheit = (kelvin: number | undefined) => {
  if (kelvin === undefined) {
    return undefined;
  }
  return Math.round(((kelvin - 273.15) * 9) / 5 + 32);
};

const weatherDTO = (data: weather) => {
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
  // getWeather: publicProcedure.input(z.object({})).query(({ input }) => {
  //   // const res = await fetch(
  //   //   `https://api.openweathermap.org/data/2.5/weather?lat=40.7375751&lon=-73.8788719&appid=081a314e861f49868f503b1ce665590b`
  //   // );

  //   // const data = res.json();
  //   // return data;

  //   return weatherDTO(data);
  // }),
  getWeather: publicProcedure.query(async ({ ctx }) => {
    const weatherData = await ctx.prisma.weather.findMany({
      take: 100,
      where: {
        showOnMainPage: true,
      },
      orderBy: [{ location: "asc" }],
    });

    return weatherData.map((data) => {
      const res = data.json?.valueOf() as weather;
      return weatherDTO(res);
    });
  }),

  getUserWeather: publicProcedure.query(async ({ ctx }) => {
    // const weatherData = await ctx.prisma.weather.findFirst({
    //   take: 100,
    //   orderBy: [{ location: "asc" }],
    // });
  }),
});
