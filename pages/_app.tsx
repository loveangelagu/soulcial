import "@/styles/globals.css";
import "leaflet/dist/leaflet.css";
import type { AppProps } from "next/app";
import Head from "next/head";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, viewport-fit=cover"
        />
        <title>plan my bali week</title>
        <meta
          name="description"
          content="Tell us what you're into. We'll plan a week in Bali that actually fits your vibe — based on what events are actually like, not what they call themselves."
        />
      </Head>
      <Component {...pageProps} />
    </>
  );
}
