-- Deactivate all feeds first to ensure clean slate or selective update
-- UPDATE rss_sources SET active = false;

-- Consolidate and Insert/Update Feeds
INSERT INTO rss_sources (name, url, active) VALUES
-- Mivzakim Feeds (Existing & New)
('מעריב', 'https://www.maariv.co.il/rss/rssfeedsmivzakichadashot', true),
('ynet', 'https://www.ynet.co.il/Integration/StoryRss1854.xml', true),
('וואלה', 'https://rss.walla.co.il/feed/22', true), -- Changed to Mivzakim feed
('כיכר השבת', 'https://www.kikar.co.il/mivzakim/rss.xml', true), -- New
('0404', 'https://www.0404.co.il/feed', true), -- New
('רוטר', 'https://rotter.net/rss/rotternews.xml', true), -- New
('חמ״ל', 'https://hamal.co.il/sitemap/new-items.xml', true), -- New
('סרוגים', 'https://www.srugim.co.il/feed', true), -- New
-- General Feeds (No specific Mivzakim found, keeping general)
('ישראל היום', 'https://www.israelhayom.co.il/rss.xml', true),
('הארץ', 'https://www.haaretz.co.il/srv/rss---feedly', true),
('ערוץ 7', 'https://www.inn.co.il/Rss.aspx', true)
-- ('כלכליסט', 'https://www.calcalist.co.il/GeneralRSS/0,16335,,00.xml', true) -- REMOVED per user request
ON CONFLICT (url) DO UPDATE SET active = true, name = EXCLUDED.name;

-- Ensure Calcalist is disabled
UPDATE rss_sources SET active = false WHERE name = 'כלכליסט';
