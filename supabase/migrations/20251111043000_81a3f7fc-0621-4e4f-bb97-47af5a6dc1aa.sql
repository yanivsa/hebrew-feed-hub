-- Create RSS sources table
CREATE TABLE public.rss_sources (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.rss_sources ENABLE ROW LEVEL SECURITY;

-- Create policy to allow everyone to read active RSS sources
CREATE POLICY "Anyone can view active RSS sources" 
ON public.rss_sources 
FOR SELECT 
USING (active = true);

-- Create policy to allow anyone to insert RSS sources (for admin page)
CREATE POLICY "Anyone can insert RSS sources" 
ON public.rss_sources 
FOR INSERT 
WITH CHECK (true);

-- Create policy to allow anyone to update RSS sources
CREATE POLICY "Anyone can update RSS sources" 
ON public.rss_sources 
FOR UPDATE 
USING (true);

-- Create policy to allow anyone to delete RSS sources
CREATE POLICY "Anyone can delete RSS sources" 
ON public.rss_sources 
FOR DELETE 
USING (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_rss_sources_updated_at
BEFORE UPDATE ON public.rss_sources
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert some default Israeli news sources
INSERT INTO public.rss_sources (name, url) VALUES
('ישראל היום', 'https://www.israelhayom.co.il/feed'),
('מעריב', 'https://www.maariv.co.il/Rss/RssFeedsMivzakim'),
('ynet', 'https://www.ynet.co.il/Integration/StoryRss2.xml'),
('הארץ', 'https://www.haaretz.co.il/cmlink/1.1617826'),
('כלכליסט', 'https://www.calcalist.co.il/GeneralRSS/0,16335,,00.xml'),
('וואלה', 'https://rss.walla.co.il/feed/1?type=main'),
('ערוץ 7', 'https://www.inn.co.il/Rss.aspx');
