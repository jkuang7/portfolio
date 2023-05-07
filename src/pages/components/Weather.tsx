import Image from "next/image"
import { api } from "~/utils/api"
import React, { useState, useEffect } from "react"
import { useUser, useAuth } from "@clerk/nextjs"

interface FormProps {
  placeholder: string
  onSearch: (query: string) => void
  buttonName?: string
}

const Form: React.FC<FormProps> = () => {
  const [location, setLocation] = useState("")
  const [address, setAddress] = useState("")

  const handleSearch = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
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

  return (
    <form onSubmit={handleSearch} className="flex items-center">
      <input
        type="text"
        placeholder={"Location"}
        value={location}
        onChange={handleInputChange}
        className="rounded-l-md border border-gray-300 px-4 py-2 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-400"
      />
      <input
        type="text"
        placeholder={"Address"}
        value={address}
        onChange={handleInputChange}
        className="rounded-l-md border border-gray-300 px-4 py-2 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-400"
      />
      <button
        type="submit"
        className="rounded-r-md border border-blue-500 bg-blue-500 px-4 py-2 font-semibold text-white hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-opacity-50"
      >
        Submit
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
  lon?: number
  lat?: number
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
    <div className="border-black-500 mx-auto mt-4 grid max-w-md grid-cols-2 gap-5 overflow-hidden rounded-3xl border border-slate-400 bg-white p-5 shadow-lg">
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
  const { userId } = useAuth() as { userId: string }

  const userResponse = api.weather.getWeatherForUserPage.useQuery(
    { userId },
    { enabled: isSignedIn === true, refetchOnWindowFocus: false }
  )

  const mainResponse = api.weather.getWeatherForMainPage.useQuery(undefined, {
    enabled: isSignedIn === false,
    refetchOnWindowFocus: false,
  })

  const response = isSignedIn ? userResponse : mainResponse

  const weatherData = response?.data?.weather

  const users = api.user.addUser.useMutation()

  useEffect(() => {
    const addUserIfDNE = () => {
      if (isSignedIn) {
        users.mutate()
      }
    }
    addUserIfDNE()
  }, [isSignedIn])

  if (isSignedIn == undefined) {
    return (
      <p className="flex h-screen items-center justify-center">Loading...</p>
    )
  } else {
    return (
      <div>
        {isSignedIn && <Form />}
        {weatherData?.map((weather) => {
          return <WeatherCard key={weather.name} {...weather} />
        })}
      </div>
    )
  }
}

export default WeatherPage
