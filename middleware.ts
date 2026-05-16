import { clerkMiddleware, createRouteMatcher, clerkClient } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

// NOTE: Do NOT add `export const runtime = 'edge'` here.
// Middleware is always edge by default — adding that export makes Next.js
// treat this file as a Page, which breaks the build.

const isAdminRoute     = createRouteMatcher(['/admin(.*)', '/api/admin(.*)']);
const isDashboardRoute = createRouteMatcher(['/dashboard(.*)']);
const isSubmitRoute    = createRouteMatcher(['/submit(.*)']);
const isApiReportRoute = createRouteMatcher(['/api/reports(.*)']);

export default clerkMiddleware(async (auth, request) => {
  if (isAdminRoute(request)) {
    // Must be authenticated
    const { userId } = await auth.protect();
    // Fetch live user data from Clerk — sessionClaims JWT does not include
    // publicMetadata by default, so we read it directly from the Clerk API.
    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    const role = (user.publicMetadata as { role?: string })?.role;
    if (role !== 'ADMIN' && role !== 'TRIAGER') {
      return NextResponse.redirect(new URL('/', request.url));
    }
  }
  if (isDashboardRoute(request)) await auth.protect();
  if (isSubmitRoute(request))    await auth.protect();

  return NextResponse.next();
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};
