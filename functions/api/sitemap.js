// This endpoint used to serve a hand-maintained, hardcoded sitemap that fell
// stale (198 URLs, last updated months ago) while the real sitemap at
// /sitemap.xml grew to thousands of entries as new games shipped. Redirect
// here permanently so any existing links (including search engines that
// cached this URL from robots.txt) land on the real, current sitemap.
export async function onRequestGet() {
  return Response.redirect('https://games.multiportllc.com/sitemap.xml', 301);
}
