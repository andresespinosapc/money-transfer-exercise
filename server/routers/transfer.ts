import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";

export const transferRouter = router({
  create: protectedProcedure
    .input(z.object({ quoteId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const quote = await ctx.prisma.quote.findUnique({
        where: { id: input.quoteId },
        include: { transfer: true },
      });

      if (!quote || quote.userId !== ctx.userId) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Quote not found",
        });
      }

      if (quote.status !== "saved") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Quote is no longer available",
        });
      }

      if (quote.expiresAt < new Date()) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Quote has expired",
        });
      }

      if (quote.transfer) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "A transfer already exists for this quote",
        });
      }

      const [transfer] = await ctx.prisma.$transaction([
        ctx.prisma.transfer.create({
          data: {
            userId: ctx.userId,
            quoteId: input.quoteId,
          },
        }),
        ctx.prisma.quote.update({
          where: { id: input.quoteId },
          data: { status: "accepted" },
        }),
      ]);

      return transfer;
    }),

  list: protectedProcedure.query(async ({ ctx }) => {
    const transfers = await ctx.prisma.transfer.findMany({
      where: { userId: ctx.userId },
      orderBy: { createdAt: "desc" },
      include: {
        quote: true,
      },
    });

    return transfers.map((t) => ({
      ...t,
      quote: {
        ...t.quote,
        sourceAmount: t.quote.sourceAmount.toString(),
        targetAmount: t.quote.targetAmount.toString(),
        exchangeRate: t.quote.exchangeRate.toString(),
        feePercentage: t.quote.feePercentage.toString(),
        feeAmount: t.quote.feeAmount.toString(),
      },
    }));
  }),
});
