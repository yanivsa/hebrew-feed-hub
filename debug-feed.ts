
const SUPABASE_URL = "https://ipcqgzxibyswowtputdm.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlwY3FnenhpYnlzd293dHB1dGRtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI4MjkzOTAsImV4cCI6MjA3ODQwNTM5MH0.gudQpBKhKhunR67WAGQNvoECakOKS2GlAMmy6E58RoY";
const PROBLEMATIC_UTC_SOURCES = ["ישראל היום", "וואלה"];

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

interface DebugItem {
  timestampUtc?: number;
  timestamp?: number;
  pubDate: string;
  source: string;
  title: string;
  [key: string]: unknown;
}

const resolveTimestamp = (item: DebugItem) => {
  if (typeof item.timestampUtc === "number" && Number.isFinite(item.timestampUtc)) {
    return item.timestampUtc;
  }
  if (typeof item.timestamp === "number" && Number.isFinite(item.timestamp)) {
    return item.timestamp;
  }
  return Date.parse(item.pubDate);
};

const prepareNewsItems = (items: DebugItem[]) => {
  const normalized = items
    .map((item) => {
      const rawTimestamp = resolveTimestamp(item);
      const timestamp = applyTimezoneFix(rawTimestamp, item.source);
      return { ...item, timestamp };
    })
    .filter((item) => Number.isFinite(item.timestamp));

  normalized.sort((a, b) => b.timestamp - a.timestamp!);
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
