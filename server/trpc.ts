import { initTRPC, TRPCError } from "@trpc/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import superjson from "superjson";

export async function createTRPCContext() {
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from Server Component — ignore
          }
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { user, prisma };
}

export type Context = Awaited<ReturnType<typeof createTRPCContext>>;

const t = initTRPC.context<Context>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;

export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }

  // Upsert user in our DB on first access
  await ctx.prisma.user.upsert({
    where: { id: ctx.user.id },
    update: {},
    create: {
      id: ctx.user.id,
      email: ctx.user.email!,
    },
  });

  return next({
    ctx: {
      ...ctx,
      userId: ctx.user.id,
    },
  });
});
