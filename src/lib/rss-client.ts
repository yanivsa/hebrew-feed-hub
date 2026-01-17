import type { FetchNewsResponse } from "@/types/news";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error(
    "Missing Supabase configuration. Please set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY.",
  );
}

const buildFunctionUrl = () => {
  const normalizedBase = SUPABASE_URL.endsWith("/")
    ? SUPABASE_URL.slice(0, -1)
    : SUPABASE_URL;
  return `${normalizedBase}/functions/v1/fetch-rss`;
};

const FUNCTION_URL = buildFunctionUrl();

export const fetchLatestNews = async () => {
  const response = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
  });

  if (!response.ok) {
    const errorPayload = await response.text();
    throw new Error(
      `Failed to fetch news (${response.status}): ${errorPayload || "Unknown error"}`,
    );
  }

  return (await response.json()) as FetchNewsResponse;
};
