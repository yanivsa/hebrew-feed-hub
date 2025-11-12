import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { RefreshCw, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { APP_VERSION_LABEL, APP_RELEASE_LABEL } from "@/version";

interface NewsItem {
  title: string;
  link: string;
  pubDate: string;
  source: string;
  timestamp: number;
  timestampUtc?: number;
  displayTime?: string;
  sourceTimeZone?: string;
  parseStrategy?: "explicit" | "inferred";
}

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

const parsePubDateMs = (value: string | undefined) => {
  if (!value) {
    return Number.NaN;
  }
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? Number.NaN : parsed;
};

const getCanonicalTimestamp = (item: Pick<NewsItem, "timestamp" | "timestampUtc">) => {
  if (typeof item.timestampUtc === "number" && Number.isFinite(item.timestampUtc)) {
    return item.timestampUtc;
  }

  if (typeof item.timestamp === "number" && Number.isFinite(item.timestamp)) {
    return item.timestamp;
  }

  return Number.NaN;
};

const resolveTimestamp = (item: Pick<NewsItem, "pubDate" | "timestamp" | "timestampUtc">) => {
  const pubDateTimestamp = parsePubDateMs(item.pubDate);
  if (Number.isFinite(pubDateTimestamp)) {
    return pubDateTimestamp;
  }

  return getCanonicalTimestamp(item);
};

const prepareNewsItems = (items: NewsItem[]) => {
  const oneDayAgo = Date.now() - ONE_DAY_MS;

  const normalized = items
    .map((item) => {
      const timestamp = resolveTimestamp(item);

      return {
        ...item,
        timestamp,
      };
    })
    .filter((item) => Number.isFinite(item.timestamp))
    .filter((item) => item.timestamp >= oneDayAgo);

  const dedupedMap = new Map<string, NewsItem>();
  for (const item of normalized) {
    const key = `${item.link}-${item.timestamp}`;
    if (!dedupedMap.has(key)) {
      dedupedMap.set(key, item);
    }
  }

  const deduped = Array.from(dedupedMap.values());
  deduped.sort((a, b) => b.timestamp - a.timestamp);

  for (let i = 1; i < deduped.length; i++) {
    if (deduped[i - 1].timestamp < deduped[i].timestamp) {
      console.warn(
        "Detected unsorted feed segment. Forced reorder applied.",
        deduped[i - 1],
        deduped[i],
      );
      break;
    }
  }

  return deduped;
};

const FALLBACK_TIME_ZONE = "Asia/Jerusalem";
const displayFormatter = new Intl.DateTimeFormat("he-IL", {
  hour: "2-digit",
  minute: "2-digit",
  day: "2-digit",
  month: "2-digit",
  hour12: false,
  timeZone: FALLBACK_TIME_ZONE,
});

const formatTime = (timestamp: number) => {
  const parts = displayFormatter.formatToParts(new Date(timestamp));
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";

  const hours = value("hour").padStart(2, "0");
  const minutes = value("minute").padStart(2, "0");
  const day = value("day").padStart(2, "0");
  const month = value("month").padStart(2, "0");
  return `${hours}:${minutes} ${day}/${month}`;
};

const extractTimeFromPubDate = (pubDate: string | undefined): string => {
  if (!pubDate) {
    return "";
  }

  // Try to extract time and date directly from pubDate string
  // Format: "Wed, 12 Nov 2025 21:19:00 GMT"
  const timeMatch = pubDate.match(/(\d{1,2}):(\d{2}):(\d{2})/);
  const dateMatch = pubDate.match(/(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{4})/i);
  
  if (timeMatch && dateMatch) {
    const hours = timeMatch[1].padStart(2, "0");
    const minutes = timeMatch[2];
    const day = dateMatch[1].padStart(2, "0");
    
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const monthIndex = monthNames.findIndex(m => m.toLowerCase() === dateMatch[2].toLowerCase());
    const month = monthIndex >= 0 ? (monthIndex + 1).toString().padStart(2, "0") : "";
    
    if (month) {
      return `${hours}:${minutes} ${day}/${month}`;
    }
  }

  return "";
};

const normalizedDisplayTime = (item: Pick<NewsItem, "timestamp" | "timestampUtc" | "displayTime" | "pubDate">) => {
  const trimmedServerValue = (item.displayTime ?? "").trim();
  if (trimmedServerValue.length > 0) {
    return trimmedServerValue;
  }

  // Try to extract time directly from pubDate first
  const extractedTime = extractTimeFromPubDate(item.pubDate);
  if (extractedTime) {
    return extractedTime;
  }

  const pubDateTimestamp = parsePubDateMs(item.pubDate);
  if (Number.isFinite(pubDateTimestamp)) {
    return formatTime(pubDateTimestamp);
  }

  const canonicalTimestamp = getCanonicalTimestamp(item);
  if (Number.isFinite(canonicalTimestamp)) {
    return formatTime(canonicalTimestamp);
  }

  return "";
};

const buildPubDateTitle = (item: Pick<NewsItem, "pubDate" | "sourceTimeZone" | "parseStrategy">) => {
  if (!item.pubDate) {
    return "תאריך מקורי לא סופק";
  }

  const zone = item.sourceTimeZone ? ` (${item.sourceTimeZone})` : "";
  const strategy =
    item.parseStrategy === "explicit"
      ? "זוהה מתאריך המקור"
      : item.parseStrategy === "inferred"
        ? "הוסק לפי מקור"
        : "מידע חלקי";

  return `pubDate${zone} • ${strategy}: ${item.pubDate}`;
};

const Index = () => {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const lastUpdateDisplay = useMemo(() => {
    const hours = lastUpdate.getHours().toString().padStart(2, '0');
    const minutes = lastUpdate.getMinutes().toString().padStart(2, '0');
    const day = lastUpdate.getDate().toString().padStart(2, '0');
    const month = (lastUpdate.getMonth() + 1).toString().padStart(2, '0');
    return `${hours}:${minutes} ${day}/${month}`;
  }, [lastUpdate]);
  const { toast } = useToast();

  const fetchNews = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke('fetch-rss');

      if (error) throw error;

      if (data?.items) {
        const sanitizedItems = prepareNewsItems(data.items as NewsItem[]);
        setNews(sanitizedItems);
        setLastUpdate(new Date());
      }
    } catch (error) {
      console.error('Error fetching news:', error);
      toast({
        title: "שגיאה",
        description: "לא הצלחנו לטעון את החדשות",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchNews();
    
    // Auto-refresh every minute
    const interval = setInterval(() => {
      fetchNews();
    }, 60000);

    return () => clearInterval(interval);
  }, [fetchNews]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-primary text-primary-foreground py-4 px-6 shadow-md">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex flex-col">
              <h1 className="text-3xl font-bold leading-tight">מרכז החדשות של ישראל</h1>
              <span className="text-xs text-primary-foreground/90">{APP_RELEASE_LABEL}</span>
            </div>
            <span className="inline-flex items-center rounded-full bg-primary-foreground/20 px-3 py-1 text-xs font-semibold text-primary-foreground">
              {APP_VERSION_LABEL}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm opacity-90">
              עדכון אחרון: {lastUpdateDisplay}
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={fetchNews}
              disabled={loading}
              className="hover:bg-primary-foreground/10"
            >
              <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            <Link to="/admin">
              <Button variant="ghost" size="icon" className="hover:bg-primary-foreground/10">
                <Settings className="h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* News Feed */}
      <main className="max-w-7xl mx-auto py-6 px-6">
        {loading && news.length === 0 ? (
          <div className="text-center py-12">
            <RefreshCw className="h-12 w-12 animate-spin mx-auto text-muted-foreground" />
            <p className="mt-4 text-muted-foreground">טוען חדשות...</p>
          </div>
        ) : (
          <div className="space-y-1">
            {news.map((item) => (
              <article
                key={`${item.link}-${item.timestamp}`}
                className="grid grid-cols-[130px_140px_1fr] items-center gap-4 py-2 px-4 border-b border-border hover:bg-accent/40 transition-colors"
              >
                <div
                  className="text-base font-semibold text-blue-900 font-mono tracking-tight text-right whitespace-nowrap"
                  dir="ltr"
                  title={buildPubDateTitle(item)}
                >
                  {normalizedDisplayTime(item)}
                </div>
                <div className="text-sm font-bold text-foreground/80 text-right">
                  {item.source}
                </div>
                <div className="flex-1">
                  <a
                    href={item.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-news-link hover:text-news-link-hover hover:underline transition-colors"
                  >
                    {item.title}
                  </a>
                </div>
              </article>
            ))}
          </div>
        )}

        {!loading && news.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">אין חדשות להצגה</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default Index;
