# FlowDrop Performance & Bug Fixes Plan

**Date:** 2026-03-20
**Scope:** Non-breaking internal fixes for v1.x
**Status:** Implemented

## Context

A deep audit of hot paths in `libs/flowdrop` found performance bugs causing editor freezes during drag operations, unnecessary O(n) work per frame, and a couple of correctness issues. All fixes are internal — zero API surface changes, fully non-breaking for v1.x consumers.

The editor freeze during drag has **three root causes** traced end-to-end:
1. SvelteMap mutations firing N+M reactive notifications per frame (portCoordinateStore)
2. Full DFS cycle check running in the template on every reactive update
3. O(E×N) linear node lookup during edge styling

---

## P1: Edge Styling O(E×N) → O(E) Node Lookup

**File:** `src/lib/helpers/workflowEditorHelper.ts`

**Problem (lines 291-319):** `updateEdgeStyles()` calls `nodes.find()` per edge to locate source/target nodes. 100 edges × 50 nodes = 10,000 comparisons. Runs after every connection and during proximity preview updates.

```ts
// Current — O(E × N)
return edges.map((edge) => {
  const sourceNode = nodes.find((node) => node.id === edge.source);
  const targetNode = nodes.find((node) => node.id === edge.target);
```

**Fix:** Build a `Map` once before the loop:
```ts
static updateEdgeStyles(edges, nodes) {
  const nodeMap = new Map(nodes.map(n => [n.id, n]));
  return edges.map((edge) => {
    const sourceNode = nodeMap.get(edge.source);
    const targetNode = nodeMap.get(edge.target);
    ...
  });
}
```

**Verify:** `pnpm test` + visual: load large workflow, connect nodes, verify edge colors are correct.

---

## P2: Cycle Check in Template Causes DFS Per Frame (BUG — drag freeze contributor)

**File:** `src/lib/components/WorkflowEditor.svelte`

**Problem (line 897):**
```svelte
{#if checkWorkflowCycles()}
```

`checkWorkflowCycles()` calls `hasInvalidCycles()` — a full DFS graph traversal O(V+E). It's a bare function call in the template, so it re-runs on **every reactive update**. During drag, `flowEdges` changes every frame (proximity preview edges swapped at line 427: `flowEdges = [...baseEdges, ...previews]`), triggering a DFS per drag frame. No result deduplication.

**Fix:** Cache as `$derived` and skip during drag via the FSM's `suppressEffect` flag:
```ts
let hasCycles = $derived.by(() => {
  if (machine.permissions.suppressEffect) return false;
  return WorkflowOperationsHelper.checkWorkflowCycles(flowNodes, flowEdges);
});
```

Template: `{#if hasCycles}` — `$derived` deduplicates the boolean result, and the FSM guard eliminates DFS entirely during drag/connect/drop states.

**Verify:** Open large workflow (20+ nodes), drag a node — no jank. Cycle warning still appears after structural changes (add/remove edge).

---

## P3: SvelteMap Batching in portCoordinateStore (drag freeze root cause)

**File:** `src/lib/stores/portCoordinateStore.svelte.ts`

**Problem:** `updateNodePortCoordinates()` does N deletes + M sets on a `SvelteMap`, firing N+M reactive notifications per frame during drag. The full chain:
1. Drag → `PortCoordinateTracker.$effect` (line 55-58) → `updateNodePortCoordinates()`
2. N `.delete()` + M `.set()` on SvelteMap → each fires reactive notification
3. `findCompatibleEdgesByPortCoordinates()` iterates the SvelteMap via `.values()` (proximityConnect.ts:290) — creating a reactive read dependency
4. Cascade: write → subscriber re-runs → potential further updates

**Fix:** Use the same "build new map, single assignment" pattern already used by `rebuildAllPortCoordinates()` (lines 132-149):
```ts
export function updateNodePortCoordinates(node, getInternalNode): void {
  const internalNode = getInternalNode(node.id);
  if (!internalNode) return;

  const newMap = new SvelteMap<string, PortCoordinate>();
  untrack(() => {
    for (const [key, coord] of coordinates) {
      if (coord.nodeId !== node.id) newMap.set(key, coord);
    }
  });
  for (const coord of computeNodePortCoordinates(node, internalNode)) {
    newMap.set(coord.handleId, coord);
  }
  coordinates = newMap;  // Single reactive assignment
}
```

Same pattern for `removeNodePortCoordinates()` (lines 194-207).

Also add `clearPortCoordinates()` export for lifecycle cleanup:
```ts
export function clearPortCoordinates(): void {
  coordinates = new SvelteMap();
}
```

**Verify:** Drag node with multiple ports — no freeze, proximity previews still work.

---

## P4: Double Bezier Calculation Per Edge

**File:** `src/lib/components/FlowDropEdge.svelte`

**Problem (lines 64-105):** The `computed` derived calls `getBezierPath()` **twice** — once for the full path (to extract control points), then again with a shortened target for the arrow. With 50 edges, that's 100 cubic bezier calculations per render.

**Fix:** Construct the shortened SVG path directly from the already-parsed control points:
```ts
let computed = $derived.by(() => {
  const [fullPath, lx, ly] = getBezierPath({
    sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition,
    curvature: pathOptions?.curvature,
  });

  const cp = parseCubicBezier(fullPath);
  if (!cp) return { path: fullPath, labelX: lx, labelY: ly, angleDeg: 0 };

  const dx = cp.p3x - cp.p2x;
  const dy = cp.p3y - cp.p2y;
  const angleDeg = (Math.atan2(dy, dx) * 180) / Math.PI;
  const angleRad = Math.atan2(dy, dx);
  const adjX = targetX - Math.cos(angleRad) * ARROW_LENGTH_PX;
  const adjY = targetY - Math.sin(angleRad) * ARROW_LENGTH_PX;

  // Build path from existing control points — no second getBezierPath() call
  const shortenedPath = `M ${cp.p0x},${cp.p0y} C ${cp.p1x},${cp.p1y} ${cp.p2x},${cp.p2y} ${adjX},${adjY}`;

  return { path: shortenedPath, labelX: lx, labelY: ly, angleDeg };
});
```

**Verify:** Visual regression — edges must look identical. Test curved, straight, and loopback edges. Arrowheads must align with curve tangent.

---

## P5: Sidebar Duplicates Search Filtering (BUG)

**File:** `src/lib/components/NodeSidebar.svelte`

**Problem:** Two functions do the same search filtering:
- `getFilteredNodes()` (line 79) — filters all nodes by category + search
- `getFilteredNodesForCategory()` (line 189) — re-filters per category in the template

The template calls `getFilteredNodesForCategory()` for every category, re-running `.toLowerCase().includes()` chains. With 10 categories × 200 nodes = 2,000+ redundant string comparisons per keystroke.

**Fix:** Group already-filtered results by category in a single `$derived`:
```ts
let filteredNodesByCategory = $derived.by(() => {
  const map = new Map<string, NodeMetadata[]>();
  for (const node of filteredNodes) {
    let list = map.get(node.category);
    if (!list) { list = []; map.set(node.category, list); }
    list.push(node);
  }
  return map;
});
```

Template: `{#each filteredNodesByCategory.get(category) ?? [] as node}`

Delete `getFilteredNodesForCategory()` and `getNodesForCategory()`.

**Also:** Replace `new SvelteSet()` with plain `Set` in `getCategories()` (line 64) — the set is local, never mutated, never escapes the derived. SvelteSet reactivity features are unused. **Not a drag freeze contributor** — confirmed by tracing the reactive chain. NodeSidebar doesn't participate in the drag path.

**Verify:** Search with 200+ nodes — typing should be instant, no duplicate results.

---

## P6: Proximity Connect Caches Compatible Types Per DataType

**File:** `src/lib/helpers/proximityConnect.ts`

**Problem (line 348):** Inside `findCompatibleEdgesByPortCoordinates()`, `checker.getCompatibleTypes(srcPort.dataType)` is called for every dragged output port. If a node has 5 output ports of the same dataType, the same lookup runs 5 times per frame.

**Fix:** Cache before the loop:
```ts
const compatCache = new Map<string, string[]>();
for (const srcPort of draggedOutputs) {
  if (!compatCache.has(srcPort.dataType)) {
    compatCache.set(srcPort.dataType, checker.getCompatibleTypes(srcPort.dataType));
  }
}
for (const srcPort of draggedOutputs) {
  const compatibleTypes = compatCache.get(srcPort.dataType)!;
  ...
}
```

**Verify:** Drag node near another — proximity preview edges appear correctly.

---

## P7: `hasWorkflowDataChanged()` Uses JSON.stringify Per Node

**File:** `src/lib/stores/workflowStore.svelte.ts`

**Problem (line 474):**
```ts
if (JSON.stringify(currentNode.data) !== JSON.stringify(newNode.data)) return true;
```

Runs inside a loop over all nodes, called by `updateNodes()` and `updateEdges()`. During drag, `updateNodes()` fires frequently — serializing every node's data to compare.

**Fix:** Use reference comparison — xyflow gives new object references for changed nodes during drag:
```ts
if (currentNode.data !== newNode.data) return true;
```

If deeper comparison is needed for specific cases, check `config` key count + `label` string as a cheap heuristic instead of full JSON serialization.

**Verify:** Drag nodes — store updates only happen when data actually changes. Run `pnpm test -- tests/unit/stores/workflowStore.test.ts`.

---

## P8: History `cloneWorkflow` Uses JSON Round-Trip

**File:** `src/lib/services/historyService.ts`

**Problem (line 398):**
```ts
return JSON.parse(JSON.stringify(workflow));
```

Comment explains: `structuredClone` fails on workflows with callback functions (like `onConfigOpen`). But JSON round-trip is ~2-3x slower than `structuredClone` for large objects.

**Fix:** Strip non-serializable fields, then use `structuredClone`:
```ts
private cloneWorkflow(workflow: Workflow): Workflow {
  const cleaned = {
    ...workflow,
    nodes: workflow.nodes.map(n => ({
      ...n,
      data: { ...n.data, onConfigOpen: undefined },
    })),
  };
  return structuredClone(cleaned);
}
```

**Verify:** `pnpm test` + manual undo/redo with large workflow. Verify no callbacks leak into history stack.

---

## P9: Playground Re-sorts Entire Message Array Per Add

**File:** `src/lib/stores/playgroundStore.svelte.ts`

**Problem:** `addMessage()` calls `sortMessagesChronologically()` — copies + sorts entire array O(n log n). Messages arrive mostly sorted by sequence number.

**Fix:** Use binary search insertion for single message:
```ts
addMessage(message) {
  const seq = message.sequenceNumber ?? 0;
  let lo = 0, hi = _messages.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if ((_messages[mid].sequenceNumber ?? 0) <= seq) lo = mid + 1;
    else hi = mid;
  }
  _messages = [..._messages.slice(0, lo), message, ..._messages.slice(lo)];
}
```

Keep full sort in `addMessages()` (batch) since multiple messages may interleave.

**Verify:** Run playground session — messages appear in correct chronological order.

---

## P10: `getPendingInterruptCount()` Allocates Array for Length

**File:** `src/lib/stores/interruptStore.svelte.ts`

**Problem (lines 93-95):**
```ts
export function getPendingInterruptCount(): number {
  return getPendingInterruptIds().length;  // builds full array, discards it
}
```

**Fix:** Count directly:
```ts
export function getPendingInterruptCount(): number {
  let count = 0;
  for (const interrupt of interrupts.values()) {
    if (!isTerminalState(interrupt.machineState)) count++;
  }
  return count;
}
```

**Verify:** Interrupt UI shows correct count during playground sessions.

---

## P11: Version Counter for Dirty Detection and Save Verification

**File:** `src/lib/stores/workflowStore.svelte.ts`

**Problem:** Dirty state tracking relied on JSON.stringify snapshots — `createSnapshot()` serialized every node's id, position, data.label, data.config and every edge's id, source, target, handles into a JSON string. `updateDirtyState()` then compared two such strings on every mutation. This was O(N) in workflow size and allocated temporary strings on every change.

Additionally, P7's switch from `JSON.stringify(node.data)` to reference comparison (`currentNode.data !== newNode.data`) removed the safety net that caught in-place mutations. The dirty detection system needed a fundamentally different approach.

**Fix:** Replace the snapshot-based system with a monotonic version counter:

```ts
let _editVersion = $state<number>(0);   // bumps on every mutation
let _savedVersion = $state<number>(0);  // captured at save time

// O(1) dirty check — no serialization, no string comparison
function isDirty(): boolean {
  return _editVersion !== _savedVersion;
}

function markAsSaved(): void {
  _savedVersion = _editVersion;
}
```

Every mutation action calls `bumpVersion()` which increments `_editVersion`. All 11 mutation actions are covered: `updateWorkflow`, `restoreFromHistory`, `updateNodes`, `updateEdges`, `updateName`, `addNode`, `removeNode`, `addEdge`, `removeEdge`, `updateNode`, `updateMetadata`, `batchUpdate`, `swapNode`.

**What was removed:**
- `isDirtyState` boolean flag
- `savedSnapshot` JSON string
- `createSnapshot()` — JSON.stringify snapshot builder
- `updateDirtyState()` — snapshot comparison function

**What was added:**
- `_editVersion` / `_savedVersion` — two `$state<number>` values
- `bumpVersion()` — internal helper, also fires `onDirtyStateChangeCallback` on clean→dirty transition
- `getEditVersion()` — exported for save verification protocol

### Save Verification Protocol

`getEditVersion()` is exported so consumers can implement optimistic save verification against a backend API:

```ts
// 1. Capture version before save
const submittedVersion = getEditVersion();

// 2. Include in save request
const response = await api.save(workflow, { clientVersion: submittedVersion });

// 3. Backend echoes the version — verify it matches
if (response.echoedVersion === submittedVersion) {
  markAsSaved();  // Backend confirmed — mark clean
} else {
  // Backend didn't persist our version — reset from backend state
  workflowActions.initialize(response.workflow);
}
```

If the user makes edits *during* the save flight, `_editVersion` advances past `submittedVersion`. After `markAsSaved()`, those concurrent edits are still tracked as dirty because `_editVersion > _savedVersion` only briefly became equal before the new edits bumped it again.

The version is a plain integer — `Number.MAX_SAFE_INTEGER` (9,007,199,254,740,991) is unreachable in practice. It resets to 0 on `initialize()` and `clear()`.

**Verify:** `pnpm test -- tests/unit/stores/workflowStore.test.ts` — 7 new tests covering version increment, reset, markAsSaved, and the save verification protocol.

---

## Execution Priority

**Drag freeze fixes (do these first, together):**
1. **P3** — SvelteMap batching (root cause)
2. **P2** — Cache cycle check + FSM guard (DFS per frame)
3. **P1** — Edge styling Map lookup (O(E×N) per connection)

**High-impact rendering:**
4. **P4** — Double bezier elimination (halves edge math)
5. **P5** — Sidebar duplicate filtering (search jank)

**Store efficiency:**
6. **P7** — Reference comparison in hasWorkflowDataChanged
7. **P11** — Version counter replaces JSON snapshot dirty detection (supersedes P7's fragility)
8. **P8** — structuredClone for history
9. **P6** — Proximity compatible types cache

**Low priority:**
10. **P9** — Playground message insertion sort
11. **P10** — Interrupt count without array allocation

---

## Commit Strategy

```
1. perf(stores): batch SvelteMap updates in portCoordinateStore [P3]
2. fix(editor): cache cycle detection as $derived with FSM guard [P2]
3. perf(helpers): use Map lookup for edge styling node resolution [P1]
4. perf(edge): eliminate redundant bezier path calculation [P4]
5. fix(sidebar): eliminate duplicate search filtering, use plain Set [P5]
6. perf(stores): use reference comparison in hasWorkflowDataChanged [P7]
7. perf(stores): replace JSON snapshot dirty detection with version counter [P11]
8. perf(history): replace JSON round-trip with structuredClone [P8]
9. perf(proximity): cache compatible types lookup per dataType [P6]
10. perf(playground): use insertion sort for single message addition [P9]
11. perf(interrupts): count pending without array allocation [P10]
```

## Verification

After all changes:
- `cd libs/flowdrop && pnpm check` (type check)
- `pnpm test` (all unit tests)
- `pnpm build` (library builds)
- Manual: open editor with 20+ node workflow, drag nodes rapidly — no freeze
- Manual: connect edges — correct colors, arrowheads aligned
- Manual: undo/redo — works correctly with large workflows
- Manual: search sidebar — instant filtering
