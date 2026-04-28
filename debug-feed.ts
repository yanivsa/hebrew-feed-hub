
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const PROBLEMATIC_UTC_SOURCES = ["ישראל היום", "וואלה"];

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error("Error: VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY environment variables are required.");
  console.error("Run with: VITE_SUPABASE_URL=... VITE_SUPABASE_PUBLISHABLE_KEY=... bun debug-feed.ts");
  process.exit(1);
}

const FUNCTION_URL = `${SUPABASE_URL}/functions/v1/fetch-rss`;

// --- LOGIC FROM Index.tsx ---

const applyTimezoneFix = (timestamp: number, source: string) => {
  if (!source) return timestamp;
  const normalizedSource = source.trim();
  if (!PROBLEMATIC_UTC_SOURCES.some(s => normalizedSource.includes(s))) {
    return timestamp;
  }

  // Simplified version of the fix for the debug script (Israel is currently UTC+2)
  // In the real app, we use Intl.DateTimeFormat to detect 2 vs 3 hours.
  const offsetHours = 2;
  return timestamp - (offsetHours * 60 * 60 * 1000);
};

const resolveTimestamp = (item: Record<string, unknown>) => {
  if (typeof item.timestampUtc === "number" && Number.isFinite(item.timestampUtc)) {
    return item.timestampUtc;
  }
  if (typeof item.timestamp === "number" && Number.isFinite(item.timestamp)) {
    return item.timestamp;
  }
  return Date.parse(item.pubDate as string);
};

const prepareNewsItems = (items: Array<Record<string, unknown>>) => {
  const normalized = items
    .map((item) => {
      const rawTimestamp = resolveTimestamp(item);
      const timestamp = applyTimezoneFix(rawTimestamp, item.source);
      return { ...item, timestamp };
    })
    .filter((item) => Number.isFinite(item.timestamp));

  normalized.sort((a, b) => b.timestamp - a.timestamp);
  return normalized;
};

// --- EXECUTION ---

async function debug() {
  try {
    const response = await fetch(FUNCTION_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
    });

    const data = await response.json();
    const sortedItems = prepareNewsItems(data.items);

    console.log("TOP 20 ITEMS AFTER FIX:");
    sortedItems.slice(0, 20).forEach((item, index) => {
      const time = new Date(item.timestamp).toLocaleTimeString('he-IL', { timeZone: 'Asia/Jerusalem' });
      console.log(`${index + 1}. [${time}] ${item.source.padEnd(12)} | ${item.title}`);
    });

    const israelHayomIdx = sortedItems.findIndex(i => i.source.includes("ישראל היום") && i.title.includes("ברקוביץ"));
    const channel7Idx = sortedItems.findIndex(i => i.source.includes("ערוץ 7") && i.title.includes("נוביק"));

    console.log("\nVERIFICATION:");
    console.log(`Channel 7 (20:00) Index: ${channel7Idx}`);
    console.log(`Israel Hayom (18:05) Index: ${israelHayomIdx}`);

    if (channel7Idx < israelHayomIdx) {
      console.log("SUCCESS: Channel 7 is ABOVE Israel Hayom.");
    } else {
      console.log("FAILURE: Israel Hayom is still above Channel 7.");
    }

  } catch (e) {
    console.error(e);
  }
}

debug();
