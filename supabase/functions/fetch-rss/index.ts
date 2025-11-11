import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RSSItem {
  title: string;
  link: string;
  pubDate: string;
  source: string;
}

function normalizePubDate(rawDate: string | null): Date | null {
  if (!rawDate) {
    return null;
  }

  const trimmedDate = rawDate.trim();
  if (!trimmedDate) {
    return null;
  }

  const directParse = Date.parse(trimmedDate);
  if (!Number.isNaN(directParse)) {
    return new Date(directParse);
  }

  // Some feeds omit the timezone suffix (e.g. `2024-06-15T10:30:00`). Try to
  // parse them as UTC by appending a "Z" designator.
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(trimmedDate)) {
    const utcParse = Date.parse(`${trimmedDate}Z`);
    if (!Number.isNaN(utcParse)) {
      return new Date(utcParse);
    }
  }

  console.warn(`Unable to parse publication date: ${trimmedDate}`);
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
    const matches = text.matchAll(itemRegex);
    const twentyFourHoursAgo = Date.now() - 24 * 60 * 60 * 1000;

    for (const match of matches) {
      const itemContent = match[1];
      
      // Extract title
      const titleMatch = itemContent.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
      const title = titleMatch ? titleMatch[1].replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1').trim() : '';
      
      // Extract link
      const linkMatch = itemContent.match(/<link[^>]*>([\s\S]*?)<\/link>/i);
      const link = linkMatch ? linkMatch[1].replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1').trim() : '';
      
      // Extract pubDate
      const dateMatch = itemContent.match(/<pubDate[^>]*>([\s\S]*?)<\/pubDate>/i);
      const parsedDate = normalizePubDate(dateMatch ? dateMatch[1] : null);

      if (!parsedDate) {
        console.warn(`Skipping item with invalid date from ${sourceName}: ${title}`);
        continue;
      }

      if (parsedDate.getTime() < twentyFourHoursAgo) {
        continue;
      }

      if (title && link) {
        items.push({
          title: title.replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>'),
          link: link,
          pubDate: parsedDate.toISOString(),
          source: sourceName,
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
      for (const source of sources) {
        const items = await parseRSSFeed(source.url, source.name);
        allItems.push(...items);
      }
    }

    // Sort by date (newest first)
    allItems.sort((a, b) => {
      const dateA = new Date(a.pubDate).getTime();
      const dateB = new Date(b.pubDate).getTime();
      return dateB - dateA;
    });

    console.log(`Total items fetched: ${allItems.length}`);

    return new Response(
      JSON.stringify({ items: allItems }),
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
