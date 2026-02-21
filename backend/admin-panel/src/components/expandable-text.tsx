import { useState } from "react";

interface ExpandableTextProps {
  text: string;
  maxLength?: number;
  className?: string;
}

export function ExpandableText({
  text,
  maxLength = 120,
  className = "",
}: ExpandableTextProps) {
  const [expanded, setExpanded] = useState(false);
  const isLong = text.length > maxLength;

  return (
    <div
      className={`text-xs ${isLong ? "cursor-pointer" : ""} ${className}`}
      onClick={() => isLong && setExpanded(!expanded)}
      title={isLong && !expanded ? "Click to expand" : undefined}
    >
      <span className="whitespace-pre-wrap break-words">
        {isLong && !expanded ? text.slice(0, maxLength) + "..." : text}
      </span>
      {isLong && (
        <span className="text-blue-600 ml-1 text-[10px]">
          {expanded ? "(less)" : "(more)"}
        </span>
      )}
    </div>
  );
}
