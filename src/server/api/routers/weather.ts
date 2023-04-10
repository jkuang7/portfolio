import { z } from "zod";

import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";

const data = {
  coord: { lon: -73.8802, lat: 40.7368 },
  weather: [
    { id: 803, main: "Clouds", description: "broken clouds", icon: "04d" },
  ],
  base: "stations",
  main: {
    temp: 283.71,
    feels_like: 281.6,
    temp_min: 281.42,
    temp_max: 286.24,
    pressure: 1031,
    humidity: 30,
  },
  visibility: 10000,
  wind: { speed: 2.57, deg: 0 },
  clouds: { all: 75 },
  dt: 1680983463,
  sys: {
    type: 2,
    id: 2002197,
    country: "US",
    sunrise: 1680949674,
    sunset: 1680996392,
  },
  timezone: -14400,
  id: 5128920,
  name: "North Beach",
  cod: 200,
};

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

type weather = typeof data;

const weatherDTO = (data: weather) => {
  const weatherData = {
    name: data.name,
    description: data.weather[0]?.description,
    temp: convertKelvinToFahrenheit(data.main.temp),
    feels_like: convertKelvinToFahrenheit(data.main.feels_like),
    temp_min: convertKelvinToFahrenheit(data.main.temp_min),
    temp_max: convertKelvinToFahrenheit(data.main.temp_max),
    pressure: data.main.pressure,
    humidity: data.main.humidity,
    wind: data.wind.speed,
    coord: {
      lon: data.coord.lon,
      lat: data.coord.lat,
    },
    iconImageURL: "",
  };

  //updating iconLink in weatherData to the corresponding image link
  if (data.weather[0]?.icon) {
    const iconId = data.weather[0]?.icon;
    const iconImageURL = weatherIconMap[iconId];
    weatherData.iconImageURL = iconImageURL || "";
  }

  return weatherData;
};

//routers
export const weatherRouter = createTRPCRouter({
  getWeather: publicProcedure.input(z.object({})).query(({ input }) => {
    // const res = await fetch(
    //   `https://api.openweathermap.org/data/2.5/weather?lat=40.7375751&lon=-73.8788719&appid=081a314e861f49868f503b1ce665590b`
    // );

    // const data = res.json();
    // return data;

    return weatherDTO(data);
  }),

  getAll: publicProcedure.query(({ ctx }) => {
    return ctx.prisma.weather.findMany();
  }),
});
