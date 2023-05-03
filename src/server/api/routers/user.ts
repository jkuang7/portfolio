import { createTRPCRouter, publicProcedure } from "~/server/api/trpc"
import type { User } from "@prisma/client"

export const userRouter = createTRPCRouter({
  addUser: publicProcedure.mutation(async ({ ctx }) => {
    let user: User | null = await ctx.prisma.user.findUnique({
      where: {
        id: ctx.userId as string,
      },
    })

    if (!user) {
      user = await ctx.prisma.user.create({
        data: {
          id: ctx.userId as string,
        },
      })
      return { user, created: true }
    }

    return { created: false }
  }),
})
