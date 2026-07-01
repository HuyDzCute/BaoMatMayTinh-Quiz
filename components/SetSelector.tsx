"use client";
import { useState } from "react";
import { quizSets, getSubSets } from "@/lib/data";
import {
  BookOpen, GraduationCap, Terminal, AlertTriangle,
  ChevronDown, ChevronUp, CheckCircle2
} from "lucide-react";

const iconMap: Record<string, React.ElementType> = {
  "book-open": BookOpen,
  "graduation-cap": GraduationCap,
  "terminal": Terminal,
  "alert-triangle": AlertTriangle,
};

interface SetSelectorProps {
  onSelect: (setId: string, subSetId: string, questionCount: number) => void;
}

export default function SetSelector({ onSelect }: SetSelectorProps) {
  const [expandedSet, setExpandedSet] = useState<string | null>(null);

  const handleSetClick = (setId: string) => {
    setExpandedSet(expandedSet === setId ? null : setId);
  };

  const handleSubSetClick = (setId: string, subSetId: string, questionCount: number) => {
    onSelect(setId, subSetId, questionCount);
  };

  return (
    <div className="space-y-3">
      {quizSets.map((set, setIndex) => {
        const Icon = iconMap[set.icon] || BookOpen;
        const subSets = getSubSets(set.id);
        const isExpanded = expandedSet === set.id;

        return (
          <div
            key={set.id}
            className="rounded-xl overflow-hidden border transition-all duration-200"
            style={{
              borderColor: isExpanded ? `${set.color}60` : "rgba(51,65,85,0.4)",
              backgroundColor: isExpanded ? `${set.color}06` : "rgba(17,24,39,0.7)",
              animationDelay: `${setIndex * 80}ms`,
            }}
          >
            {/* Card header */}
            <button
              className="w-full px-5 py-4 flex items-center justify-between transition-all duration-150"
              style={{ backgroundColor: "transparent" }}
              onClick={() => handleSetClick(set.id)}
              onMouseEnter={(e) => {
                if (!isExpanded) {
                  e.currentTarget.style.backgroundColor = "rgba(30,41,59,0.4)";
                }
              }}
              onMouseLeave={(e) => {
                if (!isExpanded) {
                  e.currentTarget.style.backgroundColor = "transparent";
                }
              }}
            >
              <div className="flex items-center gap-4">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: `${set.color}18`, border: `1px solid ${set.color}30` }}
                >
                  <Icon size={18} style={{ color: set.color }} />
                </div>
                <div className="text-left">
                  <h3
                    className="font-semibold text-sm leading-snug"
                    style={{ color: "#e2e8f0" }}
                  >
                    {set.name}
                  </h3>
                  <p className="text-xs mt-0.5" style={{ color: "#64748b" }}>
                    {set.questions.length} cau hoi · {subSets.length} phan
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span
                  className="hidden sm:inline-flex text-[11px] px-2 py-0.5 rounded-full font-medium"
                  style={{ backgroundColor: `${set.color}15`, color: set.color }}
                >
                  {subSets.length} phan
                </span>
                <div style={{ color: "#475569" }}>
                  {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </div>
              </div>
            </button>

            {/* Sub-items */}
            {isExpanded && (
              <div
                className="border-t grid grid-cols-1 sm:grid-cols-2 gap-1.5 p-2"
                style={{ borderColor: "rgba(51,65,85,0.3)" }}
              >
                {subSets.map((sub) => (
                  <button
                    key={sub.id}
                    className="w-full text-left px-4 py-3 rounded-lg transition-all duration-150 flex items-center justify-between gap-3"
                    style={{
                      backgroundColor: "rgba(15,23,42,0.6)",
                      border: "1px solid rgba(51,65,85,0.3)",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = `${set.color}50`;
                      e.currentTarget.style.backgroundColor = `${set.color}08`;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = "rgba(51,65,85,0.3)";
                      e.currentTarget.style.backgroundColor = "rgba(15,23,42,0.6)";
                    }}
                    onClick={() => handleSubSetClick(set.id, sub.id, sub.questionCount)}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <CheckCircle2 size={14} style={{ color: `${set.color}60`, flexShrink: 0 }} />
                      <span className="text-sm truncate" style={{ color: "#cbd5e1" }}>
                        {sub.name}
                      </span>
                    </div>
                    <span
                      className="text-[11px] px-2 py-0.5 rounded-full flex-shrink-0 font-medium"
                      style={{ backgroundColor: `${set.color}15`, color: set.color }}
                    >
                      {sub.questionCount} cau
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
