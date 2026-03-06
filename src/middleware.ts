export { default } from "next-auth/middleware";

export const config = {
  matcher: [
    "/overview/:path*",
    "/finops/:path*",
    "/security/:path*",
    "/reliability/:path*",
    "/inventory/:path*",
    "/reports/:path*",
  ],
};
