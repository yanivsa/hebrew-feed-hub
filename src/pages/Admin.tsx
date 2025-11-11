import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { ArrowRight, Check, Pencil, Plus, Trash2, X } from "lucide-react";
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
  const [editingSourceId, setEditingSourceId] = useState<string | null>(null);
  const [editingValues, setEditingValues] = useState({ name: "", url: "" });
  const { toast } = useToast();

  const fetchSources = async () => {
    try {
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
  };

  useEffect(() => {
    fetchSources();
  }, []);

  const handleAddSource = async (e: React.FormEvent) => {
    e.preventDefault();
    
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
        .insert([{ name: newSource.name.trim(), url: newSource.url.trim() }]);
      
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

  const beginEditing = (source: RSSSource) => {
    setEditingSourceId(source.id);
    setEditingValues({ name: source.name, url: source.url });
  };

  const cancelEditing = () => {
    setEditingSourceId(null);
    setEditingValues({ name: "", url: "" });
  };

  const handleUpdateSource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSourceId) {
      return;
    }

    const trimmedName = editingValues.name.trim();
    const trimmedUrl = editingValues.url.trim();

    if (!trimmedName || !trimmedUrl) {
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
        .update({ name: trimmedName, url: trimmedUrl })
        .eq('id', editingSourceId);

      if (error) throw error;

      toast({
        title: "עודכן",
        description: "המקור עודכן בהצלחה",
      });

      cancelEditing();
      fetchSources();
    } catch (error) {
      console.error('Error updating source:', error);
      toast({
        title: "שגיאה",
        description: "לא הצלחנו לעדכן את המקור",
        variant: "destructive",
      });
    }
  };

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
                {sources.map((source) => {
                  const isEditing = editingSourceId === source.id;

                  return (
                    <div
                      key={source.id}
                      className="p-4 border border-border rounded-lg hover:bg-accent/50 transition-colors"
                    >
                      <form
                        onSubmit={handleUpdateSource}
                        className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between"
                      >
                        <div className="flex-1 space-y-2">
                          {isEditing ? (
                            <>
                              <div className="space-y-1">
                                <Label htmlFor={`name-${source.id}`}>שם המקור</Label>
                                <Input
                                  id={`name-${source.id}`}
                                  value={editingValues.name}
                                  onChange={(event) =>
                                    setEditingValues((prev) => ({ ...prev, name: event.target.value }))
                                  }
                                />
                              </div>
                              <div className="space-y-1">
                                <Label htmlFor={`url-${source.id}`}>כתובת RSS</Label>
                                <Input
                                  id={`url-${source.id}`}
                                  type="url"
                                  value={editingValues.url}
                                  onChange={(event) =>
                                    setEditingValues((prev) => ({ ...prev, url: event.target.value }))
                                  }
                                />
                              </div>
                            </>
                          ) : (
                            <>
                              <h3 className="font-semibold">{source.name}</h3>
                              <p className="text-sm text-muted-foreground break-all">{source.url}</p>
                            </>
                          )}
                        </div>
                        <div className="flex items-center gap-3 md:ml-4">
                          <div className="flex items-center gap-2">
                            <Label htmlFor={`active-${source.id}`} className="text-sm">
                              {source.active ? 'פעיל' : 'מושבת'}
                            </Label>
                            <Switch
                              id={`active-${source.id}`}
                              checked={source.active}
                              onCheckedChange={() => handleToggleActive(source.id, source.active)}
                              disabled={isEditing}
                            />
                          </div>
                          {isEditing ? (
                            <div className="flex items-center gap-2">
                              <Button type="submit" size="icon" variant="default">
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button type="button" size="icon" variant="ghost" onClick={cancelEditing}>
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => beginEditing(source)}
                                className="hover:bg-primary/10"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeleteSource(source.id)}
                                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </form>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Admin;
