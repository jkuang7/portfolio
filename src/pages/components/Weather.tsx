import Image from "next/image";
import { api } from "~/utils/api";
import React, { useState } from "react";

interface SearchBoxProps {
  placeholder: string;
  onSearch: (query: string) => void;
  buttonName?: string;
}

const SearchBox: React.FC<SearchBoxProps> = ({
  placeholder,
  onSearch,
  buttonName = "Search",
}) => {
  const [query, setQuery] = useState("");

  const handleSearch = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSearch(query);
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(event.target.value);
  };

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
  );
};

interface weatherData {
  name?: string;
  description?: string;
  temp?: number;
  feels_like?: number;
  temp_min?: number;
  temp_max?: number;
  pressure?: number;
  humidity?: number;
  wind?: number;
  lon?: number;
  lat?: number;
  iconImageURL?: string;
  updatedAt?: string;
}

const WeatherCard = (data: weatherData) => {
  let dateString = data?.updatedAt || "";
  dateString =
    dateString.slice(0, dateString.toString().indexOf("GMT")) + " EST";

  return (
    <div className="border-black-500 mx-auto mt-4 grid max-w-md grid-cols-2 gap-5 overflow-hidden rounded-3xl border border-slate-400 bg-white p-5 shadow-lg">
      <div>
        <p>{data?.name}</p>
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
  );
};

const Weather = () => {
  const { data } = api.weather.getWeather.useQuery();

  const handleSearch = (searchText: string) => {
    console.log(`Looking up City: ${searchText}`);
  };

  return (
    <>
      <div className="m-1 mt-5 flex  items-center justify-center">
        <SearchBox
          onSearch={handleSearch}
          placeholder="email@gmail.com"
          buttonName="Add Weather To Daily Calendar"
        />
      </div>
      <div className="mt-2 flex items-center justify-center">
        <SearchBox onSearch={handleSearch} placeholder="Search for a city" />
      </div>
      {data?.map((weatherData) => {
        return <WeatherCard key={weatherData.name} {...weatherData} />;
      })}
    </>
  );
};

export default Weather;
