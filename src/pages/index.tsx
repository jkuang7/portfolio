import { type NextPage } from "next";
import Head from "next/head";
import Link from "next/link";
import Weather from "~/pages/components/Weather";

const Home: NextPage = () => {
  return (
    <>
      <Head>
        <title>Create T3 App</title>
        <meta name="description" content="Generated by create-t3-app" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <main className="overflow-x-hidden whitespace-normal break-all">
        <Weather />
      </main>
    </>
  );
};

export default Home;
