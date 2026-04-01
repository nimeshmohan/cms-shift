import * as cheerio from "cheerio";

interface DiscoveredUrl {
  url: string;
  title?: string;
}

/**
 * Discover URLs from a domain by:
 * 1. Checking for sitemap.xml
 * 2. Crawling the homepage for internal links
 */
export async function discoverUrls(domain: string): Promise<DiscoveredUrl[]> {
  const normalizedDomain = normalizeDomain(domain);
  const discoveredUrls = new Set<string>();
  const urlsWithTitles: DiscoveredUrl[] = [];

  try {
    // Try to fetch sitemap first
    const sitemapUrls = await fetchSitemap(normalizedDomain);
    sitemapUrls.forEach(url => discoveredUrls.add(url));

    // If no sitemap or very few URLs, crawl the homepage
    if (discoveredUrls.size < 5) {
      const homepageUrls = await crawlPage(normalizedDomain, normalizedDomain);
      homepageUrls.forEach(url => discoveredUrls.add(url));
    }

    // Return all URLs without titles (fetching titles for 5000+ URLs would be too slow)
    // Users can see the URLs and select which ones they want
    const urlsArray = Array.from(discoveredUrls);
    
    return urlsArray.map(url => ({ url }));
  } catch (error) {
    console.error('URL discovery error:', error);
    throw new Error('Failed to discover URLs from domain');
  }
}

/**
 * Normalize domain to include protocol
 */
function normalizeDomain(domain: string): string {
  let normalized = domain.trim();
  
  // Remove trailing slash
  normalized = normalized.replace(/\/$/, '');
  
  // Add protocol if missing
  if (!normalized.startsWith('http://') && !normalized.startsWith('https://')) {
    normalized = 'https://' + normalized;
  }
  
  return normalized;
}

/**
 * Try to fetch and parse sitemap.xml
 */
async function fetchSitemap(domain: string): Promise<string[]> {
  const allUrls: string[] = [];
  
  // Try common sitemap locations
  const sitemapPaths = [
    '/sitemap.xml',
    '/sitemap_index.xml',
    '/sitemap-index.xml',
    '/post-sitemap.xml',
    '/page-sitemap.xml'
  ];

  for (const path of sitemapPaths) {
    try {
      const sitemapUrl = `${domain}${path}`;
      const response = await fetch(sitemapUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; Crawlix/1.0; +https://crawlix.com)'
        }
      });

      if (!response.ok) continue;

      const xml = await response.text();
      const $ = cheerio.load(xml, { xmlMode: true });

      // Check if this is a sitemap index (contains links to other sitemaps)
      const sitemapLocations = $('sitemap > loc').toArray().map(elem => $(elem).text().trim());
      
      if (sitemapLocations.length > 0) {
        // This is a sitemap index - fetch all child sitemaps
        console.log(`Found sitemap index with ${sitemapLocations.length} sitemaps`);
        
        for (const sitemapLoc of sitemapLocations) {
          try {
            const childResponse = await fetch(sitemapLoc, {
              headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; Crawlix/1.0; +https://crawlix.com)'
              }
            });
            
            if (childResponse.ok) {
              const childXml = await childResponse.text();
              const childUrls = parseSitemap(childXml);
              allUrls.push(...childUrls);
              console.log(`Fetched ${childUrls.length} URLs from ${sitemapLoc}`);
            }
          } catch (error) {
            console.error(`Failed to fetch child sitemap: ${sitemapLoc}`, error);
          }
        }
        
        break; // Found sitemap index, no need to check other paths
      } else {
        // This is a regular sitemap
        const urls = parseSitemap(xml);
        
        if (urls.length > 0) {
          allUrls.push(...urls);
          console.log(`Found ${urls.length} URLs from ${sitemapUrl}`);
          break; // Found a working sitemap
        }
      }
    } catch (error) {
      console.error(`Failed to fetch sitemap: ${path}`, error);
      continue;
    }
  }

  return Array.from(new Set(allUrls)); // Remove duplicates
}

/**
 * Parse sitemap XML and extract URLs
 */
function parseSitemap(xml: string): string[] {
  const urls: string[] = [];
  const $ = cheerio.load(xml, { xmlMode: true });

  // Handle standard sitemap
  $('url > loc').each((_, elem) => {
    const url = $(elem).text().trim();
    if (url) urls.push(url);
  });

  // Handle sitemap index (contains links to other sitemaps)
  if (urls.length === 0) {
    $('sitemap > loc').each((_, elem) => {
      const url = $(elem).text().trim();
      if (url) urls.push(url);
    });
  }

  return urls;
}

/**
 * Crawl a page and extract internal links
 */
async function crawlPage(pageUrl: string, baseDomain: string): Promise<string[]> {
  const urls: string[] = [];

  try {
    const response = await fetch(pageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Crawlix/1.0; +https://crawlix.com)'
      }
    });

    if (!response.ok) return urls;

    const html = await response.text();
    const $ = cheerio.load(html);
    const baseUrlObj = new URL(baseDomain);

    // Find all links
    $('a[href]').each((_, elem) => {
      try {
        const href = $(elem).attr('href');
        if (!href) return;

        // Resolve relative URLs
        const absoluteUrl = new URL(href, pageUrl).href;
        const urlObj = new URL(absoluteUrl);

        // Only include URLs from the same domain
        if (urlObj.hostname === baseUrlObj.hostname) {
          // Filter out common non-content URLs
          const path = urlObj.pathname.toLowerCase();
          if (
            !path.includes('/tag/') &&
            !path.includes('/category/') &&
            !path.includes('/author/') &&
            !path.includes('/page/') &&
            !path.includes('#') &&
            !path.endsWith('.xml') &&
            !path.endsWith('.json') &&
            !path.endsWith('.pdf')
          ) {
            urls.push(absoluteUrl);
          }
        }
      } catch {
        // Invalid URL, skip
      }
    });
  } catch (error) {
    console.error('Crawl page error:', error);
  }

  return Array.from(new Set(urls)); // Remove duplicates
}

/**
 * Fetch the title of a page
 */
async function fetchPageTitle(url: string): Promise<string | undefined> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Crawlix/1.0; +https://crawlix.com)'
      }
    });

    if (!response.ok) return undefined;

    const html = await response.text();
    const $ = cheerio.load(html);

    // Try to get title from various sources
    const title = 
      $('title').first().text().trim() ||
      $('meta[property="og:title"]').attr('content') ||
      $('h1').first().text().trim();

    return title || undefined;
  } catch {
    return undefined;
  }
}
