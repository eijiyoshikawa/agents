import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { compare } from "bcryptjs"
import { prisma } from "./db"

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      id: "seeker-credentials",
      name: "求職者ログイン",
      credentials: {
        email: { label: "メールアドレス", type: "email" },
        password: { label: "パスワード", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
        })

        if (!user || !user.passwordHash) return null

        const isValid = await compare(
          credentials.password as string,
          user.passwordHash
        )
        if (!isValid) return null

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: "seeker" as const,
        }
      },
    }),
    Credentials({
      id: "company-credentials",
      name: "企業ログイン",
      credentials: {
        email: { label: "メールアドレス", type: "email" },
        password: { label: "パスワード", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        const companyUser = await prisma.companyUser.findUnique({
          where: { email: credentials.email as string },
          include: { company: true },
        })

        if (!companyUser) return null

        const isValid = await compare(
          credentials.password as string,
          companyUser.passwordHash
        )
        if (!isValid) return null

        return {
          id: companyUser.id,
          email: companyUser.email,
          name: companyUser.name,
          role: companyUser.role === "admin" ? "company_admin" : "company_member",
          companyId: companyUser.companyId,
        }
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = (user as { role: string }).role
        token.companyId = (user as { companyId?: string }).companyId
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        ;(session.user as { role: string }).role = token.role as string
        ;(session.user as { companyId?: string }).companyId =
          token.companyId as string | undefined
      }
      return session
    },
  },
  pages: {
    signIn: "/login",
  },
})
