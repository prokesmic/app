/** A raw listing scraped from a marketplace, before scoring. */
export interface Listing {
  /** Stable unique id: `${source}:${detailId}` */
  id: string;
  source: string;
  title: string;
  /** Absolute URL to the ad detail page. */
  url: string;
  /** Price in CZK, or null if it could not be parsed. */
  priceCzk: number | null;
  /** Free-text description / teaser shown in the result list. */
  description: string;
  /** Thumbnail image URL, if any. */
  image: string | null;
}

/** The outcome of scoring a listing against the buyer profile. */
export interface ScoreResult {
  score: number;
  /** True only for finds worth pushing to Telegram. */
  excellent: boolean;
  /** Hard rule that disqualified the listing, if any. */
  rejectedReason: string | null;
  /** Human-readable bullet points explaining the verdict. */
  reasons: string[];
  /** Parsed signals, useful for debugging/reporting. */
  signals: {
    brand: string | null;
    model: string | null;
    size: string | null;
    sizeMatch: boolean;
    groupset: string | null;
    elevenSpeed: boolean;
    electronic: boolean;
    twelveSpeed: boolean;
    discreetColor: boolean;
    likeNew: boolean;
  };
}

export interface ScoredListing extends Listing {
  result: ScoreResult;
}

/** A marketplace adapter. */
export interface Source {
  name: string;
  /** Build the list of search/listing URLs to fetch for this run. */
  buildUrls(): string[];
  /** Parse fetched HTML into raw listings. */
  parse(html: string, pageUrl: string): Listing[];
}
