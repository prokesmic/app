/**
 * Buyer profile — the single source of truth for what counts as a match.
 *
 * Encodes the request: a premium road bike to live permanently on a
 * Garmin Tacx Neo (Motion Plates) trainer, with an 11-speed Shimano cassette
 * already fitted. So the bike MUST use 11-speed *mechanical* shifting
 * (ideally Shimano 105 R7000 / Ultegra R8000); electronic and 12-speed
 * groupsets are deal-breakers because the cassette wouldn't match.
 */
export const profile = {
  budgetCzk: 30000,

  /** Rider 190 cm -> frame L / 58 (race fit). 56 accepted as a near-fit. */
  size: {
    letters: ["xl", "l"],
    /** Numeric cm sizes, in priority order. */
    idealCm: [58, 56, 60, 59, 57],
    /** A 56 still fits but is the bottom of the range. */
    acceptCm: [56, 57, 58, 59, 60, 61],
  },

  /** Only TOP premium brands. Non-premium brands are a hard reject. */
  brands: [
    "specialized",
    "trek",
    "canyon",
    "cannondale",
    "bmc",
  ],

  /** Race models close to a Tarmac SL7 geometry get a bonus. */
  raceModels: [
    "tarmac", // Specialized
    "allez sprint",
    "emonda", // Trek
    "madone",
    "ultimate", // Canyon
    "aeroad",
    "supersix", "super six", "supersix evo", // Cannondale
    "caad", // alu race (CAAD10/12/13) — Tarmac-like geo
    "teammachine", "team machine", "slr", // BMC
  ],

  /** Endurance/comfort geometry — penalised (not what the rider wants). */
  enduranceModels: [
    "domane", "roubaix", "synapse", "endurace", "defy", "roadmachine",
  ],

  /** Positive 11-speed mechanical signals. */
  goodGroupsets: [
    "105 r7000", "r7000", "105", // Shimano 105 11s
    "ultegra r8000", "r8000", "ultegra", // Shimano Ultegra 11s
    "6800", "5800", // older 11s Ultegra/105
    "11s", "11 s", "11-speed", "11 speed", "11 rychlost", "11rychlost",
    "2x11", "11 kol", "11k",
  ],

  /** Electronic shifting — hard reject (rider wants mechanical). */
  electronicSignals: [
    "di2", "etap", "e-tap", "axs", "eps", "elektronicke", "elektronicky",
    "elektro razeni", "electronic",
  ],

  /** 12-speed — hard reject (incompatible with the 11s cassette on the trainer). */
  twelveSpeedSignals: [
    "12s", "12 s", "12-speed", "12 speed", "12 rychlost", "12rychlost",
    "2x12", "r7100", "r8100", "r9200", "105 di2", "12 kol",
  ],

  /** Discreet colours the rider prefers. */
  discreetColors: [
    "cerna", "cerne", "cerny", "matna", "mat cerna", "matte", "black",
    "tmave seda", "seda", "grey", "gray", "antracit", "anthracite",
    "raw", "stealth", "carbon", "uhlikova",
  ],

  /** Loud colours that count against the discreet preference. */
  loudColors: [
    "cervena", "cervene", "red", "modra", "blue", "zluta", "yellow",
    "zelena", "green", "ruzova", "pink", "oranzova", "orange", "bila", "white",
  ],

  /** "Almost new" condition signals. */
  likeNewSignals: [
    "zanovni", "jako nove", "jako novy", "nove", "novy", "nejete",
    "nejety", "nepouzite", "nenasazene", "top stav", "bezvadny stav",
    "perfektni stav", "naajeto", "naajeti",
  ],

  /** Score needed to be flagged "excellent" (push to Telegram). */
  excellentThreshold: 7,
} as const;

/** Runtime/agent settings (env-overridable). */
export const settings = {
  /** Minutes between scans in daemon mode. */
  intervalMinutes: Number(process.env.SCAN_INTERVAL_MINUTES ?? 30),
  /** Polite delay between HTTP requests (ms). */
  requestDelayMs: Number(process.env.REQUEST_DELAY_MS ?? 1500),
  /** EUR->CZK conversion for € listings. */
  eurToCzk: Number(process.env.EUR_TO_CZK ?? 25),
  telegram: {
    token: process.env.TELEGRAM_BOT_TOKEN ?? "",
    chatId: process.env.TELEGRAM_CHAT_ID ?? "",
  },
  statePath: process.env.STATE_PATH ?? "state/seen.json",
};
