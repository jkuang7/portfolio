import Image from "next/image"
import { api } from "~/utils/api"
import React, { useState, useEffect } from "react"
import { useUser } from "@clerk/nextjs"

interface FormProps {
  setWeatherData: React.Dispatch<React.SetStateAction<Weather[]>>
}

const Form: React.FC<FormProps> = ({ setWeatherData }) => {
  const [location, setLocation] = useState("")
  const [address, setAddress] = useState("")

  const queryLocationAndAddress =
    api.weather.getWeatherForLocation.useMutation()

  const handleSearch = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    queryLocationAndAddress.mutate({ location, address })

    setLocation("")
    setAddress("")
  }

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { value, placeholder } = event.target
    event.preventDefault()

    if (placeholder === "Location") {
      setLocation(value)
    } else {
      setAddress(value)
    }
  }

  useEffect(() => {
    console.log(location, address)

    if (queryLocationAndAddress.isSuccess) {
      const data = queryLocationAndAddress.data?.weather
      setWeatherData(data)
    }
  }, [queryLocationAndAddress.data])

  return (
    <form
      onSubmit={handleSearch}
      className="mx-auto mt-4 flex max-w-md flex-col items-center justify-center "
    >
      <div className="mb-2 w-full">
        <input
          type="text"
          placeholder="Location"
          value={location}
          onChange={handleInputChange}
          className="w-full rounded-md border border-gray-400 bg-gray-100 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div className="mb-2 w-full">
        <input
          type="text"
          placeholder="Address"
          value={address}
          onChange={handleInputChange}
          className="w-full rounded-md border border-gray-400 bg-gray-100 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <button
        type="submit"
        className="w-full rounded-md bg-blue-500 px-4 py-2 font-semibold text-white hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        Search
      </button>
    </form>
  )
}

interface Weather {
  name?: string
  location?: string
  description?: string
  temp?: number
  feels_like?: number
  temp_min?: number
  temp_max?: number
  pressure?: number
  humidity?: number
  wind?: number
  lon?: number | string
  lat?: number | string
  iconImageURL?: string
  updatedAt?: Date
}

const WeatherCard: React.FC<Weather> = (data) => {
  const utcDate = new Date(data?.updatedAt || "")
  const estDate = new Date(
    utcDate.toLocaleString("en-US", { timeZone: "America/New_York" })
  )

  const dateString =
    estDate.toLocaleString("en-US", {
      timeZone: "America/New_York",
      hour12: true,
      hour: "numeric",
      minute: "numeric",
      year: "numeric",
      month: "long",
      day: "numeric",
    }) + " EST"

  return (
    <div className="border-black-500 relative mx-auto mt-4 grid max-w-md grid-cols-2 gap-5 overflow-hidden rounded-3xl border border-slate-400 bg-white p-5 shadow-lg">
      <button className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-lg bg-red-500 text-white">
        ×
      </button>
      <div>
        <p>{data?.location}</p>
        <p>Lat: {data?.lat}</p>
        <p>Lon: {data?.lon}</p>
        <br></br>
        <p>Temperature: {data?.temp}</p>
        <p>Feels Like: {data?.feels_like}</p>
        <p>Min: {data?.temp_min}</p>
        <p>Max: {data?.temp_max}</p>
      </div>
      <div>
        {data?.iconImageURL && (
          <>
            <p className="capitalize">{data?.description}</p>
            <Image
              src={data?.iconImageURL || "/"}
              width={100}
              height={100}
              alt="weather icon"
              priority={true}
            />
          </>
        )}
        <p>Pressure: {data?.pressure}</p>
        <p>Humidity: {data?.humidity}</p>
        <p>Wind: {data?.wind} Mph</p>
      </div>
      <div className="col-span-2">
        <p>{dateString}</p>
      </div>
    </div>
  )
}

const WeatherPage = () => {
  const { isSignedIn } = useUser()
  const [weatherData, setWeatherData] = useState<Weather[]>([])

  const userResponse = api.weather.getWeatherForUserPage.useQuery(undefined, {
    enabled: isSignedIn === true,
    refetchOnWindowFocus: false,
  })

  const mainResponse = api.weather.getWeatherForMainPage.useQuery(undefined, {
    enabled: isSignedIn === false,
    refetchOnWindowFocus: false,
  })

  const response = isSignedIn ? userResponse : mainResponse

  const weather = response?.data?.weather

  const users = api.user.addUser.useMutation()

  useEffect(() => {
    const addUserIfDNE = () => {
      if (isSignedIn) {
        users.mutate()
      }
    }
    addUserIfDNE()
  }, [isSignedIn])

  useEffect(() => {
    if (weather) {
      setWeatherData(weather)
    }
  }, [weather])

  if (isSignedIn == undefined) {
    return (
      <p className="flex h-screen items-center justify-center">Loading...</p>
    )
  } else {
    return (
      <div>
        {isSignedIn && <Form setWeatherData={setWeatherData} />}
        {weatherData?.map((w) => {
          return (
            <WeatherCard key={`${w.lat as string},${w.lon as string}`} {...w} />
          )
        })}
      </div>
    )
  }
}

export default WeatherPage
