import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { RefreshCw, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

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
        setNews(data.items);
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

  const formatTime = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      return `${hours}:${minutes} ${day}/${month}`;
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-primary text-primary-foreground py-4 px-6 shadow-md">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-3xl font-bold">מרכז החדשות של ישראל</h1>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm opacity-90">
              עדכון אחרון: {lastUpdate.toLocaleTimeString('he-IL')}
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
