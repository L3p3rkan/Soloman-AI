import React from "react";

export function parseScripture(text: string) {
  // A simple regex to match common Bible references
  // e.g. John 3:16, 1 Corinthians 13:1-2, Psalm 23, Genesis 1:1, etc.
  const regex = /\b(\d\s)?([A-Z][a-z]+)\s\d+:\d+(-\d+)?\b|\b([A-Z][a-z]+)\s\d+\b/g;
  
  const parts = [];
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
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

  return parts;
}
