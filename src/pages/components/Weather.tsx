import Image from "next/image"
import { api } from "~/utils/api"
import React, { useState } from "react"
import { useUser, useAuth } from "@clerk/nextjs"

interface SearchBoxProps {
  placeholder: string
  onSearch: (query: string) => void
  buttonName?: string
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

interface WeatherProps {
  data: Weather[]
}

const SearchBox: React.FC<SearchBoxProps> = ({
  placeholder,
  onSearch,
  buttonName = "Search",
}) => {
  const [query, setQuery] = useState("")

  const handleSearch = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    onSearch(query)
  }

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(event.target.value)
  }

  return (
    <form onSubmit={handleSearch} className="flex items-center">
      <input
        type="text"
        placeholder={placeholder}
        value={query}
        onChange={handleInputChange}
        className="rounded-l-md border border-gray-300 px-4 py-2 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-400"
      />
      <button
        type="submit"
        className="rounded-r-md border border-blue-500 bg-blue-500 px-4 py-2 font-semibold text-white hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-opacity-50"
      >
        {buttonName}
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

const UserPageWeather: React.FC<WeatherProps> = ({ data }) => {
  const handleSearch = (searchText: string) => {
    console.log(`Looking up: ${searchText}`)
  }

  return (
    <>
      <div className="m-1 mt-5 flex  items-center justify-center">
        <SearchBox
          onSearch={handleSearch}
          placeholder="email@gmail.com"
          buttonName="Add Weather To Daily Calendar"
        />
      </div>
      <div className="m-1 mt-2 flex items-center justify-center">
        <SearchBox onSearch={handleSearch} placeholder="Search for a city" />
      </div>
      {data?.map((weather) => {
        return <WeatherCard key={weather.name} {...weather} />
      })}
    </>
  )
}

const WeatherPage = () => {
  const user = useUser()
  const { userId } = useAuth() as { userId: string }

  const { data } = user.isSignedIn
    ? api.weather.getWeatherForUserPage.useQuery({
        userId: userId,
      })
    : api.weather.getWeatherForMainPage.useQuery()

  if (!data) {
    return (
      <p className="flex h-screen items-center justify-center">Loading...</p>
    )
  } else {
    return !user.isSignedIn ? (
      <MainPageWeather data={data} />
    ) : (
      <UserPageWeather data={data} />
    )
  }
}

export default WeatherPage
