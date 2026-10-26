import { useEffect, useState } from "react";
import { Grid2X2, List } from "lucide-react";

export type ViewMode = "cards" | "list";

export function useViewMode(key: string) {
  const [mode, setMode] = useState<ViewMode>(() => {
    try {
      return localStorage.getItem(`admin-view:${key}`) === "list" ? "list" : "cards";
    } catch {
      return "cards";
    }
  });

  useEffect(() => {
    try { localStorage.setItem(`admin-view:${key}`, mode); } catch { /* storage may be unavailable */ }
  }, [key, mode]);

  return [mode, setMode] as const;
}

export default function ViewModeControl({ mode, onChange }: { mode: ViewMode; onChange: (mode: ViewMode) => void }) {
  return (
    <div aria-label="Display style" className="inline-flex border border-forest/15 bg-white">
      <button type="button" aria-label="Card view" aria-pressed={mode === "cards"} title="Card view" onClick={() => onChange("cards")} className={`flex items-center gap-2 px-3 py-2 text-xs font-medium transition ${mode === "cards" ? "bg-forest text-cream" : "text-forest/65 hover:bg-sage/15"}`}>
        <Grid2X2 className="h-4 w-4" /><span className="hidden sm:inline">Cards</span>
      </button>
      <button type="button" aria-label="List view" aria-pressed={mode === "list"} title="List view" onClick={() => onChange("list")} className={`flex items-center gap-2 border-l border-forest/15 px-3 py-2 text-xs font-medium transition ${mode === "list" ? "bg-forest text-cream" : "text-forest/65 hover:bg-sage/15"}`}>
        <List className="h-4 w-4" /><span className="hidden sm:inline">List</span>
      </button>
    </div>
  );
}
