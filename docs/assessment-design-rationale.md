# AI Fluency Assessment (L1–L2) — Design Rationale (Executive Brief)

**One sentence:** Every design choice protects a single guarantee — the badge means what it claims — and every claim the design makes is backed by a published, measurable target.

---

## 1. The Core Bet: Judgment, Not Tool Trivia

- **Tool knowledge expires in months; judgment lasts years.** A recall quiz breaks with every vendor release. A judgment test survives tool changes, tool switches, and new hires from different stacks — one comparable score across the whole organization, indefinitely.
- **Recall is what AI made worthless.** Anyone can look up a feature. Nobody can look up "should I verify this before it goes to a client." We test the scarce skill.
- **The 10% technical exception is deliberate:** orchestration judgment can only be tested against the real stack (M365 Copilot). It is small, quarantined to one dimension, and on the fastest refresh cycle (6 months) — its volatility is priced in.

## 2. Scenario Format: Test the Failure That Costs Money

The risk is not "can't define few-shot prompting." It is "shipped an unverified hallucination" or "automated the wrong bottleneck." Scenario questions sample the decision itself — the same reason situational judgment tests dominate professional selection and medicine uses Script Concordance Testing. Side benefit: a failed scenario plus its rationale trains the exact decision the employee will face. The assessment doubles as learning.

## 3. Weighting 35/30/25/10: Money Where the Thesis Is

The framework says competency is 90% mindset. The weights encode it — or the assessment would contradict its own theory.

| Dimension | Weight | Why |
|---|---|---|
| AI Mindset | 35% | The bottleneck. Tools without judgment is a liability; judgment without tools is one tutorial away from productive. |
| Applied Skills | 30% | The craft that converts mindset into output. |
| Domain Integration | 25% | Where value materializes — but it depends on the first two. |
| Technical | 10% | Most learnable, fastest to expire, least fair to weight heavily in a universal test. |

Equal weights would let tool memorization compensate for missing judgment — the exact trade the framework exists to prevent.

## 4. Bank + Rotation: Structurally Ungameable

- ~30 questions per session from a 100-question bank (3.3:1) — answer-sharing is worthless; peers can only discuss *concepts*, which is learning.
- Constrained randomness (fixed dimension weights, ≤2 items per competency, every competency covered) makes every session a fair parallel form.
- 30 minutes is the honest ceiling for a mandatory universal test; the format mix (~27×1min single-select + ~3×3min multi-select) is arithmetic, not accident.
- The bank is also the maintenance unit: one weak item gets replaced; the instrument never goes down.

## 5. Anti-Gaming: Attacked Before Launch, Verified Forever

Not a claim — a measured property. Every mechanical strategy was simulated against the full bank:

| Strategy | Score | vs. 90% bar |
|---|---|---|
| Longest answer | 30% | −60 pts |
| Fixed position (A–D) | 36–47% | −43 pts or worse |
| Shortest answer (best attack) | 49% | −41 pts |

Position balance is measured (19/21/21/22 across A–D), and "longest-answer <50%" is a standing KPI re-checked on every bank version. Distractors do double duty: thorough-sounding traps catch the most dangerous false positive — people who *sound* AI-fluent without the judgment.

## 6. Thresholds: 90% / 30 Days / 18 Months

- **90%** because the badge gates L3+, where people build systems that act autonomously. A false positive there costs far more than a 30-day retake. The bar is humane in context: partial credit, unlimited retakes, targeted learning paths, and a KPI (<30% need 2+ attempts) holding the bar accountable.
- **30-day cooldown** is the minimum interval at which a retake measures learning, not memory or luck. Verified by KPI: >60% of retakers must improve.
- **18-month badge validity** is the weighted average decay of the content (mindset ~3 yrs, skills 12–18 mo, technical 6 mo). Permanent badges would be a false claim; annual expiry would over-tax the stable majority.

## 7. Content Pipeline: AI-Scaled, Independently Checked, Human-Owned

A generator agent produces items; a **separate evaluator agent, blinded to the generator's reasoning**, audits each one against the full design contract; a human panel makes the final call. The pipeline is self-monitoring (60–80% evaluator acceptance band — higher means rubber stamp, lower means miscalibration) and demonstrates the exact AI-with-human-oversight practice the assessment teaches.

The three-layer content architecture (Dimension → Competency → Question) puts each fact in exactly one place, at the layer matching its volatility: a tool rename is one `toolHint` edit, not a hunt through 100 questions. Atomic publishing and bank versioning mean the live bank is never half-updated and every historical score stays interpretable forever.

---

## 8. Subjectivity: Low, Bounded, and the Honest Choice

**The headline: zero human discretion at scoring time.** Once calibrated, scoring is fully automated. The same response always earns the same score, for every candidate, every time. There is no grader to be lenient, tired, or impressed — the largest source of subjectivity in workplace assessment is eliminated outright.

Where judgment does enter, it is bounded and converted into measurement:

1. **The answer key is an empirical measurement, not an opinion.** 10–20 expert practitioners answer each item *independently* — no discussion, no anchoring, no committee dynamics. The key is the measured distribution of their answers. Replacing one author's view with the independent consensus of 10–20 professionals is the same move that makes any measurement objective: aggregate independent observations.
2. **The remaining variance is the domain's, not the instrument's.** In a judgment domain, experts legitimately differ between "best" and "defensible." Binary scoring would *hide* that variance behind fake certainty; concordance scoring *represents* it as partial credit. Less subjective-looking would actually be less true.
3. **It is auditable under appeal.** Any disputed item resolves to a fact: "17 of 20 practitioners chose this." Compare the alternative — "the test author says so." Decades of high-stakes medical assessment (Script Concordance Testing) validate exactly this method.
4. **Calibration is validated, not assumed.** Concordance labels are checked during calibration, and production psychometrics (discrimination index >0.3 per item, Cronbach's alpha >0.75 per dimension) confirm items behave as designed. Any item where "expert consensus" fails to discriminate competence is flagged by data and replaced.

**Bottom line:** the only subjectivity left in the system is the irreducible expert variance of the domain itself — measured, partial-credited, and disclosed rather than hidden behind a false binary.

## 9. Bias: Engineered Out, Then Continuously Measured

Bias is controlled at four layers, each with its own verification:

**Item level — no exploitable or unfair patterns.**
Position balance is enforced and measured (19/21/21/22). Length independence is verified by simulation (longest-answer scores 30%). Distractors are written to a documented standard, with per-item designer notes explaining the trap — every item's construction is inspectable.

**Candidate level — no group is structurally advantaged.**
~90% tool-agnostic content removes the largest bias in corporate AI testing: familiarity with one vendor's product. Scenario judgment doesn't favor IT over sales, or tenure over new hires. Technical content is capped at 10% precisely so role background cannot dominate a universal score. Constrained rotation guarantees no candidate draws a harder mix: same weights, same coverage, every session.

**Author level — no single mind shapes the test.**
Three independent filters stand between an idea and a published item: a generator working from documented principles, an evaluator agent *blinded to the generator's reasoning* (self-validation bias broken by construction), and a human content panel with final authority. The scoring key is then set by 10–20 independent experts — the author's preferences never become the standard.

**System level — residual bias cannot hide.**
Every item runs under live psychometric surveillance: discrimination index, response distributions, position-bias checks, per-question time, dropout detection, and per-question user reactions (👍/👎 + comments). A biased item is a visible statistical anomaly with a built-in replacement path (the bank). Bank versioning pins every score to the exact content it was measured against, so even historical bias is auditable.

**Bottom line:** bias is not asserted to be low — it is made *detectable*, and everything detectable here is also correctable without taking the instrument down.

---

## 10. Why This Is the Right Design, Not Just a Reasonable One

The choices are mutually load-bearing:

- Judgment content → makes 6-month updates affordable and 18-month badges meaningful.
- Concordance scoring → makes judgment questions defensible under dispute.
- The 100-item bank → makes 30-day retakes measure learning and answer-sharing worthless.
- Three-layer architecture → makes the refresh cadence operationally sustainable.
- The two-agent pipeline → makes the bank size achievable at consistent quality.
- The KPI suite → makes every claim above falsifiable in production.

Remove any one element and another's justification weakens. Most corporate assessments assert their quality; this one specifies the evidence that would prove it wrong — and commits to measuring it. That is the difference between a defensible design and a bulletproof one.
