# תוכנית תיקון ופריסה - Hebrew Feed Hub

## מצב נוכחי
בוצעו שינויים בקוד המקור ובסקריפטים של מסד הנתונים כדי לתמוך במקורות חדשות נוספים ("מבזקים") ופורמטים חדשים (Sitemap XML).
השינויים נמצאים ב-Git (`main` branch) ונפרסים אוטומטית ל-Cloudflare (Frontend).
עם זאת, **הרכיבים בצד השרת (Supabase) דורשים עדכון ידני**.

## 1. עדכון מסד הנתונים (SQL)
יש להריץ את הסקריפט הבא ב-Supabase SQL Editor כדי להוסיף את מקורות המבזקים החדשים (רוטר, חמ"ל, 0404 וכו'):

*קובץ מקור:* `supabase/seed_feeds.sql`

```sql
INSERT INTO rss_sources (name, url, active) VALUES
('מעריב', 'https://www.maariv.co.il/rss/rssfeedsmivzakichadashot', true),
('ynet', 'https://www.ynet.co.il/Integration/StoryRss1854.xml', true),
('וואלה', 'https://rss.walla.co.il/feed/22', true),
('כיכר השבת', 'https://www.kikar.co.il/mivzakim/rss.xml', true),
('0404', 'https://www.0404.co.il/feed', true),
('רוטר', 'https://rotter.net/rss/rotternews.xml', true),
('חמ״ל', 'https://hamal.co.il/sitemap/new-items.xml', true),
('סרוגים', 'https://www.srugim.co.il/feed', true),
('ישראל היום', 'https://www.israelhayom.co.il/rss.xml', true),
('הארץ', 'https://www.haaretz.co.il/srv/rss---feedly', true),
('ערוץ 7', 'https://www.inn.co.il/Rss.aspx', true)
ON CONFLICT (url) DO UPDATE SET active = true, name = EXCLUDED.name;

-- נטרול כלכליסט (לפי בקשה לחדשות נטו)
UPDATE rss_sources SET active = false WHERE name = 'כלכליסט';
```

## 2. עדכון פונקציית הקצה (Edge Function)
הפונקציה `fetch-rss` עודכנה לתמיכה ב-Sitemap XML (עבור אתר חמ"ל). יש לפרוס אותה מחדש.

**פקודת פריסה (טרמינל):**
```bash
npx supabase functions deploy fetch-rss --project-ref ipcqgzxibyswowtputdm
```

**אלטרנטיבה ידנית:**
להעתיק את תוכן הקובץ `supabase/functions/fetch-rss/index.ts` ולהדביק אותו בעורך הפונקציות בלוח הבקרה של Supabase.

## 3. בדיקת תקינות (Verification)
לאחר ביצוע שלבים 1 ו-2, יש לרענן את האתר ולוודא:
1.  הופעת המקורות החדשים (רוטר, חמ"ל, 0404) בפיד.
2.  מספר הגרסה בתחתית/כותרת האתר התעדכן ל-`v0.3.7`.
