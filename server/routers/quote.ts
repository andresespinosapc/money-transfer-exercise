import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { getExchangeRate } from "@/lib/exchange-api";
import { FEE_PERCENTAGE, QUOTE_TTL_MINUTES } from "@/lib/constants";
import { Prisma } from "@/lib/generated/prisma/client";

const Decimal = Prisma.Decimal;

const currencyInput = z.object({
  sourceCurrency: z.string().length(3),
  targetCurrency: z.string().length(3),
  sourceAmount: z.number().positive(),
});

export const quoteRouter = router({
  calculate: protectedProcedure.input(currencyInput).mutation(async ({ ctx, input }) => {
    const rate = await getExchangeRate(
      input.sourceCurrency,
      input.targetCurrency,
      ctx.prisma
    );

    const sourceAmount = new Decimal(input.sourceAmount);
    const feePercentage = new Decimal(FEE_PERCENTAGE);
    const feeAmount = sourceAmount.mul(feePercentage).toDecimalPlaces(2);
    const targetAmount = sourceAmount.sub(feeAmount).mul(rate).toDecimalPlaces(2);

    return {
      sourceCurrency: input.sourceCurrency,
      targetCurrency: input.targetCurrency,
      sourceAmount: sourceAmount.toString(),
      targetAmount: targetAmount.toString(),
      exchangeRate: rate.toString(),
      feePercentage: feePercentage.toString(),
      feeAmount: feeAmount.toString(),
    };
  }),

  save: protectedProcedure.input(currencyInput).mutation(async ({ ctx, input }) => {
    const rate = await getExchangeRate(
      input.sourceCurrency,
      input.targetCurrency,
      ctx.prisma
    );

    const sourceAmount = new Decimal(input.sourceAmount);
    const feePercentage = new Decimal(FEE_PERCENTAGE);
    const feeAmount = sourceAmount.mul(feePercentage).toDecimalPlaces(2);
    const targetAmount = sourceAmount.sub(feeAmount).mul(rate).toDecimalPlaces(2);

    const expiresAt = new Date(Date.now() + QUOTE_TTL_MINUTES * 60 * 1000);

    const quote = await ctx.prisma.quote.create({
      data: {
        userId: ctx.userId,
        sourceCurrency: input.sourceCurrency,
        targetCurrency: input.targetCurrency,
        sourceAmount,
        targetAmount,
        exchangeRate: rate,
        feePercentage,
        feeAmount,
        expiresAt,
      },
    });

    return quote;
  }),

  list: protectedProcedure.query(async ({ ctx }) => {
    const quotes = await ctx.prisma.quote.findMany({
      where: { userId: ctx.userId },
      orderBy: { createdAt: "desc" },
      include: { transfer: true },
    });

    // Mark expired quotes
    const now = new Date();
    return quotes.map((q) => ({
      ...q,
      sourceAmount: q.sourceAmount.toString(),
      targetAmount: q.targetAmount.toString(),
      exchangeRate: q.exchangeRate.toString(),
      feePercentage: q.feePercentage.toString(),
      feeAmount: q.feeAmount.toString(),
      status: q.status === "saved" && q.expiresAt < now ? "expired" : q.status,
    }));
  }),
});
