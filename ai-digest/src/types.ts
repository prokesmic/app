export type SourceKind = "author" | "lab" | "papers" | "podcast" | "aggregator";

export interface SourceDef {
  id: string;
  name: string;
  kind: SourceKind;
  /** RSS/Atom feed URL. Omitted for non-RSS collectors (e.g. Hacker News). */
  feed?: string;
  /** Relative weight applied during heuristic prefiltering. */
  weight: number;
  /** If true, the collector mines outbound links from item descriptions (annotated show notes). */
  mineLinks?: boolean;
}

export interface Candidate {
  /** Stable dedup key derived from the canonical URL. */
  key: string;
  url: string;
  title: string;
  author?: string;
  sourceId: string;
  sourceName: string;
  sourceKind: SourceKind;
  publishedAt?: string; // ISO 8601
  /** Plain-text snippet (description/summary), already stripped of HTML. */
  summary?: string;
  /** How many distinct sources surfaced this URL — corroboration signal. */
  corroboration: number;
}

export interface ScoredCandidate extends Candidate {
  score: number; // 0-100
  reason: string;
}

export interface TasteProfile {
  generatedAt: string;
  summary: string;
  topics: { name: string; weight: number }[];
  keywords: string[];
  preferredAuthors: string[];
  preferredDomains: string[];
}

export interface SeenStore {
  /** url key -> ISO date first seen */
  items: Record<string, string>;
}
