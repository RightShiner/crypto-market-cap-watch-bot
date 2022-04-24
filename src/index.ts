import axios from "axios";
import { Client, Intents } from "discord.js";

import "dotenv/config";

export enum Aux {
  MARKET_CAP_BY_TOTAL_SUPPLY = "market_cap_by_total_supply",
}

export interface CoinData {
  quote: Quote;
}

export enum Currency {
  USD = "USD",
}

export type Quote = {
  [key in Currency]: {
    market_cap: number;
  };
};

axios.defaults.headers["X-CMC_PRO_API_KEY"] =
  process.env.COINMARKETCAP_API_TOKEN;

const client = new Client({
  intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MEMBERS],
});

const COIN_ID = process.env.COIN_ID || "terra-luna";
const CURRENCY = process.env.CURRENCY || Currency.USD;
const TIME_INTERVAL = 5 * 60 * 1000;

/**
 * Fetch the coin info from CoinMarketCap
 *
 * @param slug
 * @param aux
 */
const fetchCoinInfo = async (slug: string, aux: Aux): Promise<CoinData> => {
  const url = `${process.env.COINMARKETCAP_API_BASE_URL}/v2/cryptocurrency/quotes/latest`;

  try {
    const { data } = await axios.get(url, {
      params: {
        slug,
        aux,
      },
    });
    const coinData = data.data;
    const coinId = Object.keys(coinData)[0];

    return coinData[coinId];
  } catch (err) {
    console.error(err);
  }
};

/**
 * Return only the market cap info
 *
 * @param data
 */
const getMarketCap = async (data: CoinData): Promise<number> => {
  const marketCap: number = data.quote[CURRENCY].market_cap;

  const formattedMarketCap = Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 2,
  }).format(marketCap);
  console.info(new Date().toISOString(), `Market Cap:`, formattedMarketCap);

  const guilds = await client.guilds.cache;
  guilds.forEach((guild) => {
    guild.me.setNickname(`$${formattedMarketCap}`);
  });

  return marketCap;
};

client.once("ready", async () => {
  const marketCap = {
    data: {},
    set setData(data: CoinData) {
      this.data = data;
      getMarketCap(data);
    },
  };

  marketCap.setData = await fetchCoinInfo(
    COIN_ID,
    Aux.MARKET_CAP_BY_TOTAL_SUPPLY
  );

  setInterval(async () => {
    marketCap.setData = await fetchCoinInfo(
      COIN_ID,
      Aux.MARKET_CAP_BY_TOTAL_SUPPLY
    );
  }, TIME_INTERVAL);

  client.user.setPresence({
    status: "online",
    activities: [
      {
        name: "LUNA Market Cap",
        type: "WATCHING",
      },
    ],
  });
});

client
  .login(process.env.DISCORD_BOT_API_TOKEN)
  .then(() => console.info("Bot has successfully logged in!"));
