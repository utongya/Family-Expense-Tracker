"use client";

export function navigateAfterAuth() {
  // Reload the server-rendered dashboard with the new session, not a prefetched demo.
  // eslint-disable-next-line @next/next/no-location-assign-relative-destination
  window.location.assign("/");
}
