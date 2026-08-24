import { CIRCUIT_TYPES, type CircuitCompletionState, type CircuitType } from "./circuits";
import type { FormationSeason } from "./content";

export const FULLY_CHARGED_TOTAL_DAYS = 75 as const;
export const FULLY_CHARGED_CONTENT_BUNDLE_VERSION = "fully-charged-75-content-v1" as const;
export const FULLY_CHARGED_COPY_REVIEW_STATUS = "pending" as const;

export const FORMATION_SEASON_LABELS: Record<FormationSeason, string> = {
  be_with_jesus: "Be With Jesus",
  become_like_jesus: "Become Like Jesus",
  do_what_jesus_did: "Do What Jesus Did",
};

export interface FullyChargedDayGuide {
  dayNumber: number;
  stableId: string;
  season: FormationSeason;
  seasonDay: number;
  title: string;
  scriptureReference: string;
  invitation: string;
  reflectionPrompt: string;
  servicePrompt: string;
  reviewDay: boolean;
}

type GuideSeed = readonly [
  title: string,
  scriptureReference: string,
  invitation: string,
  reflectionPrompt: string,
  servicePrompt: string,
  reviewDay?: boolean,
];

const GUIDE_SEEDS: readonly GuideSeed[] = [
  ["Answer the invitation", "Matthew 4:18-22", "Begin before the day gets loud. Open the passage, notice the invitation in front of you, and choose one concrete response.", "What are you being invited to practice today?", "Make one person's next step lighter without taking control of it."],
  ["Begin in quiet", "Mark 1:35", "Protect a small pocket of quiet before reacting to messages, tasks, or pressure.", "What became easier to notice when you slowed down?", "Give someone unhurried attention."],
  ["Stay and notice", "John 1:35-39", "Read slowly enough to notice the questions, movement, and setting in the passage.", "Where are you tempted to rush past what deserves attention?", "Create room for someone to speak without fixing them."],
  ["Bring the honest need", "Mark 10:46-52", "Name what you actually need instead of performing certainty or minimizing the truth.", "What honest request can you bring to God today?", "Respond to one practical need you can meet without exposing anyone's story."],
  ["Receive rest", "Matthew 11:28-30", "Choose a pace that makes faithfulness possible; adaptation and rest are honest stewardship.", "What load is yours to carry, and what can you release?", "Remove one burden from another person's day within healthy limits."],
  ["Notice compassion", "Mark 6:30-34", "Pay attention to both need and human limits. Let compassion and wise boundaries remain together.", "What need can you see clearly without pretending you can meet every need?", "Offer one bounded, practical act of care."],
  ["Review your presence", "Luke 5:15-16", "Review the week without grading it. Notice what helped you be present and what pulled you into noise.", "What helped you return when your attention drifted?", "Thank someone whose quiet faithfulness helped you this week.", true],
  ["Listen before answering", "Luke 10:38-42", "Give the passage and the people near you enough attention before deciding what the moment means.", "What are you assuming before you have listened?", "Ask one sincere question and listen to the full answer."],
  ["Ask plainly", "Matthew 7:7-11", "Bring a clear request to prayer, then choose the next action that is genuinely yours.", "What can you ask for without trying to control the answer?", "Help someone locate a resource, introduction, or next step."],
  ["Trust in the storm", "Mark 4:35-41", "Name the pressure honestly, release the outcome you cannot command, and make the next safe move.", "What fear is shaping your story about today?", "Be a calm, non-anxious presence in one tense moment."],
  ["See the overlooked", "Mark 5:25-34", "Notice who or what is easy to pass over when the schedule feels urgent.", "Where has hurry narrowed your attention?", "Include someone who is often missed, keeping their details private."],
  ["Bring your whole self", "Luke 7:36-50", "Come to the passage without polishing your emotions. Honest attention is enough for today.", "What feeling have you been trying to edit before bringing it to God?", "Offer dignity rather than judgment in one interaction."],
  ["Practice concrete gratitude", "Luke 17:11-19", "Name one specific gift and let gratitude lead to a specific response.", "What gift can you name without denying what is still hard?", "Express direct, specific thanks to one person."],
  ["Review your attention", "Mark 8:27-30", "Pause at the end of the second week and separate what you observed from what you assumed.", "Which assumption most needs another look?", "Invite a trusted person to share what you may have missed.", true],
  ["Remain", "John 15:1-8", "Choose steady connection over frantic output. Let today's practices be small enough to keep honestly.", "What helps you remain grounded when results are unclear?", "Support someone's steady work without demanding a visible result."],
  ["Let Scripture question the story", "Luke 24:13-27", "Compare the story you are telling with what the passage actually makes visible.", "What interpretation changed when you looked again?", "Help someone examine options without prescribing their conclusion."],
  ["Choose the honest next step", "Mark 10:17-22", "Name the action in front of you without bargaining it into something easier to admire and harder to do.", "What is the smallest faithful action you can actually complete?", "Give away one useful resource, opportunity, or block of time."],
  ["Welcome correction", "Mark 9:33-37", "Notice defensiveness or comparison, then choose a response that protects truth and relationship.", "What would become possible if you did not need to be first?", "Make space for someone else's contribution to lead."],
  ["Receive enough for today", "Matthew 6:25-34", "Return from imagined futures to today's responsibilities, limits, and available grace.", "Which future concern is consuming today's attention?", "Meet one present need instead of promising a sweeping rescue."],
  ["Tell the truth in prayer", "Matthew 26:36-46", "Prayer does not require polished language. Name desire, fear, and surrender without recording private words.", "What do you want, and what outcome must you release?", "Stay near someone in a hard moment without forcing conversation."],
  ["Review your trust", "John 6:66-69", "Look back with honesty: what strengthened trust, and what exposed the need for deeper roots?", "What kept you present when certainty was unavailable?", "Encourage someone who is doing faithful work without recognition.", true],
  ["Notice who is near", "Matthew 9:9-13", "Let the passage challenge your categories of who deserves attention, welcome, or time.", "Who have you reduced to a label?", "Offer ordinary welcome without making a project of the person."],
  ["Make room for interruption", "Mark 5:21-43", "Hold your plan firmly enough to act and loosely enough to notice a real interruption.", "Which interruption might deserve patient attention?", "Respond to one interruption with presence and a clear boundary."],
  ["Follow without comparison", "John 21:20-22", "Return to your own Main Promise when comparison tries to write today's agenda.", "What is yours to practice regardless of someone else's pace?", "Celebrate another person's progress without measuring your own against it."],
  ["Carry the season forward", "Matthew 11:28-30", "Review Days 1–25 with grace. Keep the practices that helped you be with Jesus and release performance pressure.", "What will you carry into the next season, and what will you adapt?", "Share specific gratitude with someone who made presence easier.", true],

  ["Learn the way of gentleness", "Philippians 2:1-11", "Enter the second season by choosing humility, truth, and service in one ordinary responsibility.", "Where can strength become gentleness today?", "Take one low-visibility task that benefits others."],
  ["Keep your word", "Matthew 5:33-37", "Make today's Main Promise specific, possible, and plain enough to answer honestly tonight.", "What promise can you keep without exaggeration?", "Follow through on one commitment another person is relying on."],
  ["Practice hidden faithfulness", "Matthew 6:1-6", "Choose a practice that does not need an audience, proof post, or recognition to matter.", "What would you still do if nobody knew?", "Serve privately and do not record the recipient's identity."],
  ["Release comparison", "Luke 18:9-14", "Notice the urge to rank yourself. Return to honest self-examination and the next faithful action.", "Where has comparison distorted the truth about you or someone else?", "Affirm another person's dignity without using them as a comparison point."],
  ["Choose humility", "Philippians 2:1-11", "Let humility shape one decision, conversation, or use of authority today.", "What would it look like to consider another person's good without erasing your limits?", "Use your influence to make room for someone else."],
  ["Forgive honestly", "Matthew 18:21-35", "Release personal retaliation while keeping truth, safety, boundaries, and repair in view.", "What can forgiveness mean here without pretending harm did not happen?", "Refuse one cycle of retaliation or contempt."],
  ["Review your integrity", "Luke 16:10-13", "Review the promises you named and the answers you gave. Look for learning, not a spiritual grade.", "Where were you dependable, and where should tomorrow's promise become smaller?", "Repair or clarify one commitment that affects someone else.", true],
  ["Speak truth with care", "Ephesians 4:25-32", "Prepare one truthful conversation with language that protects both clarity and dignity.", "What needs to be said, and what tone would make it easier to receive?", "Offer useful truth without gossip or unnecessary private detail."],
  ["Make peace promptly", "Matthew 5:23-24", "Take the next available step toward repair where contact is appropriate and safe.", "What part of the repair is genuinely yours?", "Make one apology, clarification, or peace-making move without demanding a response."],
  ["Practice patient attention", "James 1:19-20", "Slow the space between stimulus and response. Listen fully before choosing your words.", "Which signal tells you that reactivity is taking over?", "Let someone finish before offering advice or defense."],
  ["Respond without retaliation", "Matthew 5:38-48", "Choose a response that refuses revenge while honoring wise boundaries and safety.", "What response would be both courageous and free from payback?", "Interrupt one small cycle of hostility with a constructive action."],
  ["Be faithful in little", "Luke 16:10-13", "Complete the ordinary responsibility in front of you before reaching for a dramatic gesture.", "Which small responsibility deserves your full integrity?", "Do one necessary task that is easy to leave for someone else."],
  ["Give without performance", "Mark 12:41-44", "Offer time, attention, or resources freely and within your real capacity.", "What can you give honestly without resentment or display?", "Share something useful without publicizing the act."],
  ["Review love in action", "John 13:1-17", "Review whether your habits are making love more concrete in ordinary life.", "Which repeated action is shaping you toward patient service?", "Do one practical act of care that preserves the other person's dignity.", true],
  ["Carry responsibility without anxiety", "Luke 12:22-31", "Separate responsible preparation from imagined control, then complete today's part.", "What preparation is yours, and what certainty are you chasing?", "Help with one real responsibility without taking over."],
  ["Let character lead", "Galatians 5:22-26", "Choose one quality from the passage to practice through a visible action rather than a self-description.", "Which quality needs a concrete expression today?", "Make patience, kindness, or gentleness tangible for someone nearby."],
  ["Choose self-control", "1 Corinthians 9:24-27", "Set one boundary that protects attention, body, speech, or follow-through without using punishment.", "Which boundary would make today's promise easier to keep?", "Honor a boundary that makes you more reliable to others."],
  ["Repair what you can", "Luke 19:1-10", "Move beyond regret toward one proportionate act of repair that does not create new harm.", "What can be repaired today, and what requires patience or help?", "Return, replace, clarify, or make amends where appropriate."],
  ["Practice mercy", "Luke 6:36-38", "Let mercy interrupt harsh judgment while keeping discernment and accountability intact.", "Where can you become less condemning and more truthful?", "Offer a second look, a patient explanation, or a reasonable accommodation."],
  ["Stay teachable", "Mark 8:31-33", "Notice when your preferred outcome makes it hard to receive correction or new evidence.", "What feedback are you tempted to dismiss too quickly?", "Ask for input from someone affected by your decision."],
  ["Review steady practice", "Hebrews 12:1-3", "Review the practices that are sustainable, the friction that is real, and the adaptations that protect faithfulness.", "What should you continue, remove, or adapt for the next week?", "Encourage someone's endurance without pressuring them to ignore limits.", true],
  ["Use strength to serve", "Mark 10:42-45", "Use authority, skill, access, or energy to create good for someone rather than status for yourself.", "Where can your strength become service today?", "Use one advantage you have to open a path for someone else."],
  ["Tell the truth under pressure", "John 18:33-38", "Keep your words accurate when urgency, approval, or fear makes distortion tempting.", "What truth must remain clear even if it costs convenience?", "Correct one misleading impression you have allowed to stand."],
  ["Work faithfully when unseen", "Colossians 3:23-24", "Bring care to work that will not be praised, posted, or immediately rewarded.", "Which unseen responsibility can receive your best honest effort?", "Complete one behind-the-scenes task that supports the group."],
  ["Carry the season forward", "John 15:9-17", "Review Days 26–50 without claiming a score. Name what became more honest, loving, and dependable.", "Which practice is becoming part of your character, and where do you still need support?", "Thank someone who helped you practice integrity, humility, or repair.", true],

  ["Go as a servant", "Luke 10:1-9", "Enter the final season ready to offer presence, peace, and practical help without controlling the outcome.", "Where are you being sent in ordinary life today?", "Offer one useful act of service within your actual role and limits."],
  ["Serve quietly", "Matthew 6:1-4", "Let the service itself matter more than being seen as helpful.", "What good can remain private today?", "Complete a private act of encouragement or help; record only that it happened."],
  ["Welcome the neighbor", "Luke 10:25-37", "Notice the person and need in front of you without reducing anyone to a lesson or story.", "What barrier makes it easier to pass by?", "Offer practical care while protecting the person's identity and agency."],
  ["Make room at the table", "Luke 14:12-14", "Examine who is included, who is missing, and what welcome is within your control.", "Where can your environment become more hospitable?", "Extend a low-pressure invitation or make access easier for someone."],
  ["Encourage specifically", "1 Thessalonians 5:11", "Choose encouragement grounded in something true and concrete rather than flattery.", "What strength or effort can you name honestly in someone else?", "Send one specific, private word of encouragement."],
  ["Listen with compassion", "John 11:28-36", "Stay present to grief or difficulty without rushing to explanations, solutions, or public sharing.", "Can you remain near pain without making it about your response?", "Offer quiet presence and ask what kind of help would be welcome."],
  ["Review service without performance", "Mark 9:35-37", "Review whom your actions benefited, where ego entered, and what private service taught you.", "When did service feel like love, and when did it feel like image management?", "Choose one low-status act that the community genuinely needs.", true],
  ["Share what you have", "Mark 6:35-44", "Inventory what is actually available—time, food, skill, access, or attention—and offer a responsible portion.", "What do you have that can become useful today?", "Share one practical resource without promising more than you can sustain."],
  ["Offer practical care", "James 2:14-17", "Translate concern into one concrete action that fits the need and respects consent.", "What action would make your care tangible?", "Meet one material or logistical need directly or through a trusted organization."],
  ["Practice hospitality", "Romans 12:9-13", "Prepare your space, schedule, or attention so another person can be received with dignity.", "What friction keeps welcome from becoming real?", "Create one safer, clearer, or more comfortable point of welcome."],
  ["Seek reconciliation", "Matthew 18:15-20", "Choose a direct, proportionate, and safe step instead of gossip, avoidance, or public pressure.", "What conversation belongs with the person involved?", "Protect the path to repair by keeping unnecessary details private."],
  ["Pray for others privately", "John 17:6-19", "Hold another person's good before God without recording their private situation or treating prayer as control.", "What can you entrust to God without managing the person?", "Pair private prayer with one respectful offer of support."],
  ["Stand with the overlooked", "Matthew 25:31-40", "Notice needs that systems, schedules, or social comfort make easy to ignore.", "Which need is visible from where you already stand?", "Support a person or trusted local effort without turning recipients into content."],
  ["Review mercy in motion", "Luke 7:11-17", "Review whether compassion led to appropriate action, wise referral, patient presence, or a needed boundary.", "How did mercy become concrete this week?", "Follow up on one earlier offer of care without creating obligation.", true],
  ["Use words to build", "Ephesians 4:29-32", "Let today's speech be truthful, timely, and useful to the person receiving it.", "Which conversation could leave someone clearer or stronger?", "Offer constructive words and remove one piece of corrosive talk."],
  ["Give full attention", "Acts 3:1-10", "Look up from routine long enough to see the person, request, and response available to you.", "Where has familiarity made you stop noticing?", "Give someone focused attention, then offer only what you can honestly give."],
  ["Serve across boundaries", "John 4:4-26", "Notice the social boundary in the passage and examine one boundary that narrows your own care.", "Whose perspective do you need to hear without using them as an example?", "Learn from or serve someone outside your usual circle with humility."],
  ["Make peace locally", "Romans 12:14-21", "Choose one action that lowers hostility without denying truth, safety, or accountability.", "What good response is within your control today?", "Refuse gossip, de-escalate one exchange, or make a constructive introduction."],
  ["Share hope with humility", "1 Peter 3:15-16", "Speak from your own experience with gentleness, respect, and room for another person's agency.", "Can you explain your hope without pressure or performance?", "Offer an honest word of hope only where it is welcome."],
  ["Practice generous presence", "Luke 21:1-4", "Let generosity be measured by honesty and love, not spectacle or unsafe sacrifice.", "What can you offer freely and responsibly?", "Give time, attention, or resources within a healthy boundary."],
  ["Review mission and limits", "Mark 6:7-13", "Review where you were useful, where you tried to control results, and where rest or referral was wiser.", "What is yours to continue, and what is not yours to carry?", "Connect someone with better help when the need is beyond your role.", true],
  ["Return and report", "Luke 10:17-20", "Notice what happened without making outcomes a measure of worth, importance, or spiritual rank.", "What did service teach you about attention, limits, and trust?", "Share credit generously and keep private stories private."],
  ["Take the lower place", "John 13:12-17", "Choose one practical task that expresses care through action rather than image.", "Which ordinary act would make love visible today?", "Complete one necessary, low-visibility task for another person or group."],
  ["Finish with love", "John 15:9-17", "Let love, truth, and kept promises—not intensity—shape the final stretch.", "What does faithful love require from you today?", "Keep one promise of presence, help, repair, or encouragement."],
  ["Close with gratitude", "Luke 24:50-53", "Complete the final day honestly, review the whole journey with gratitude, and release the need to turn it into a claim about spiritual worth.", "What will you remember, carry forward, and keep practicing after Day 75?", "Thank the people and communities who supported the journey without exposing private details.", true],
] as const;

export function seasonForFullyChargedDay(dayNumber: number): FormationSeason | null {
  if (!Number.isInteger(dayNumber)) return null;
  if (dayNumber >= 1 && dayNumber <= 25) return "be_with_jesus";
  if (dayNumber >= 26 && dayNumber <= 50) return "become_like_jesus";
  if (dayNumber >= 51 && dayNumber <= FULLY_CHARGED_TOTAL_DAYS) return "do_what_jesus_did";
  return null;
}

export const FULLY_CHARGED_75_DAY_GUIDES: readonly FullyChargedDayGuide[] = GUIDE_SEEDS.map(
  ([title, scriptureReference, invitation, reflectionPrompt, servicePrompt, reviewDay = false], index) => {
    const dayNumber = index + 1;
    const season = seasonForFullyChargedDay(dayNumber);
    if (!season) throw new Error(`Invalid Fully Charged day ${dayNumber}`);
    return Object.freeze({
      dayNumber,
      stableId: `fully-charged-75.day.${dayNumber}`,
      season,
      seasonDay: ((dayNumber - 1) % 25) + 1,
      title,
      scriptureReference,
      invitation,
      reflectionPrompt,
      servicePrompt,
      reviewDay,
    });
  },
);

export function getFullyChargedDayGuide(dayNumber: number): FullyChargedDayGuide | null {
  if (!Number.isInteger(dayNumber) || dayNumber < 1 || dayNumber > FULLY_CHARGED_TOTAL_DAYS) return null;
  return FULLY_CHARGED_75_DAY_GUIDES[dayNumber - 1] ?? null;
}

export function validateFullyChargedDayGuides(
  guides: readonly FullyChargedDayGuide[] = FULLY_CHARGED_75_DAY_GUIDES,
): string[] {
  const issues: string[] = [];
  if (guides.length !== FULLY_CHARGED_TOTAL_DAYS) {
    issues.push(`Expected ${FULLY_CHARGED_TOTAL_DAYS} day guides; received ${guides.length}.`);
  }

  const stableIds = new Set<string>();
  guides.forEach((guide, index) => {
    const expectedDay = index + 1;
    const expectedSeason = seasonForFullyChargedDay(expectedDay);
    if (guide.dayNumber !== expectedDay) issues.push(`Expected day ${expectedDay}; received day ${guide.dayNumber}.`);
    if (guide.season !== expectedSeason) issues.push(`Day ${expectedDay} has the wrong formation season.`);
    if (guide.seasonDay !== ((expectedDay - 1) % 25) + 1) issues.push(`Day ${expectedDay} has the wrong season day.`);
    if (stableIds.has(guide.stableId)) issues.push(`Duplicate stable ID ${guide.stableId}.`);
    stableIds.add(guide.stableId);
    if (!guide.title.trim() || !guide.invitation.trim() || !guide.reflectionPrompt.trim() || !guide.servicePrompt.trim()) {
      issues.push(`Day ${expectedDay} has blank user-facing copy.`);
    }
    if (!guide.scriptureReference.trim()) issues.push(`Day ${expectedDay} has no Scripture reference.`);
  });

  return issues;
}

export type FullyChargedDayStatus = "open" | "complete" | "incomplete";

export interface FullyChargedDayRecord {
  dayNumber: number;
  localDate: string;
  circuitStates: Partial<Record<CircuitType, CircuitCompletionState>>;
  closed: boolean;
}

export interface FullyChargedDayEvaluation {
  dayNumber: number;
  localDate: string;
  status: FullyChargedDayStatus;
  completedCircuits: CircuitType[];
  missingCircuits: CircuitType[];
}

export type FullyChargedAttemptStatus = "active" | "ended" | "completed";

export interface FullyChargedAttemptEvaluation {
  status: FullyChargedAttemptStatus;
  completedDays: number;
  currentDay: number | null;
  endedOnDay: number | null;
  completionEligible: boolean;
  dayEvaluations: FullyChargedDayEvaluation[];
}

export function evaluateFullyChargedDay(record: FullyChargedDayRecord): FullyChargedDayEvaluation {
  const completedCircuits = CIRCUIT_TYPES.filter((circuit) => record.circuitStates[circuit] === "complete");
  const missingCircuits = CIRCUIT_TYPES.filter((circuit) => !completedCircuits.includes(circuit));
  return {
    dayNumber: record.dayNumber,
    localDate: record.localDate,
    status: missingCircuits.length === 0 ? "complete" : record.closed ? "incomplete" : "open",
    completedCircuits,
    missingCircuits,
  };
}

export function evaluateFullyChargedAttempt(
  records: readonly FullyChargedDayRecord[],
): FullyChargedAttemptEvaluation {
  const ordered = [...records].sort((a, b) => a.dayNumber - b.dayNumber);
  const seen = new Set<number>();
  const dayEvaluations: FullyChargedDayEvaluation[] = [];
  let completedDays = 0;

  for (const record of ordered) {
    if (!Number.isInteger(record.dayNumber) || record.dayNumber < 1 || record.dayNumber > FULLY_CHARGED_TOTAL_DAYS) {
      throw new Error(`Fully Charged day number must be between 1 and ${FULLY_CHARGED_TOTAL_DAYS}.`);
    }
    if (seen.has(record.dayNumber)) throw new Error(`Duplicate Fully Charged day ${record.dayNumber}.`);
    if (record.dayNumber !== dayEvaluations.length + 1) {
      throw new Error(`Fully Charged days must be consecutive; expected day ${dayEvaluations.length + 1}.`);
    }
    seen.add(record.dayNumber);

    const evaluation = evaluateFullyChargedDay(record);
    dayEvaluations.push(evaluation);
    if (evaluation.status === "complete") {
      completedDays += 1;
      continue;
    }
    if (evaluation.status === "incomplete") {
      return {
        status: "ended",
        completedDays,
        currentDay: null,
        endedOnDay: record.dayNumber,
        completionEligible: false,
        dayEvaluations,
      };
    }
    return {
      status: "active",
      completedDays,
      currentDay: record.dayNumber,
      endedOnDay: null,
      completionEligible: false,
      dayEvaluations,
    };
  }

  if (completedDays === FULLY_CHARGED_TOTAL_DAYS) {
    return {
      status: "completed",
      completedDays,
      currentDay: null,
      endedOnDay: null,
      completionEligible: true,
      dayEvaluations,
    };
  }

  return {
    status: "active",
    completedDays,
    currentDay: completedDays + 1,
    endedOnDay: null,
    completionEligible: false,
    dayEvaluations,
  };
}

export function addLocalCalendarDays(localDate: string, days: number): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(localDate) || !Number.isInteger(days)) {
    throw new Error("A valid local date and whole-day offset are required.");
  }
  const [year, month, day] = localDate.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return date.toISOString().slice(0, 10);
}

export function getLocalDateInTimezone(timezone: string, date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  if (!values.year || !values.month || !values.day) {
    throw new Error(`Unable to resolve a local date for timezone ${timezone}.`);
  }
  return `${values.year}-${values.month}-${values.day}`;
}

export function buildCompletedFullyChargedSimulation(startLocalDate: string): FullyChargedDayRecord[] {
  return Array.from({ length: FULLY_CHARGED_TOTAL_DAYS }, (_, index) => ({
    dayNumber: index + 1,
    localDate: addLocalCalendarDays(startLocalDate, index),
    circuitStates: Object.fromEntries(CIRCUIT_TYPES.map((circuit) => [circuit, "complete"])) as Record<
      CircuitType,
      CircuitCompletionState
    >,
    closed: true,
  }));
}
