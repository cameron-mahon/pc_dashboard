# Design

## Central framing: office space / workshop

The dashboard is an office space. Two main kinds of place:

**Lobby** — the room you walk into. The social, low-effort surface. The thing that makes the dashboard not feel like dread. Memes, meeting reminders, invites, group chat, peripheral context.

**Workbenches** — one per task area. You go to a workbench when you engage with a task. The work-in-progress is sitting there exactly as the last person left it. The tools needed to do the work are within reach. You don't have to figure out what to do before going somewhere — you go to the bench, see what's there, and engage.

This inverts the usual "decide-then-go" pattern of project management tools (look at a list, pick a task, click into it, find the right app, get set up, then start). The workbench model is "go-then-decide" — opening the door is the threshold, and momentum takes over once you're in the room with the work in front of you.

### Lobby and workbench are separate destinations

Not parent/child. The lobby does not contain workbenches. They are different places. You navigate between them. There is no breadcrumb back to the lobby on a workbench page — each workbench is its own destination.

### The chat persists across both

The chat is the only thing that follows you between the lobby and the workbenches.

## Lobby contents

- Group chat (top of the lobby — the social pressure to "touch base" is what brings people in, and from there they see their tasks and engage)
- Note of the day/week (lead can post)
- User-specific task box (your assigned tasks)
- General/unclaimed task box (work available to grab)
- Large gantt — for peripheral context. Interactive (no caveats — interactivity does not compel interaction).

## Workbench shape (general)

- The workbench surface itself, holding work-in-progress
- A tool tray with the tools needed for that area's work
- Files/documents within a workbench are draggable, organized spatially. Spatial memory differentiates files (Mac Finder model). Files do not need text previews to be told apart — their position in the layout is the differentiation.
- No title bar / breadcrumb at the top. The workbench just is the workbench.

## Chat

The chat is a floating object, not a fixed column or sidebar.

- Collapsed by default — shows as a bubble.
- Expand to use. Draggable. Out of the way when not in use.
- An object of undefined size doesn't require a defined space.
- Persists across the lobby and all workbenches.

## Marketing workbench

- In-progress campaigns are visually delineated from other campaigns (e.g. accent border on the active one)
- Each campaign is a subspace containing its files (drafts, assets, copy notes, scheduled posts, etc.)
- Files within a campaign are draggable — the user organizes them as they like
- Spatial layout of files is preserved across sessions — when you come back, files are where you left them
- Tool tray includes things like: post builder, templates, brand assets, scheduler

### Post builder

The post builder for marketing is **built directly**, not wrapped from a third-party tool.

A wrapper (iframe of Buffer/Canva/etc.) gives you their UI sitting in your page. You can't extend it, drag files out, add hover behaviors, or build custom affordances. For a workbench where the point is to do work with controls that match the rest of the dashboard, that's the wrong primitive. A non-interactive interface inside an interactive workspace is contradictory.

The post builder is small enough to build directly: a form with a live preview pane and platform-specific validation rules (text limits, image/video dimensions, etc.).

## Pipeline workbench (model training)

- Three lanes: to-do, in-progress, completed
- Pipeline tasks are physical (print, scan, process). They cannot be completed digitally — only tracked.
- Whether a printer is running or not only matters to the person at the printer. Live machine status is not part of this dashboard.
- Cards in to-do carry execution detail (which scanner, which settings, which printer, what filament, what processing tool, etc.) so the person at the machine can execute without coming back to ask. This is the load-bearing detail that makes the pipeline workbench useful versus a generic Trello board.
- Issues area is separate from tasks. An issue gets resolved or accepted — it doesn't get "done" the way a task does. It probably needs different fields (a task has settings; an issue has a symptom).

## Backend workbench

Not yet designed.

## Frontend workbench

Not yet designed. Note that this dashboard itself sits under frontend, which means a teammember working on the dashboard is using the dashboard — a useful dogfooding loop.
