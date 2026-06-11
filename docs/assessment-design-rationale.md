# AI Fluency Assessment (L1–L2) — Design Rationale

**Why the assessment is built the way it is, and why each choice beats the alternatives.**

This document is the defense of the design. Every section follows the same structure: the decision, the argument for it, and why the obvious alternatives fail. It is written to survive scrutiny from three audiences at once: psychometric reviewers ("is it valid?"), business stakeholders ("does it matter?"), and the employees who take it ("is it fair?").

---

## 0. The One-Paragraph Case

The assessment measures **judgment, not feature recall**, because judgment is the only AI competency that survives contact with reality: tools change quarterly, judgment doesn't. It is **scenario-based** because workplace AI failures are failures of application, not of vocabulary. It is **concordance-scored** because expert judgment in this domain is a distribution, not a fact, and pretending otherwise destroys validity. It is **weighted 35/30/25/10 toward mindset** because the binding constraint on organizational AI adoption is how people think, not what buttons they know. And it is **rotation-banked, cooldown-gated, and expiry-bounded** because an assessment that can be gamed, brute-forced, or held forever measures nothing. Each mechanism exists to protect one thing: that the badge means what it claims to mean.

---

## 1. Judgment Over Recall: The Foundational Bet

**Decision:** ~90% of questions are tool-agnostic and test the principle behind the right approach, never which button to press.

**The argument:**

1. **Tool knowledge has a half-life of months; judgment has a half-life of years.** Vendors rename products, restructure UIs, and ship features continuously. A recall-based assessment is partially invalidated by every vendor release — meaning either constant rewrites or silent decay of validity. A judgment-based assessment is invalidated only when the *principles* of working with AI change, which happens on a multi-year timescale. This is not a stylistic preference; it is the only economically sustainable design for a 6-month update cycle (Section 9 of the methodology confirms this: only the 10% Technical dimension needs refresh every cycle).

2. **Tool-agnostic scores are portable, and portability is a hard requirement.** A large international corporation has employees switching tools, new hires arriving from different stacks, and procurement decisions that change the toolset. If competency scores are coupled to a specific tool, every one of those events invalidates data. Decoupling means one assessment, one comparable score, across the whole organization, indefinitely.

3. **Recall is exactly what's cheap now.** Any employee can ask an AI what a feature does. The scarce, valuable skill is knowing *when to use it, when not to, how to verify, and how to integrate it into real work* — which is precisely what cannot be looked up mid-task. Testing recall would measure the one thing AI itself has made worthless.

**Why the alternative fails:** A tool-specific quiz is easier to write and feels more "concrete," but it produces scores that expire with the next product release, can't be compared across teams using different tools, and reward memorization of documentation — the lowest-value behavior the program could possibly incentivize.

**The deliberate exception is principled, not inconsistent:** The 10% Technical Proficiency dimension *does* test the M365 Copilot ecosystem — because tool orchestration ("which specialized capability fits this task?") is itself a judgment skill that can only be tested against a concrete toolset, and M365 Copilot is the organization's actual stack. Even there, questions are multi-select integration scenarios, not feature trivia. The exception is small (10%), quarantined to one dimension, and given the shortest refresh cycle (6 months) — the design acknowledges its own volatility and prices it in.

---

## 2. Scenario-Based Format: Measuring What Predicts Performance

**Decision:** Every question presents a realistic workplace situation requiring a decision.

**The argument:** The failure mode the organization actually cares about is not "employee can't define few-shot prompting." It is "employee ships an unverified AI hallucination to a client," "employee spends 3 hours forcing AI to do a 10-minute manual task," "employee builds an automation around the wrong bottleneck." These are *decisions in context*. Scenario items are the standard instrument for measuring decision quality (this is why medicine uses Script Concordance Testing and situational judgment tests dominate professional selection): they have demonstrably higher predictive validity for on-the-job behavior than knowledge recall, precisely because they sample the behavior itself rather than a proxy for it.

A secondary, underrated benefit: **scenario questions are formative even when failed.** An employee who gets a scenario wrong and reads the rationale has rehearsed a real decision they will face. A failed recall question teaches nothing transferable. The optional per-question feedback (three-layer rationale) converts the assessment into a learning event — doubling the return on the same 30 minutes.

---

## 3. The 35/30/25/10 Weighting: Resources Follow the Thesis

**Decision:** AI Mindset 35%, Applied Skills 30%, Domain Integration 25%, Technical Proficiency 10%.

**The argument:** The framework's core thesis — *AI competency is 90% mindset, built through daily practice* — is either true or it isn't. If it's true, the weighting must reflect it, or the assessment contradicts its own theory of competence. The descending weights encode a causal chain:

- **Mindset (35%)** is the bottleneck. An employee with perfect tool knowledge but no verification reflex is a *liability*; an employee with strong judgment but weak tool knowledge is one tutorial away from being productive. Weight follows risk and leverage.
- **Applied Skills (30%)** is the craft that converts mindset into output — prompt quality, context provision, thinking-partner techniques. It is nearly as important and nearly as durable.
- **Domain Integration (25%)** is where value actually materializes — AI connected to real workflows rather than isolated demos. It weighs less than the first two only because it *depends* on them: integration without judgment automates mistakes.
- **Technical Proficiency (10%)** is deliberately the smallest, for three reinforcing reasons: it is the most learnable on demand, the fastest to obsolesce, and — critically for a **universal** assessment — the least fair to test heavily across a population whose roles vary enormously. A 10% weight means an employee with zero Copilot orchestration skill can still pass on the strength of genuine judgment, but cannot fake overall fluency *through* tool familiarity alone.

**Why equal weighting fails:** 25/25/25/25 would let tool memorization compensate for absent judgment — exactly the trade the framework exists to prevent — and would make a quarter of the universal assessment hostage to vendor release cycles.

---

## 4. Concordance Scoring: Honest About the Nature of Judgment

**Decision:** An expert panel (10–20 practitioners) answers each item independently; the modal response earns 1.0; other responses earn partial credit proportional to expert endorsement.

**The argument:**

1. **Binary scoring asserts a fact; judgment domains contain distributions.** "Should you start a new chat or continue this one?" has a *best* answer and a *defensible* answer. A binary key scores the defensible answer identically to the absurd one — discarding real information and telling a competent employee they were "wrong" when they were merely suboptimal. Partial credit recovers that signal.

2. **The key is calibrated, not authored.** With a single question-writer deciding the key, the assessment measures agreement with one person. With a 10–20 expert panel, the key *is* the empirical expert consensus, and the score has a precise, defensible meaning: *distance from expert judgment*. When a candidate disputes an item, the answer is not "the author says so" but "17 of 20 practitioners chose this" — which is what bulletproof looks like under appeal.

3. **It is the established instrument for exactly this problem.** Script Concordance Testing was developed in medical education for the identical situation: assessing reasoning under uncertainty where experts legitimately vary. Adopting it is not novelty; it is using the right tool.

**Why the alternative fails:** Binary scoring is simpler to explain but produces noisier scores (information thrown away), indefensible item disputes (author's-opinion-as-fact), and a false message that AI judgment is a lookup table — undermining the very mindset the assessment promotes.

---

## 5. The 100-Question Bank with ~30-Question Rotation

**Decision:** Each ~30-minute session draws ~30 questions from a 100-question bank, preserving dimension weights, capped at 2 questions per competency, with full coverage guarantees (every competency ≥2 bank questions).

**The argument:**

1. **30 minutes is the honest maximum for a mandatory universal assessment.** Longer and completion rates collapse (the >85% completion KPI becomes unreachable); shorter and dimension-level scores lose reliability. ~27 single-select at ~1 minute plus ~3 multi-select at ~3 minutes lands precisely at the budget — the format mix is arithmetic, not accident.

2. **A 3.3:1 bank-to-session ratio makes answer-sharing structurally worthless.** Two colleagues taking the test simultaneously see different questions; a retaker after 30 days sees a substantially different set. This converts the social dynamic from "share the answer key" (which kills a fixed test instantly in a large organization) into "discuss the concepts" — which is *learning*, the program's actual goal. The anti-gaming measure doubles as a pedagogical feature.

3. **Constrained randomness preserves fairness.** Pure random draw could give one candidate 5 questions on their weakest competency and another zero. The balancing constraints (dimension weights held constant, ≤2 per competency, no competency absent) guarantee every session is a parallel form of the same test — different items, same construct, comparable scores.

4. **The bank is also the maintenance unit.** Individual questions can be retired, replaced, or flagged (via the per-question 👍/👎 reactions and discrimination-index monitoring) without invalidating the assessment. A fixed 30-question test has no such graceful degradation: one leaked or broken item compromises the whole instrument.

---

## 6. Anti-Gaming: Engineered and Empirically Verified

**Decision:** Six systematic techniques — rotation, length independence, sophisticated distractors, thorough-sounding traps, position variation, designer notes — validated by adversarial simulation.

**The argument:** The critical move here is not the techniques (any test designer lists those); it is that **the design was attacked before deployment and the results published.** Every mechanical strategy was simulated against the full bank: longest-answer scores 30%, every fixed-position strategy lands 36–47%, the best mechanical strategy (shortest-answer, 49%) still fails — and sits 41 points below the badge threshold. Position distribution is measured (19/21/21/22 across A–D), not assumed.

This converts anti-gaming from a claim into a **falsifiable, monitored property**: it is a standing KPI (longest-answer must stay <50%), re-checkable on every bank version. The distractor design also does double duty: "thorough-sounding traps" (professional language, named methodologies, comprehensive multi-step processes that miss the point) don't just defeat gamers — they specifically catch the candidate who has learned to *sound* AI-fluent without the underlying judgment, which is the most common and most dangerous false positive in corporate AI programs.

**Why this matters more here than in most assessments:** the badge gates the L3+ technical track and feeds organizational dashboards that drive the 2028 Lighthouse Goal. Gamed scores wouldn't just inflate individuals — they would corrupt the organization's map of its own capability. The anti-gaming investment is proportional to what the score is *used for*.

---

## 7. The 90% Threshold, 30-Day Cooldown, and 18-Month Expiry

**Decision:** AI Enthusiast at ≥90%; one attempt per 30 days (admin-overridable); badge valid 18 months.

**The argument:**

- **90% is high because the badge is a gate, not a participation trophy.** It is the prerequisite for L3+ — levels where employees build automations and autonomous systems that act on the organization's behalf. The cost of a false positive at that gate (someone building agents without a verification reflex) vastly exceeds the cost of a false negative (someone retakes in 30 days). Concordance partial credit also softens what 90% means in practice: it does not require modal-perfect answers on every item, only consistently expert-aligned judgment. And the threshold is made *humane* by the surrounding system: unlimited retakes, a generated learning path targeting exactly the gaps found, and a measured expectation (<30% of passers need 2+ attempts) that keeps the bar accountable to data.
- **30 days is the minimum interval at which a retake measures learning rather than memory or luck.** Shorter cooldowns invite brute-forcing the bank and re-encountering remembered items; 30 days plus rotation means a retake is statistically a fresh parallel form taken by a person who has had time to actually practice. The >60% retake-improvement KPI exists to verify this works. The admin override preserves flexibility for legitimate exceptions without weakening the default.
- **18 months matches the decay rate of the construct.** The dimension validity analysis (mindset ~3 years, skills/integration 12–18 months, technical 6 months) puts the weighted average validity of the *blend* at roughly 18 months. A permanent badge would assert that AI fluency in 2026 still means fluency in 2030 — obviously false. Annual expiry would over-tax the stable 65% (mindset + most of applied skills). 18 months is where the math lands.

---

## 8. Two-Agent Generation Pipeline with Human Authority

**Decision:** A generator agent produces candidates; a *separate* evaluator agent — with no access to the generator's reasoning — validates them against the criteria; a human panel makes the final call.

**The argument:**

1. **Scale demands AI generation.** A 100-question bank, semi-annual refresh, dimension-specific decay (Technical every 6 months), and a coverage floor (every competency ≥2 items) add up to a content production load that pure human authoring cannot sustain at consistent quality.
2. **Separation is the integrity mechanism.** A model evaluating its own output inherits its own blind spots — self-validation bias is the known failure mode of single-agent pipelines. Blinding the evaluator to the generator's reasoning forces the question to stand on its artifact alone, exactly as it will before a candidate. The evaluator's checklist mirrors the design contract item-for-item (tests the mapped competency, defensible concordance labels, anti-gaming compliance, level-appropriate difficulty, no bank overlap) — so every published question has been audited against every design principle in this document.
3. **Humans retain authority because the assessment must be accountable.** AI validation is a quality *gate* that filters; the human content panel *decides*. When an employee challenges an item, the organization can point to a named human review, not an algorithm. The 60–80% evaluator acceptance-rate KPI even monitors the pipeline itself: too high means the evaluator is a rubber stamp, too low means the generator is miscalibrated.

This is also a credibility argument no alternative can make: **an AI fluency program whose own content pipeline demonstrates AI-with-human-oversight best practice is practicing what it tests.** L2-19 teaches "define what the assistant should refuse before what it should do" — and the pipeline itself is built that way.

---

## 9. Three-Layer Content Architecture: Maintainability as Validity

**Decision:** Content is normalized into Dimension → Competency → Question layers; feedback is assembled from all three at display time.

**The argument:** This is database normalization applied to assessment content, and it solves a real failure mode: duplicated guidance drifting out of sync. Multiple questions map to each competency; if the transferable principle and tool hint lived on each question, a tool change would require finding and editing every affected item — guaranteeing staleness somewhere. Instead, each fact lives exactly once at the layer matching its volatility:

| Layer | Volatility | Update event |
|---|---|---|
| Dimension (focus/target/developing) | Years | Framework revision |
| Competency (guidance, tool hint) | Quarterly | Tool change → edit **one** `toolHint`, every mapped question updates |
| Question (scenario, options, rationale) | Semi-annual | Bank refresh |

Maintainability *is* validity here: stale feedback ("use the Researcher agent" after it's renamed) silently erodes user trust in the whole instrument. The architecture makes staleness structurally hard instead of relying on editorial vigilance.

The same separation powers the import system: Excel sheets map one-to-one onto layers, 17 validation rules plus atomic all-or-nothing publishing mean the live bank is never in a half-updated state, and bank versioning pins every historical attempt to the exact content it was scored against — preserving score comparability forever.

---

## 10. Permanent History, Versioned Banks, and KPI-Bounded Claims

**Decision:** Every attempt is stored permanently with per-question detail, bank version, and tool-usage survey; the program publishes 20+ KPIs with numeric targets.

**The argument:**

- **Single scores are snapshots; the organization needs trajectories.** Competency mastery ("consistently demonstrated across attempts") is only computable from history. Learning recommendations based on *persistent* gaps beat recommendations based on one noisy attempt. Org dashboards tracking the 2028 Lighthouse Goal need longitudinal data by construction. Bank versioning keeps all of it comparable: scores are interpreted within version, trends across versions.
- **The KPI table is the design's most underrated feature: it makes the assessment falsifiable.** Discrimination index >0.3, Cronbach's alpha >0.75, completion >85%, longest-answer gaming <50%, face validity >4.0/5, cross-attempt stability <5% on mastered competencies. Most corporate assessments assert their quality; this one *specifies the evidence that would prove it wrong* and commits to measuring it. A reviewer who doubts any argument in this document can be pointed at the metric that will confirm or refute it in production. That — not rhetorical confidence — is what makes the design bulletproof.
- Even the two unscored tool-survey questions earn their place: they let the organization correlate *actual tool usage* with competency scores, testing the framework's own thesis (daily practice builds competency) against its own data.

---

## 11. Anticipated Objections, Answered

**"90% is too harsh for a universal assessment."**
The badge gates the technical track where employees build systems that act autonomously; the threshold prices the asymmetric cost of false positives at that gate. The system absorbs the strictness elsewhere: partial credit, unlimited 30-day retakes, targeted learning paths, and a published KPI (<30% need 2+ attempts) that holds the bar accountable. Below-90% is labeled *AI Explorer* — a development stage, not a failure.

**"Concordance scoring means there's no objectively right answer — isn't that arbitrary?"**
The opposite. It replaces one author's opinion with the measured distribution of 10–20 independent practitioners, validated in calibration. It is *more* objective than a conventional answer key, and it is honest about the domain: AI judgment genuinely has better and worse answers rather than true and false ones. The method has decades of precedent in high-stakes medical assessment.

**"Only 10% technical content — won't people pass without being able to use the tools?"**
By design. L1–L2 is the *universal* tier across every role in an international corporation; heavy tool content would be unfair to non-technical roles and obsolete within quarters. Tool depth is what L3–L5 exists for — and the 90% gate ensures everyone entering that track has the judgment to use tool skills safely. Meanwhile, Domain Integration (25%) already verifies employees can apply AI in real workflows, which is the outcome that matters.

**"AI generating its own assessment questions is circular."**
It would be, without the two structural breaks in the circle: an evaluator agent blinded to the generator's reasoning, and a human panel with final authority. The pipeline is monitored by its own KPI (60–80% acceptance band) and its output by production psychometrics (discrimination index, response distributions, user reactions). Generation is AI-accelerated; *validation* is independent and human-owned.

**"Question rotation means candidates take different tests — is that fair?"**
Every session is a constrained parallel form: identical dimension weights, ≤2 items per competency, no competency over- or under-represented, position balance enforced. Cross-attempt stability (<5% variance on mastered competencies) is a standing KPI verifying that parallel forms behave as parallel. The alternative — a fixed form — is fair for exactly as long as it takes the first cohort to share the answers, which in a large organization is days.

---

## 12. Summary: One Coherent Design, Not a Feature List

The choices are not independently good ideas bolted together; each one load-bears for the others:

- *Judgment-based content* is what makes a **6-month update cycle** affordable and **18-month badges** meaningful.
- *Concordance scoring* is what makes **judgment questions** defensible under dispute.
- *The 100-question bank* is what makes **30-day retakes** measure learning and **answer-sharing** worthless.
- *The three-layer architecture* is what makes the **bank refresh cadence** operationally sustainable.
- *The two-agent pipeline* is what makes the **bank size and refresh rate** achievable at consistent quality.
- *The KPI suite* is what makes every claim above **falsifiable in production**.

Remove any one element and another's justification weakens. That interdependence — every mechanism protecting the single guarantee that *the badge means what it claims* — is the strongest argument that this is not merely a reasonable setup, but the right one.
