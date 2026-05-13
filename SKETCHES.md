# Sketches

These are descriptions of the layouts sketched during design. The actual visual sketches were rendered in chat and aren't preserved as files. This doc describes them so Claude Code can rebuild the layouts.

## Lobby

A single scrollable page, top to bottom:

1. Group chat panel — at the top of the lobby (this is where social pressure to "touch base" lives)
2. Note of the day/week — a small panel below the chat
3. Two task boxes side-by-side: "your tasks" on the left, "general/unclaimed tasks" on the right
4. Large gantt at the bottom — for peripheral context, interactive

The chat in the lobby is the *expanded* form of the floating chat object that appears collapsed-as-a-bubble on the workbenches.

## Generic workbench shape

A single panel — the workbench surface itself — taking most of the page. Below it, a horizontal tool tray with the tools relevant to that workbench's task area.

No title bar, no breadcrumb. The workbench is the workbench.

A floating chat bubble sits in a corner (bottom-right by default, draggable). Click to expand into a small chat panel that floats over the workbench. Collapse it back to a bubble when not in use. It does not occupy a fixed column.

## Marketing workbench

Vertical stack of campaigns. Each campaign is its own panel:

- The currently in-progress campaign is visually accented (e.g. a stronger / colored border) to delineate it from other campaigns
- Other campaigns sit below with normal styling
- Each campaign panel contains a grid of files (uniform tile size, e.g. 4-column grid of square tiles)
- Files are draggable within their campaign — users organize them as they like
- File positions persist across sessions

Below the campaigns, the tool tray (post builder, templates, brand assets, scheduler).

Floating chat bubble in the corner.

## Pipeline workbench

Three lanes side-by-side: TO-DO, IN PROGRESS, COMPLETED.

Each lane holds task cards stacked vertically. Each card shows:

- Task title (e.g. "scan: object_047", "print: lattice_v3", "process: scan_046")
- Execution detail (e.g. "scanner: B · hi-res", "printer: A · PLA · 0.2mm", "tool: meshroom")
- For in-progress and completed: who is/was working on it and when

Below the three lanes, an ISSUES panel — separate from tasks. Each issue:

- Title (e.g. "printer A: PLA jam at extruder")
- Reporter, time, status (open/investigating/resolved)
- A colored left border indicates severity

Floating chat bubble in the corner.

## What was specifically corrected

Earlier sketches had two problems that were corrected:

1. **Title bar / breadcrumb at the top of each workbench** ("BACKEND WORKBENCH ▸ MODULE-X TASK"). Removed. The workbench is its own page with its own URL — it doesn't need a label inside itself.

2. **Chat as a fixed-width column on the right of every workbench.** Replaced with a floating chat object — bubble when collapsed, draggable small panel when expanded.
