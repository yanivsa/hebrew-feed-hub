-- Drop existing policies
DROP POLICY IF EXISTS "Anyone can view active RSS sources" ON public.rss_sources;
DROP POLICY IF EXISTS "Anyone can insert RSS sources" ON public.rss_sources;
DROP POLICY IF EXISTS "Anyone can update RSS sources" ON public.rss_sources;
DROP POLICY IF EXISTS "Anyone can delete RSS sources" ON public.rss_sources;

-- Create new secure policies
-- Anyone can view active RSS sources (for the public news feed)
CREATE POLICY "Anyone can view active RSS sources"
ON public.rss_sources
FOR SELECT
USING (active = true);

-- Only authenticated users can insert RSS sources
CREATE POLICY "Authenticated users can insert RSS sources"
ON public.rss_sources
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Only authenticated users can update RSS sources
CREATE POLICY "Authenticated users can update RSS sources"
ON public.rss_sources
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Only authenticated users can delete RSS sources
CREATE POLICY "Authenticated users can delete RSS sources"
ON public.rss_sources
FOR DELETE
TO authenticated
USING (true);

-- Admins need to view all sources (including inactive ones) in admin panel
CREATE POLICY "Authenticated users can view all RSS sources"
ON public.rss_sources
FOR SELECT
TO authenticated
USING (true);