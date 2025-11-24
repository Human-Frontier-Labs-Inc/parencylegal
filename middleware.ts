import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isProtectedRoute = createRouteMatcher(["/dashboard(.*)"]);

// Clerk middleware with custom logic for payment redirects and webhook handling
export default clerkMiddleware(async (auth, req) => {
  // Skip auth for Stripe webhook endpoints
  if (req.nextUrl.pathname.startsWith('/api/stripe/webhooks')) {
    console.log("Skipping Clerk auth for Stripe webhook endpoint");
    return NextResponse.next();
  }
  
  // Check for problematic URLs that might cause 431 errors
  // This covers both Clerk handshake params and payment provider redirects
  if (
    req.nextUrl.search && (
      req.nextUrl.search.includes('__clerk_handshake') ||
      req.nextUrl.search.includes('payment_intent') ||
      req.nextUrl.search.includes('checkout_id') ||
      req.nextUrl.search.includes('ref=') ||
      req.nextUrl.search.includes('client_reference_id=')
    )
  ) {
    // The URL contains parameters that might cause 431 errors
    // Instead of just letting it pass through, redirect to a clean URL
    // This prevents the accumulation of large cookies
    
    // Extract the base URL path without query parameters
    const cleanUrl = req.nextUrl.pathname;
    
    // Create a new URL object based on the current request
    const url = new URL(cleanUrl, req.url);
    
    // Important: Add a small cache-busting parameter to ensure the browser doesn't use cached data
    // This helps avoid cookie-related issues without adding significant query string size
    url.searchParams.set('cb', Date.now().toString().slice(-4));
    
    console.log(`Redirecting from problematic URL with large parameters to clean URL: ${url.toString()}`);
    
    // Return a redirect response to the clean URL
    return NextResponse.redirect(url);
  }

  // Handle successful payment redirect after Stripe checkout
  if (req.nextUrl.pathname.startsWith('/dashboard') && req.nextUrl.search.includes('session_id')) {
    const { userId } = auth();

    // If user is authenticated and just returned from Stripe checkout
    if (userId) {
      console.log("User returned from Stripe checkout, cleaning URL");
      const dashboardUrl = new URL('/dashboard', req.url);
      dashboardUrl.searchParams.set('payment', 'success');
      dashboardUrl.searchParams.set('cb', Date.now().toString().slice(-4));
      return NextResponse.redirect(dashboardUrl);
    }
  }

  const { userId, redirectToSignIn } = auth();

  // Standard route protection logic
  if (!userId && isProtectedRoute(req)) {
    // Return to dashboard after login instead of /login to avoid redirect loops
    return redirectToSignIn({ returnBackUrl: req.nextUrl.pathname });
  }

  if (userId && isProtectedRoute(req)) {
    return NextResponse.next();
  }
  
  return NextResponse.next();
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};
