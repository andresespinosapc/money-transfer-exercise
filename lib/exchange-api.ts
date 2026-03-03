import { CACHE_TTL_MINUTES } from "./constants";
import { Prisma, type PrismaClient } from "@/lib/generated/prisma/client";

const Decimal = Prisma.Decimal;
type Decimal = Prisma.Decimal;

export async function getExchangeRate(
  baseCurrency: string,
  targetCurrency: string,
  prisma: PrismaClient
): Promise<Decimal> {
  // Check cache first
  const cutoff = new Date(Date.now() - CACHE_TTL_MINUTES * 60 * 1000);

  const cached = await prisma.exchangeRate.findFirst({
    where: {
      baseCurrency,
      targetCurrency,
      fetchedAt: { gte: cutoff },
    },
    orderBy: { fetchedAt: "desc" },
  });

  if (cached) {
    return cached.rate;
  }

  // Fetch from ExchangeRate-API
  const apiKey = process.env.EXCHANGE_RATE_API_KEY;
  if (!apiKey) {
    throw new Error("EXCHANGE_RATE_API_KEY is not configured");
  }

  const res = await fetch(
    `https://v6.exchangerate-api.com/v6/${apiKey}/pair/${baseCurrency}/${targetCurrency}`
  );

  if (!res.ok) {
    throw new Error(`Exchange rate API error: ${res.status}`);
  }

  const data = await res.json();

  if (data.result !== "success") {
    throw new Error(`Exchange rate API error: ${data["error-type"]}`);
  }

  const rate = new Decimal(data.conversion_rate);

  let rawResponse: Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput = data;
  try {
    JSON.stringify(data);
  } catch (e) {
    console.error("Failed to serialize exchange rate API response", e);
    rawResponse = Prisma.DbNull;
  }

  // Cache the rate
  await prisma.exchangeRate.create({
    data: {
      baseCurrency,
      targetCurrency,
      rate,
      rawResponse,
    },
  });

  return rate;
}
