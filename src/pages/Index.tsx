import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { RefreshCw, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { APP_VERSION } from "@/config/version";

interface NewsItem {
  title: string;
  link: string;
  pubDate: string;
  source: string;
}

const Index = () => {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const { toast } = useToast();

  const fetchNews = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke('fetch-rss');

      if (error) throw error;

      if (data?.items) {
        const twentyFourHoursAgo = Date.now() - 24 * 60 * 60 * 1000;

        const sanitizedItems = (data.items as NewsItem[])
          .map((item) => {
            const parsedDate = Date.parse(item.pubDate);
            return {
              ...item,
              parsedDate,
            };
          })
          .filter((item) => !Number.isNaN(item.parsedDate))
          .filter((item) => item.parsedDate >= twentyFourHoursAgo)
          .sort((a, b) => b.parsedDate - a.parsedDate)
          .map(({ parsedDate, ...rest }) => rest);

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
  };

  useEffect(() => {
    fetchNews();
    
    // Auto-refresh every minute
    const interval = setInterval(() => {
      fetchNews();
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  const timeFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat('he-IL', {
        timeZone: 'Asia/Jerusalem',
        hour: '2-digit',
        minute: '2-digit',
        day: '2-digit',
        month: '2-digit',
      }),
    []
  );

  const formatTime = (dateStr: string) => {
    if (!dateStr) {
      return '—';
    }

    const parsed = Date.parse(dateStr);
    if (Number.isNaN(parsed)) {
      return dateStr;
    }

    return timeFormatter.format(new Date(parsed));
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-primary text-primary-foreground py-4 px-6 shadow-md">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold">מרכז החדשות של ישראל</h1>
              <p className="text-xs font-medium opacity-80">גרסה: {APP_VERSION}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm opacity-90">
              עדכון אחרון: {lastUpdate.toLocaleTimeString('he-IL', { timeZone: 'Asia/Jerusalem' })}
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
            {news.map((item, index) => (
              <div
                key={`${item.link}-${index}`}
                className="flex items-start gap-4 py-2 px-4 hover:bg-accent/50 rounded transition-colors border-b border-border"
              >
                <div className="text-sm text-time-text whitespace-nowrap min-w-[90px]">
                  {formatTime(item.pubDate)}
                </div>
                <div className="text-sm font-medium text-foreground/70 whitespace-nowrap min-w-[100px]">
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
              </div>
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
