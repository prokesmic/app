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

  /**
   * Only TOP premium brands. Non-premium brands are a hard reject.
   * The first five are the explicitly requested ones; the rest are widely
   * recognised premium race marques added to widen the net.
   */
  brands: [
    "specialized",
    "trek",
    "canyon",
    "cannondale",
    "bmc",
    // Additional top premium race brands
    "cervelo", "cervélo",
    "pinarello",
    "colnago",
    "scott",
    "wilier",
    "factor",
    "look",
    "bianchi",
    "ridley",
    "orbea",
    "giant", // race models only (TCR / Propel) score via raceModels
  ],

  /** Race models close to a Tarmac SL7 geometry get a bonus. */
  raceModels: [
    "tarmac", "venge", "allez sprint", // Specialized
    "emonda", "madone", // Trek
    "ultimate", "aeroad", // Canyon
    "supersix", "super six", "supersix evo", "caad", // Cannondale (CAAD = alu race)
    "teammachine", "team machine", "slr", // BMC
    "soloist", "s5", "s3", "r5", "caledonia", // Cervélo
    "dogma", "prince", "gan", "f8", "f10", "f12", // Pinarello
    "v3rs", "v4rs", "c64", "c68", "v2-r", // Colnago
    "addict", "foil", // Scott
    "zero", "cento", "filante", // Wilier
    "o2", "ostro", // Factor
    "795", "785", "blade", // Look
    "oltre", "sprint rc", "specialissima", // Bianchi
    "noah", "helium", "fenix sl", // Ridley
    "orca", // Orbea
    "tcr", "propel", // Giant
  ],

  /** Endurance/comfort geometry — penalised (not what the rider wants). */
  enduranceModels: [
    "domane", "roubaix", "synapse", "endurace", "defy", "roadmachine",
  ],

  /**
   * CONFIRMED 11-speed signals. Required for an "excellent" verdict because
   * the trainer has an 11s cassette. R7000/5800 = 105 11s, R8000/6800 =
   * Ultegra 11s; the explicit "11s / 11 rychlostí" tokens are unambiguous.
   */
  confirmedElevenSignals: [
    "11s", "11 s", "11-speed", "11 speed", "11 rychlost", "11rychlost",
    "11 rychlosti", "2x11", "11 kol", "11k",
    "r7000", "105 r7000", "5800", // Shimano 105 11s
    "r8000", "ultegra r8000", "6800", // Shimano Ultegra 11s
  ],

  /**
   * Ambiguous groupset mentions: a bare "105" or "Ultegra" could be a 10-speed
   * (5700 / 6700) on an older bike. Worth a small bonus and a "verify" note,
   * but NOT enough on its own to be flagged excellent.
   */
  ambiguousGroupsetSignals: ["105", "ultegra"],

  /**
   * 10-speed — hard reject. Incompatible with the 11s cassette on the trainer,
   * just like 12-speed. 5700 = 105 10s, 6700 = Ultegra 10s.
   */
  tenSpeedSignals: [
    "10s", "10 speed", "10-speed", "10 rychlost", "10rychlost", "10 rychlosti",
    "2x10", "5700", "6700", "5600", "6600", "105 5700", "ultegra 6700",
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

  /**
   * Not a road race bike — hard reject. Premium brands also make MTBs,
   * cyclocross, gravel-cross, trekking and city bikes; the rider wants a
   * road race bike (silniční) for the trainer, so filter those out.
   */
  nonRoadSignals: [
    "horske kolo", "horske kola", "horsky", "mtb", "29er", "29\"", "27,5", "27.5",
    "26\"", "celoodpruzen", "hardtail", "hard tail",
    "cyklokros", "cyclocross", "cross country", "krosove", "krosove", "crossove",
    "trekove", "trekingove", "trekingovy", "treking", "mestske kolo", "mestsky",
    "city bike", "elektrokolo", "ebike", "e-bike", "e bike", "elektrokola",
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
