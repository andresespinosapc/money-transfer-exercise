import { router } from "./trpc";
import { quoteRouter } from "./routers/quote";
import { transferRouter } from "./routers/transfer";

export const appRouter = router({
  quote: quoteRouter,
  transfer: transferRouter,
});

export type AppRouter = typeof appRouter;
