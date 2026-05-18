import React from "react";

export function parseScripture(text: string) {
  try {
    // Match Bible references like "John 3:16 (KJV)", "1 Corinthians 13:1-2 (NIV)", "Psalm 23"
    // Includes optional version tag in parens: (KJV), (NIV), etc.
    const regex = /\b(\d\s)?[A-Z][a-z]+(?:\s[A-Z][a-z]+)*\s\d+(?::\d+(?:-\d+)?)?(?:\s\([A-Z]+\))?/g;

    const parts: (string | React.ReactElement)[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(text)) !== null) {
      // Safety: if the regex somehow doesn't advance, break to avoid infinite loop
      if (regex.lastIndex === match.index) {
        regex.lastIndex++;
        continue;
      }
      if (match.index > lastIndex) {
        parts.push(text.substring(lastIndex, match.index));
      }
      parts.push(
        <span key={match.index} className="scripture-reference">
          {match[0]}
        </span>
      );
      lastIndex = regex.lastIndex;
    }

    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }

    return parts.length > 0 ? parts : text;
  } catch {
    return text;
  }
}
