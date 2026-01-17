export interface NewsItem {
  title: string;
  link: string;
  pubDate: string;
  source: string;
  timestamp: number;
  timestampUtc?: number;
  displayTime?: string;
  sourceTimeZone?: string;
  parseStrategy?: "explicit" | "inferred";
}

export interface FetchNewsResponse {
  items?: NewsItem[];
}
