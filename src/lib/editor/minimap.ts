import type { Extension } from "@codemirror/state";
import { EditorState } from "@codemirror/state";
import { showMinimap } from "@replit/codemirror-minimap";

/** Skip whole-document scans on very large files. */
const MAX_DOC_LENGTH = 1_000_000;
/** Cap gutter marks so a common word can't paint the whole minimap. */
const MAX_MARKED_LINES = 2000;

/** Resolve a CSS custom property to a concrete color for canvas fill. */
function resolveColor(name: string, fallback: string): string {
  if (typeof window === "undefined") return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

/**
 * Line → color map marking every line that contains the current selection,
 * so selecting a word shows its occurrences down the minimap (like the editor
 * body's `highlightSelectionMatches`). Empty unless a simple word is selected.
 */
function occurrenceGutter(state: EditorState): Record<number, string> {
  const sel = state.selection.main;
  if (sel.empty || state.doc.length > MAX_DOC_LENGTH) return {};
  const word = state.sliceDoc(sel.from, sel.to);
  if (word.length < 2 || word.length > 100 || /\s/.test(word)) return {};

  const color = resolveColor("--editor-selection-match", "#264f78");
  const marks: Record<number, string> = {};
  const text = state.doc.toString();
  let from = 0;
  let count = 0;
  for (;;) {
    const idx = text.indexOf(word, from);
    if (idx < 0) break;
    marks[state.doc.lineAt(idx).number] = color;
    from = idx + word.length;
    if (++count >= MAX_MARKED_LINES) break;
  }
  return marks;
}

/**
 * Zoomed-out overview beside the editor scrollbar (Sublime/VS Code style),
 * rendering real characters colored by the active syntax theme, with a gutter
 * marking selection-match occurrences.
 */
export function editorMinimap(): Extension {
  const create = () => ({ dom: document.createElement("div") });
  return showMinimap.compute(["selection", "doc"], (state) => {
    const marks = occurrenceGutter(state);
    // The package drops empty gutters, which would shrink the reserved width and
    // shift the minimap sideways whenever marks appear/disappear. Always keep the
    // gutter non-empty (an invisible placeholder when there are no matches) so its
    // width — and the minimap's horizontal position — stays constant.
    const gutter = Object.keys(marks).length ? marks : { 1: "transparent" };
    return {
      create,
      displayText: "characters",
      showOverlay: "always",
      gutters: [gutter],
    };
  });
}
