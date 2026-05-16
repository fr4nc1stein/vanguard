import { clerkMiddleware, createRouteMatcher, clerkClient } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

// NOTE: Do NOT add `export const runtime = 'edge'` here.
// Middleware is always edge by default — adding that export makes Next.js
// treat this file as a Page, which breaks the build.

const isTriageRoute    = createRouteMatcher(['/triage(.*)']);
const isAdminPageRoute = createRouteMatcher(['/admin(.*)']); // Page routes only, not API
const isDashboardRoute = createRouteMatcher(['/dashboard(.*)']);
const isSubmitRoute    = createRouteMatcher(['/submit(.*)']);

export default clerkMiddleware(async (auth, request) => {
  // Skip middleware role checks for API routes - they handle auth via requireRole()
  const isApiRoute = request.nextUrl.pathname.startsWith('/api/');
  
  if (isTriageRoute(request) && !isApiRoute) {
    // Triage route - TRIAGER or ADMIN
    const { userId } = await auth.protect();
    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    const role = (user.publicMetadata as { role?: string })?.role;
    if (role !== 'ADMIN' && role !== 'TRIAGER') {
      return NextResponse.redirect(new URL('/', request.url));
    }
  }
  if (isAdminPageRoute(request) && !isApiRoute) {
    // Admin page route - ADMIN only
    const { userId } = await auth.protect();
    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    const role = (user.publicMetadata as { role?: string })?.role;
    if (role !== 'ADMIN') {
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
