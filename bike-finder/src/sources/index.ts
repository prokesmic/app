import type { Source } from "../types.js";
import { bazos } from "./bazos.js";
import { cyklobazar } from "./cyklobazar.js";
import { mtbiker } from "./mtbiker.js";

/** All marketplace adapters the agent scans. */
export const sources: Source[] = [bazos, cyklobazar, mtbiker];
