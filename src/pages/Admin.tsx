import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { ArrowRight, LogOut, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { Session } from "@supabase/supabase-js";

interface RSSSource {
  id: string;
  name: string;
  url: string;
  active: boolean;
}

const Admin = () => {
  const [sources, setSources] = useState<RSSSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [newSource, setNewSource] = useState({ name: "", url: "" });
  const [session, setSession] = useState<Session | null>(null);
  const [authInitializing, setAuthInitializing] = useState(true);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchSources = useCallback(async () => {
    if (!session) {
      setSources([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('rss_sources')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setSources(data || []);
    } catch (error) {
      console.error('Error fetching sources:', error);
      toast({
        title: "שגיאה",
        description: "לא הצלחנו לטעון את המקורות",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [session, toast]);

  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getSession();
      setSession(data.session);
      setAuthInitializing(false);
    };

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      if (!newSession) {
        setSources([]);
        setLoading(false);
      }
    });

    void init();

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (session) {
      void fetchSources();
    }
  }, [session, fetchSources]);

  const handleAddSource = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!session) return;

    if (!newSource.name || !newSource.url) {
      toast({
        title: "שגיאה",
        description: "יש למלא את כל השדות",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('rss_sources')
        .insert([{ name: newSource.name, url: newSource.url }]);
      
      if (error) throw error;
      
      toast({
        title: "הצלחה",
        description: "המקור נוסף בהצלחה",
      });
      
      setNewSource({ name: "", url: "" });
      fetchSources();
    } catch (error) {
      console.error('Error adding source:', error);
      toast({
        title: "שגיאה",
        description: "לא הצלחנו להוסיף את המקור",
        variant: "destructive",
      });
    }
  };

  const handleToggleActive = async (id: string, currentActive: boolean) => {
    if (!session) return;

    try {
      const { error } = await supabase
        .from('rss_sources')
        .update({ active: !currentActive })
        .eq('id', id);
      
      if (error) throw error;
      
      fetchSources();
      toast({
        title: "עודכן",
        description: currentActive ? "המקור הושבת" : "המקור הופעל",
      });
    } catch (error) {
      console.error('Error toggling source:', error);
      toast({
        title: "שגיאה",
        description: "לא הצלחנו לעדכן את המקור",
        variant: "destructive",
      });
    }
  };

  const handleDeleteSource = async (id: string) => {
    if (!confirm('האם אתה בטוח שברצונך למחוק מקור זה?')) return;

    if (!session) return;

    try {
      const { error } = await supabase
        .from('rss_sources')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      fetchSources();
      toast({
        title: "נמחק",
        description: "המקור נמחק בהצלחה",
      });
    } catch (error) {
      console.error('Error deleting source:', error);
      toast({
        title: "שגיאה",
        description: "לא הצלחנו למחוק את המקור",
        variant: "destructive",
      });
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError(null);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: loginPassword,
      });

      if (error) {
        setLoginError(error.message);
        return;
      }

      toast({
        title: "ברוך הבא",
        description: "התחברת בהצלחה",
      });

      setLoginEmail("");
      setLoginPassword("");
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast({
      title: "התנתקת",
      description: "החיבור נותק בהצלחה",
    });
  };

  const renderLoginCard = () => (
    <Card className="max-w-md mx-auto mt-12">
      <CardHeader>
        <CardTitle>התחברות למערכת</CardTitle>
        <CardDescription>יש להזין את פרטי המשתמש שאושר ב-Supabase</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={handleLogin}>
          <div className="space-y-2">
            <Label htmlFor="admin-email">אימייל</Label>
            <Input
              id="admin-email"
              type="email"
              value={loginEmail}
              onChange={(e) => setLoginEmail(e.target.value)}
              placeholder="admin@example.com"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="admin-password">סיסמה</Label>
            <Input
              id="admin-password"
              type="password"
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>
          {loginError && (
            <p className="text-sm text-destructive">{loginError}</p>
          )}
          <Button type="submit" className="w-full" disabled={loginLoading}>
            {loginLoading ? "מתחבר..." : "התחבר"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-primary text-primary-foreground py-4 px-6 shadow-md">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <h1 className="text-3xl font-bold">ניהול מקורות RSS</h1>
          <Link to="/">
            <Button variant="ghost" className="hover:bg-primary-foreground/10">
              <ArrowRight className="h-5 w-5 ml-2" />
              חזרה לדף הראשי
            </Button>
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto py-8 px-6">
        {authInitializing ? (
          <p className="text-center text-muted-foreground py-8">טוען...</p>
        ) : null}

        {!authInitializing && !session ? renderLoginCard() : null}

        {session && (
          <>
            {/* Add New Source */}
            <Card className="mb-8">
              <CardHeader>
                <CardTitle>הוספת מקור חדש</CardTitle>
                <CardDescription>הוסף מקור RSS חדש לרשימת החדשות</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleAddSource} className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="name">שם המקור</Label>
                      <Input
                        id="name"
                        value={newSource.name}
                        onChange={(e) => setNewSource({ ...newSource, name: e.target.value })}
                        placeholder="לדוגמה: ישראל היום"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="url">כתובת RSS</Label>
                      <Input
                        id="url"
                        type="url"
                        value={newSource.url}
                        onChange={(e) => setNewSource({ ...newSource, url: e.target.value })}
                        placeholder="https://example.com/rss"
                      />
                    </div>
                  </div>
                  <Button type="submit">
                    <Plus className="h-4 w-4 ml-2" />
                    הוסף מקור
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Sources List */}
            <Card>
              <CardHeader>
                <CardTitle>מקורות RSS קיימים</CardTitle>
                <CardDescription>ניהול המקורות הפעילים במערכת</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <p className="text-center text-muted-foreground py-8">טוען...</p>
                ) : sources.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">אין מקורות במערכת</p>
                ) : (
                  <div className="space-y-4">
                    {sources.map((source) => (
                      <div
                        key={source.id}
                        className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-accent/50 transition-colors"
                      >
                        <div className="flex-1 space-y-1">
                          <h3 className="font-semibold">{source.name}</h3>
                          <p className="text-sm text-muted-foreground break-all">{source.url}</p>
                        </div>
                        <div className="flex items-center gap-3 mr-4">
                          <div className="flex items-center gap-2">
                            <Label htmlFor={`active-${source.id}`} className="text-sm">
                              {source.active ? 'פעיל' : 'מושבת'}
                            </Label>
                            <Switch
                              id={`active-${source.id}`}
                              checked={source.active}
                              onCheckedChange={() => handleToggleActive(source.id, source.active)}
                            />
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteSource(source.id)}
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </main>
      {session && (
        <div className="fixed bottom-4 left-4">
          <Button variant="outline" onClick={handleLogout}>
            <LogOut className="h-4 w-4 ml-2" />
            התנתק
          </Button>
        </div>
      )}
    </div>
  );
};

export default Admin;
