import Image from "next/image"
import { api } from "~/utils/api"
import React, { useState, useEffect } from "react"
import { useUser, useAuth } from "@clerk/nextjs"

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

interface WeatherProps {
  data: Weather[]
}

interface InputFormProps {
  setWeatherData: React.Dispatch<React.SetStateAction<Weather[]>>
}

const InputForm: React.FC<InputFormProps> = ({ setWeatherData }) => {
  const { userId } = useAuth() as { userId: string }
  const getWeather = api.weather.getWeatherForLocation.useMutation()
  const [location, setLocation] = useState("")
  const [address, setAddress] = useState("")
  const weathers = api.weather.getWeatherForUserPage.useQuery({ userId })

  const handleLocation = (event: React.ChangeEvent<HTMLInputElement>) => {
    event.preventDefault()
    setLocation(event.target.value)
  }

  const handleAddress = (event: React.ChangeEvent<HTMLInputElement>) => {
    event.preventDefault()
    setAddress(event.target.value)
  }

  const handleSearch = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (location && address) {
      // getWeather.mutate({ location, address })
      // setLocation("")
      // setAddress("")
      // if (weathers.data?.weather) {
      //   setWeatherData(weathers.data?.weather)
      // }
    } else {
      alert("Please enter a location name and an address")
    }
  }

  return (
    <form onSubmit={handleSearch} className="flex items-center">
      <input
        type="text"
        placeholder={"Location Name"}
        value={location}
        onChange={handleLocation}
        className="rounded-l-md border border-gray-300 px-4 py-2 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-400"
      />
      <input
        type="text"
        placeholder={"Address"}
        value={address}
        onChange={handleAddress}
        className="rounded-l-md border border-gray-300 px-4 py-2 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-400"
      />

      <button
        type="submit"
        className="rounded-r-md border border-blue-500 bg-blue-500 px-4 py-2 font-semibold text-white hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-opacity-50"
      >
        Search
      </button>
    </form>
  )
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

const MainPageWeather: React.FC<WeatherProps> = ({ data }) => {
  return (
    <>
      {data?.map((weather) => {
        return <WeatherCard key={weather.name} {...weather} />
      })}
    </>
  )
}

const UserPageWeather: React.FC<{
  data: Weather[]
  setWeatherData: React.Dispatch<React.SetStateAction<Weather[]>>
}> = ({ data, setWeatherData }) => {
  return (
    <>
      {<InputForm setWeatherData={setWeatherData} />}
      {data?.map((weather) => {
        return <WeatherCard key={weather.name} {...weather} />
      })}
    </>
  )
}

const WeatherPage = () => {
  const { isSignedIn } = useUser()
  const { userId } = useAuth() as { userId: string }
  const [weatherData, setWeatherData] = useState<WeatherProps["data"]>([])
  const users = api.user.addUser.useMutation()

  const userResponse = api.weather.getWeatherForUserPage.useQuery(
    { userId },
    { enabled: isSignedIn === true, refetchOnWindowFocus: false }
  )

  const mainResponse = api.weather.getWeatherForMainPage.useQuery(undefined, {
    enabled: isSignedIn === false,
    refetchOnWindowFocus: false,
  })

  const response = isSignedIn ? userResponse : mainResponse

  useEffect(() => {
    if (isSignedIn) {
      users.mutate()
    }
  }, [isSignedIn])

  useEffect(() => {
    if (response.data?.weather) {
      console.log("HELLO", response.data?.weather)
      setWeatherData(response.data?.weather)
    }
  }, [isSignedIn, response])

  if (isSignedIn == undefined) {
    return (
      <p className="flex h-screen items-center justify-center">Loading...</p>
    )
  } else {
    return isSignedIn ? (
      <UserPageWeather
        data={weatherData || []}
        setWeatherData={setWeatherData}
      />
    ) : (
      <MainPageWeather data={weatherData || []} />
    )
  }
}

export default WeatherPage
