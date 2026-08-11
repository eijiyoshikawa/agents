import { auth } from "@/lib/auth"
import { NextResponse } from "next/server"

export default auth((req) => {
  const { pathname } = req.nextUrl
  const isLoggedIn = !!req.auth

  // 保護されたルート
  const seekerRoutes = ["/mypage"]
  const companyRoutes = ["/company/dashboard", "/company/jobs", "/company/applications", "/company/scouts", "/company/billing"]
  const adminRoutes = ["/admin"]

  const isSeekerRoute = seekerRoutes.some((r) => pathname.startsWith(r))
  const isCompanyRoute = companyRoutes.some((r) => pathname.startsWith(r))
  const isAdminRoute = adminRoutes.some((r) => pathname.startsWith(r))

  if ((isSeekerRoute || isCompanyRoute || isAdminRoute) && !isLoggedIn) {
    return NextResponse.redirect(new URL("/login", req.nextUrl))
  }

  if (isCompanyRoute && req.auth?.user?.role !== "company_admin" && req.auth?.user?.role !== "company_member") {
    return NextResponse.redirect(new URL("/login", req.nextUrl))
  }

  if (isAdminRoute && req.auth?.user?.role !== "admin") {
    return NextResponse.redirect(new URL("/", req.nextUrl))
  }

  return NextResponse.next()
})

export const config = {
  matcher: ["/mypage/:path*", "/company/:path*", "/admin/:path*"],
}
