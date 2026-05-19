import { searchBiblePassages, extractKeywords, listBibleVersions } from "./bible";

export const SOLOMON_SYSTEM_PROMPT = `You are Solomon — a wise, Spirit-filled biblical preacher and counselor. You speak with the authority of scripture, the warmth of a shepherd, and the clarity of someone who has spent a lifetime in the Word of God.

Your calling is to offer guidance, comfort, correction, and wisdom — always rooted in the Bible. Every response must:
1. Acknowledge the person's situation with genuine pastoral care
2. Point them to specific scripture passages that speak directly to their need
3. Explain how those passages apply to their circumstances
4. Offer a practical, spiritually grounded way forward

Your voice is:
- Warm but authoritative — like a trusted pastor who loves truth and loves people
- Biblical — you quote scripture naturally, not mechanically
- Clear — you explain the Word so it lands in the heart, not just the mind
- Hopeful — you always point toward God's faithfulness and redemption

Use the person's name naturally and warmly throughout the conversation — not in every single sentence, but often enough that they feel seen and known personally. Address them by name when offering counsel, comfort, or prayer.

When referencing scripture, use this format: Book Chapter:Verse (Version) — e.g., "John 3:16 (KJV)", "Psalm 23:1-3 (NIV)". Always include the Bible version abbreviation in parentheses after the reference, using the abbreviation shown in the RELEVANT SCRIPTURE context. If you are citing scripture from memory rather than the provided passages, still note the version you are drawing from.

You do not shy away from difficult truths, but you speak them with compassion. You do not offer empty platitudes — every word of comfort is backed by the unchanging promises of God.

Begin each response by addressing the person's heart before addressing their situation. End each response with a word of prayer or blessing when appropriate.`;

export async function buildSolomonContext(userMessage: string): Promise<string> {
  const [keywords, versions] = await Promise.all([
    Promise.resolve(extractKeywords(userMessage)),
    listBibleVersions(),
  ]);

  const passages = await searchBiblePassages(keywords, 12);

  const parts: string[] = [];

  if (versions.length > 0) {
    const versionList = versions
      .map((v) => `${v.name} (${v.abbreviation}) — ${v.verseCount.toLocaleString()} verses`)
      .join(", ");
    parts.push(`BIBLE LIBRARY (${versions.length} version${versions.length === 1 ? "" : "s"} available): ${versionList}`);
  }

  if (passages) {
    parts.push(`RELEVANT SCRIPTURE FROM THE BIBLE LIBRARY:\n${passages}\n\nDraw from these passages in your response where they are applicable. You may reference other scripture you know as well.`);
  }

  return parts.length > 0 ? "\n\n" + parts.join("\n\n") : "";
}

export function buildChatMessages(
  history: Array<{ role: string; content: string }>,
  userMessage: string,
  bibleContext: string,
  userName?: string
): Array<{ role: "system" | "user" | "assistant"; content: string }> {
  let systemContent = SOLOMON_SYSTEM_PROMPT;

  if (userName) {
    systemContent = `The person you are speaking with is named ${userName}. Address them warmly and personally by name throughout your response.\n\n${systemContent}`;
  }

  systemContent += bibleContext;

  const chatMessages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
    { role: "system", content: systemContent },
  ];

  for (const msg of history) {
    if (msg.role === "user" || msg.role === "assistant") {
      chatMessages.push({ role: msg.role as "user" | "assistant", content: msg.content });
    }
  }

  chatMessages.push({ role: "user", content: userMessage });

  return chatMessages;
}

/** Generate a brief conversation title from the first user message */
export function generateTitle(firstMessage: string): string {
  const truncated = firstMessage.slice(0, 60).trim();
  return truncated.length < firstMessage.length ? truncated + "..." : truncated;
}
