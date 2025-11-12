-- Harden rss_sources policies now that the table exists.
DROP POLICY IF EXISTS "Anyone can view active RSS sources" ON public.rss_sources;
DROP POLICY IF EXISTS "Anyone can insert RSS sources" ON public.rss_sources;
DROP POLICY IF EXISTS "Anyone can update RSS sources" ON public.rss_sources;
DROP POLICY IF EXISTS "Anyone can delete RSS sources" ON public.rss_sources;

-- Allow read-only access to active sources for anonymous users.
CREATE POLICY "Anonymous users can read active sources"
ON public.rss_sources
FOR SELECT
USING (active = true);

-- Restrict management operations (insert/update/delete) to authenticated users.
CREATE POLICY "Authenticated users can manage RSS sources"
ON public.rss_sources
FOR ALL
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');
