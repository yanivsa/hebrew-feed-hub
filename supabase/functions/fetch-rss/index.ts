import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { DateTime } from 'https://esm.sh/luxon@3.5.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type ParseStrategy = "explicit" | "inferred";

interface RSSItem {
  title: string;
  link: string;
  pubDate: string;
  source: string;
  timestamp: number;
  timestampUtc: number;
  displayTime: string;
  sourceTimeZone?: string;
  parseStrategy: ParseStrategy;
}

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;
const DEFAULT_FEED_ZONE = 'Asia/Jerusalem';
const DISPLAY_FORMAT = 'HH:mm dd/LL';
const DATE_TAGS = ['pubDate', 'updated', 'dc:date', 'published'];
const MAX_FUTURE_DRIFT_MS = 10 * 60 * 1000; // 10 minutes
const DATE_DEVIATION_WARNING_MINUTES = 180;
const MAX_CONCURRENT_FEEDS = 5;
const ISRAELI_DOMAINS = [
  'ynet.co.il',
  'walla.co.il',
  'israelhayom.co.il',
  'maariv.co.il',
  'haaretz.co.il',
  'n12.co.il',
  'mako.co.il',
  'inn.co.il',
  'srugim.co.il',
  'globes.co.il',
  'bhol.co.il',
  'calcalist.co.il',
  'channel7',
];
const TIMEZONE_ABBREVIATIONS: Record<string, string> = {
  IDT: DEFAULT_FEED_ZONE,
  IST: DEFAULT_FEED_ZONE,
  IDST: DEFAULT_FEED_ZONE,
  EET: 'Europe/Athens',
  EEST: 'Europe/Athens',
  AST: DEFAULT_FEED_ZONE,
};
const XML_ENTITY_MAP: Record<string, string> = {
  '&quot;': '"',
  '&apos;': "'",
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&amp;quot;': '"',
  '&amp;apos;': "'",
  '&amp;lt;': '<',
  '&amp;gt;': '>',
};
const TAG_REGEX_CACHE = new Map<string, RegExp>();

function cleanCdata(value: string) {
  return value.replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1').trim();
}

function decodeXmlEntities(value: string) {
  return value.replace(
    /&amp;(?:quot|apos|lt|gt);|&quot;|&apos;|&amp;|&lt;|&gt;/g,
    (match) => XML_ENTITY_MAP[match] ?? match,
  );
}

function getTagRegex(tag: string) {
  const cached = TAG_REGEX_CACHE.get(tag);
  if (cached) {
    return cached;
  }
  const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i');
  TAG_REGEX_CACHE.set(tag, regex);
  return regex;
}

function extractTagContent(itemContent: string, tagNames: string[]): string | null {
  for (const tag of tagNames) {
    const regex = getTagRegex(tag);
    const match = itemContent.match(regex);
    if (match) {
      return cleanCdata(match[1]);
    }
  }
  return null;
}

function extractTimeFromDateString(dateString: string): string | null {
  // Extract time and date directly from date string
  // Supports formats like:
  // - "Thu, 13 Nov 2025 21:51:00 GMT"
  // - "Wed, 12 Nov 2025 21:19:00 GMT"
  // - "13 Nov 2025 21:51:00 GMT"
  // - ISO format: "2025-11-13T21:51:00Z"
  // - ISO format with timezone: "2025-11-13T21:51:00+00:00"

  // Try RFC 2822 / HTTP format first
  const rfc2822Match = dateString.match(/(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{4})\s+(\d{1,2}):(\d{2}):(\d{2})/i);
  if (rfc2822Match) {
    const day = rfc2822Match[1].padStart(2, "0");
    const monthName = rfc2822Match[2];
    const hours = rfc2822Match[4].padStart(2, "0");
    const minutes = rfc2822Match[5];

    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const monthIndex = monthNames.findIndex(m => m.toLowerCase() === monthName.toLowerCase());
    const month = monthIndex >= 0 ? (monthIndex + 1).toString().padStart(2, "0") : "";

    if (month) {
      return `${hours}:${minutes} ${day}/${month}`;
    }
  }

  // Try ISO format: "2025-11-13T21:51:00Z" or "2025-11-13T21:51:00+00:00"
  const isoMatch = dateString.match(/(\d{4})-(\d{2})-(\d{2})[T\s]+(\d{1,2}):(\d{2}):(\d{2})/);
  if (isoMatch) {
    const year = isoMatch[1];
    const month = isoMatch[2];
    const day = isoMatch[3];
    const hours = isoMatch[4].padStart(2, "0");
    const minutes = isoMatch[5];

    return `${hours}:${minutes} ${day}/${month}`;
  }

  return null;
}

function toDisplayFormat(dt: DateTime, zone: string) {
  return dt.setZone(zone, { keepLocalTime: true }).toFormat(DISPLAY_FORMAT);
}

function hasExplicitTimezone(value: string) {
  return /(?:GMT|UTC|Z|[+-]\d{2}:?\d{2})/i.test(value);
}

function inferZone(link: string, sourceName: string) {
  try {
    const host = new URL(link).host.toLowerCase();
    if (ISRAELI_DOMAINS.some((domain) => host.includes(domain))) {
      return DEFAULT_FEED_ZONE;
    }
  } catch {
    // ignore
  }

  const normalizedSource = sourceName.toLowerCase();
  if (['ynet', 'וואלה', 'ישראל היום', 'מעריב', 'mako', 'הארץ', 'ynetnews'].some((name) => normalizedSource.includes(name))) {
    return DEFAULT_FEED_ZONE;
  }
  return undefined;
}

function extractTimezoneAbbreviation(value: string) {
  const match = value.match(/\b([A-Z]{2,5})\b/g);
  if (!match) {
    return null;
  }

  for (const token of match.reverse()) {
    const normalizedToken = token.toUpperCase();
    if (TIMEZONE_ABBREVIATIONS[normalizedToken]) {
      const sanitized = value.replace(new RegExp(`\\b${token}\\b`), "").replace(/\s{2,}/g, " ").trim();
      return {
        sanitizedValue: sanitized,
        zone: TIMEZONE_ABBREVIATIONS[normalizedToken],
      };
    }
  }

  return null;
}

function buildParserAttempts(value: string, zoneHint?: string) {
  const attempts = [
    zoneHint ? DateTime.fromRFC2822(value, { zone: zoneHint }) : DateTime.fromRFC2822(value, { setZone: true }),
    zoneHint ? DateTime.fromHTTP(value, { zone: zoneHint }) : DateTime.fromHTTP(value, { setZone: true }),
    zoneHint ? DateTime.fromISO(value, { zone: zoneHint }) : DateTime.fromISO(value, { setZone: true }),
    DateTime.fromFormat(value, "ccc, dd LLL yyyy HH:mm:ss 'GMT'", { zone: 'UTC' }),
  ];

  const fallbackZone = zoneHint ?? DEFAULT_FEED_ZONE;
  attempts.push(DateTime.fromFormat(value, 'dd/MM/yyyy HH:mm:ss', { zone: fallbackZone }));
  attempts.push(
    (() => {
      const jsDate = new Date(value);
      if (Number.isNaN(jsDate.getTime())) {
        return DateTime.invalid('Invalid JS Date');
      }
      return DateTime.fromJSDate(jsDate, { zone: fallbackZone });
    })(),
  );

  return attempts;
}

function normalizeToFallbackZone(dt: DateTime, explicitZone: boolean, fallbackZone?: string) {
  if (!explicitZone && fallbackZone) {
    return dt.setZone(fallbackZone, { keepLocalTime: true });
  }

  return dt;
}

function logDateDeviation(rawDate: string, timestampUtc: number, sourceName: string) {
  const parsedRaw = Date.parse(rawDate);
  if (Number.isNaN(parsedRaw)) {
    return;
  }

  const diffMinutes = Math.abs(parsedRaw - timestampUtc) / (60 * 1000);
  if (diffMinutes >= DATE_DEVIATION_WARNING_MINUTES) {
    console.warn(
      `Large delta (${diffMinutes.toFixed(1)}m) between pubDate and normalized time for ${sourceName}`,
      rawDate,
    );
  }
}

function extractAtomLink(itemContent: string): string | null {
  const linkTagRegex = /<link\b([^>]*)>/gi;
  let fallback: string | null = null;

  for (const match of itemContent.matchAll(linkTagRegex)) {
    const attributes = match[1];
    const hrefMatch = attributes.match(/href=["']([^"']+)["']/i);
    if (!hrefMatch) {
      continue;
    }

    const relMatch = attributes.match(/rel=["']([^"']+)["']/i);
    const rel = relMatch?.[1]?.toLowerCase();

    if (!rel || rel === "alternate") {
      return cleanCdata(hrefMatch[1]);
    }

    if (!fallback) {
      fallback = cleanCdata(hrefMatch[1]);
    }
  }

  return fallback;
}

function clampFutureTimestamp(timestamp: number, zone: string, canClamp: boolean) {
  if (!canClamp) {
    return timestamp;
  }

  const nowInZone = DateTime.now().setZone(zone);
  const maxFuture = nowInZone.plus({ milliseconds: MAX_FUTURE_DRIFT_MS });
  const parsedInZone = DateTime.fromMillis(timestamp).setZone(zone);

  if (parsedInZone > maxFuture) {
    return maxFuture.minus({ milliseconds: 1 }).toUTC().toMillis();
  }

  return timestamp;
}

function parseFeedDate(
  rawDate: string | null,
  link: string,
  sourceName: string,
): { timestampUtc: number; displayTime: string; sourceTimeZone?: string; parseStrategy: ParseStrategy } | null {
  if (!rawDate) {
    return null;
  }

  const trimmed = cleanCdata(rawDate);
  const sanitizedVariants = new Set<string>();
  sanitizedVariants.add(trimmed);
  sanitizedVariants.add(trimmed.replace(/\s+/g, ' '));

  const explicitZone = hasExplicitTimezone(trimmed);
  const abbreviation = explicitZone ? null : extractTimezoneAbbreviation(trimmed);
  if (abbreviation) {
    sanitizedVariants.add(abbreviation.sanitizedValue);
  }
  const inferredZone = explicitZone ? undefined : abbreviation?.zone ?? inferZone(link, sourceName);
  const fallbackZone = explicitZone ? undefined : inferredZone ?? DEFAULT_FEED_ZONE;

  for (const variant of sanitizedVariants) {
    const parsers = buildParserAttempts(variant, inferredZone);
    for (const dt of parsers) {
      if (dt.isValid) {
        const normalizedDate = normalizeToFallbackZone(dt, explicitZone, fallbackZone);
        const zoneForDisplay = explicitZone
          ? normalizedDate.zoneName || 'UTC'
          : fallbackZone ?? DEFAULT_FEED_ZONE;
        const timestampUTC = normalizedDate.toUTC().toMillis();
        const clampedTimestamp = clampFutureTimestamp(
          timestampUTC,
          zoneForDisplay,
          !explicitZone && Boolean(fallbackZone),
        );
        logDateDeviation(trimmed, clampedTimestamp, sourceName);

        // Always try to extract time directly from original string first
        // This ensures we show the original time without timezone conversion
        let displayTime: string;
        const extractedTime = extractTimeFromDateString(trimmed);
        if (extractedTime) {
          displayTime = extractedTime;
        } else {
          // Fallback to formatted time only if extraction fails
          displayTime = toDisplayFormat(normalizedDate, zoneForDisplay);
        }

        return {
          timestampUtc: clampedTimestamp,
          displayTime: displayTime,
          sourceTimeZone: zoneForDisplay,
          parseStrategy: explicitZone ? "explicit" : "inferred",
        };
      }
    }
  }

  console.warn(`Unable to parse publication date: ${trimmed}`);
  return null;
}

function validateSourceUrl(url: string, sourceName: string): URL | null {
  try {
    const parsedUrl = new URL(url);
    if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
      console.warn(`Skipping ${sourceName}: unsupported protocol ${parsedUrl.protocol}`);
      return null;
    }
    return parsedUrl;
  } catch (error) {
    console.warn(`Skipping ${sourceName}: invalid URL`, error);
    return null;
  }
}

async function parseRSSFeed(url: string, sourceName: string): Promise<RSSItem[]> {
  const normalizedUrl = validateSourceUrl(url, sourceName);
  if (!normalizedUrl) {
    return [];
  }

  try {
    console.log(`Fetching RSS from: ${normalizedUrl.toString()}`);
    const response = await fetch(normalizedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    if (!response.ok) {
      console.error(`Failed to fetch ${sourceName}: ${response.status}`);
      return [];
    }

    const text = await response.text();

    // Parse XML manually (basic parsing)
    const items: RSSItem[] = [];
    const itemRegex = /<item[^>]*>([\s\S]*?)<\/item>/gi;
    const entryRegex = /<entry[^>]*>([\s\S]*?)<\/entry>/gi;
    const matches = text.matchAll(itemRegex);
    const entryMatches = text.matchAll(entryRegex);
    const twentyFourHoursAgo = Date.now() - TWENTY_FOUR_HOURS_MS;

    for (const match of matches) {
      const itemContent = match[1];

      const title = extractTagContent(itemContent, ['title']) ?? '';
      const link = extractTagContent(itemContent, ['link']) ?? '';
      const dateString = extractTagContent(itemContent, DATE_TAGS);
      const parsedDate = parseFeedDate(dateString, link, sourceName);

      if (!parsedDate) {
        console.warn(`Skipping item with invalid date from ${sourceName}: ${title}`);
        continue;
      }

      if (parsedDate.timestampUtc < twentyFourHoursAgo) {
        continue;
      }

      if (title && link) {
        items.push({
          title: decodeXmlEntities(title),
          link,
          pubDate: dateString ?? '',
          source: sourceName,
          timestamp: parsedDate.timestampUtc,
          timestampUtc: parsedDate.timestampUtc,
          displayTime: parsedDate.displayTime,
          sourceTimeZone: parsedDate.sourceTimeZone,
          parseStrategy: parsedDate.parseStrategy,
        });
      }
    }

    for (const match of entryMatches) {
      const entryContent = match[1];

      const title = extractTagContent(entryContent, ['title']) ?? '';
      const link = extractAtomLink(entryContent) ?? extractTagContent(entryContent, ['link']) ?? '';
      const dateString = extractTagContent(entryContent, ['published', 'updated']);
      const parsedDate = parseFeedDate(dateString, link, sourceName);

      if (!parsedDate) {
        console.warn(`Skipping Atom entry with invalid date from ${sourceName}: ${title}`);
        continue;
      }

      if (parsedDate.timestampUtc < twentyFourHoursAgo) {
        continue;
      }

      if (title && link) {
        items.push({
          title: decodeXmlEntities(title),
          link,
          pubDate: dateString ?? '',
          source: sourceName,
          timestamp: parsedDate.timestampUtc,
          timestampUtc: parsedDate.timestampUtc,
          displayTime: parsedDate.displayTime,
          sourceTimeZone: parsedDate.sourceTimeZone,
          parseStrategy: parsedDate.parseStrategy,
        });
      }
    }

    // Parse Sitemap XML (e.g. Hamal)
    const urlRegex = /<url[^>]*>([\s\S]*?)<\/url>/gi;
    const urlMatches = text.matchAll(urlRegex);

    for (const match of urlMatches) {
      const urlContent = match[1];

      // Extract title from <news:title>
      let title = extractTagContent(urlContent, ['news:title']);

      // If no title found, try to infer from link or use a default
      if (!title) {
        continue;
      }

      const link = extractTagContent(urlContent, ['loc']) ?? '';

      // Extract date from <news:publication_date> or <lastmod>
      const dateString = extractTagContent(urlContent, ['news:publication_date', 'lastmod']);
      const parsedDate = parseFeedDate(dateString, link, sourceName);

      if (!parsedDate) {
        console.warn(`Skipping Sitemap item with invalid date from ${sourceName}: ${title}`);
        continue;
      }

      if (parsedDate.timestampUtc < twentyFourHoursAgo) {
        continue;
      }

      // Cleanup title if it comes from slug-like format
      if (title && !title.includes(' ') && title.includes('-')) {
        title = title.replace(/-/g, ' ');
      }

      if (title && link) {
        items.push({
          title: decodeXmlEntities(title),
          link,
          pubDate: dateString ?? '',
          source: sourceName,
          timestamp: parsedDate.timestampUtc,
          timestampUtc: parsedDate.timestampUtc,
          displayTime: parsedDate.displayTime,
          sourceTimeZone: parsedDate.sourceTimeZone,
          parseStrategy: parsedDate.parseStrategy,
        });
      }
    }

    console.log(`Parsed ${items.length} items from ${sourceName}`);
    return items;
  } catch (error) {
    console.error(`Error parsing RSS from ${sourceName}:`, error);
    return [];
  }
}

function sortAndValidateItems(items: RSSItem[]): RSSItem[] {
  if (items.length <= 1) {
    return items;
  }

  const sorted = [...items].sort((a, b) => b.timestamp - a.timestamp);

  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i - 1].timestamp < sorted[i].timestamp) {
      console.warn(
        `Detected out-of-order items between "${sorted[i - 1].title}" and "${sorted[i].title}". Re-sorting applied.`,
      );
      break;
    }
  }

  return sorted;
}

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  if (items.length === 0) {
    return [];
  }

  const results = new Array<R>(items.length);
  let nextIndex = 0;
  const workerCount = Math.min(limit, items.length);
  const workers = Array.from({ length: workerCount }, async () => {
    while (true) {
      const currentIndex = nextIndex++;
      if (currentIndex >= items.length) {
        break;
      }
      results[currentIndex] = await fn(items[currentIndex], currentIndex);
    }
  });

  await Promise.all(workers);
  return results;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get all active RSS sources
    const { data: sources, error: sourcesError } = await supabase
      .from('rss_sources')
      .select('*')
      .eq('active', true);

    if (sourcesError) {
      throw sourcesError;
    }

    console.log(`Found ${sources?.length || 0} active RSS sources`);

    // Fetch all RSS feeds
    const allItems: RSSItem[] = [];

    if (sources) {
      const results = await mapWithConcurrency(
        sources,
        MAX_CONCURRENT_FEEDS,
        (source) => parseRSSFeed(source.url, source.name),
      );
      for (const items of results) {
        allItems.push(...items);
      }
    }

    // Sort by date (newest first)
    const sortedItems = sortAndValidateItems(allItems);

    console.log(`Total items fetched: ${sortedItems.length}`);

    return new Response(
      JSON.stringify({ items: sortedItems }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error in fetch-rss function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
