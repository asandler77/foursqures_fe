# Four in a Square (ארבע בריבוע) — Game Spec & API Contract

## Overview

**"Four in a Square"** (Hebrew: **"Arba BaRibua"**) — a board game where **a human player (Red)** plays against **an AI server (Blue)**.

---

## Board

- **3×3 grid** of squares (total **9 squares**, indexed `0..8`).
- Each square contains a **2×2 mini-grid** (**4 slots**, indexed `0..3`).
- Slot layout inside each square:

```
 0 | 1
---|---
 2 | 3
```

- Total: **36 slots** on the board.
- **One square is always empty** (the "hole") — like an 8-puzzle. At the start of the game, the hole is at **squareIndex 4** (center).

### Square index layout (3×3)

```
 0 | 1 | 2
---|---|---
 3 | 4 | 5      ← 4 = initial hole (empty square)
---|---|---
 6 | 7 | 8
```

---

## Players

| Player | Color | Role |
|--------|-------|------|
| **R** (Red) | Red pieces | Human (client) |
| **B** (Blue) | Blue pieces | AI (server) |

---

## Pieces

- Default: **8 pieces per player** (16 total).
- Configurable per game via `piecesPerPlayer`.

---

## Game Flow

### Turn structure

Players alternate turns. **Red always goes first.**

Each turn consists of **two mandatory actions**:

#### 1) Place a piece

The current player places **one** piece into any **empty slot** on the board.
- Cannot place into the **hole square** (the empty square).

#### 2) Slide a square

After placing, the current player **must slide one neighboring square into the hole**.
- Only squares **adjacent to the hole** (up/down/left/right) can slide.
- The sliding square **swaps** with the hole — all pieces inside the square **move with it**.
- No diagonal slides.

After both actions, the turn passes to the other player.

### Phases

| Phase | Description |
|-------|-------------|
| `placement` | Player must **place** a piece into an empty slot |
| `placementSlide` | Player just placed a piece; must now **slide** a square |
| `movement` | All pieces placed; player must only **slide** a square (no placement) |

- **Placement** continues until both players have placed all their pieces.
- After all pieces are placed → phase becomes **`movement`**.
- In **movement**, each turn is **only a slide** (no piece placement).

---

## Win Condition

A player wins immediately if they form a **2×2 solid block** of their color **anywhere** on the overall **6×6 mini-grid**.

This includes:
- Fully inside **one** square (all 4 slots same color).
- **Straddling** the boundary of **two adjacent** squares (horizontal or vertical).
- **Spanning the intersection** of **four** squares (corners touching).

The check is performed on the global 6×6 grid (3 squares × 2 slots = 6 in each dimension). Any 2×2 sub-block of the same color at any position `(row, col)` where `0 ≤ row ≤ 4` and `0 ≤ col ≤ 4` triggers a win.

### Global coordinate mapping

```
globalRow = squareRow * 2 + miniRow      (0..5)
globalCol = squareCol * 2 + miniCol      (0..5)

squareRow = floor(squareIndex / 3)
squareCol = squareIndex % 3
miniRow   = floor(slotIndex / 2)
miniCol   = slotIndex % 2
```

---

## Draw / No-moves

- In **movement** phase, if the current player has **zero legal slides** (no neighbor of the hole exists — should not happen on a 3×3 grid), the game ends as **draw**.

---

## Data Model (field names — must match between client & server)

### GameState

```json
{
  "board": [[null, "R", null, null], ...],   // 9 arrays of 4 slots each
  "phase": "placement",                       // "placement" | "placementSlide" | "movement"
  "currentPlayer": "R",                       // "R" | "B"
  "placed": { "R": 0, "B": 0 },             // pieces placed so far
  "piecesPerPlayer": 8,
  "holeSquareIndex": 4,                       // which square is the hole (0..8)
  "selectedSquareIndex": null,                // client-only (not needed in API)
  "winner": null,                             // null | "R" | "B"
  "drawReason": null                          // null | string
}
```

### SlotValue

`null` (empty), `"R"` (red piece), or `"B"` (blue piece).

### Board

Array of **9 elements** (one per square). Each element is an array of **4 SlotValues** (one per slot).

```
board[squareIndex][slotIndex] → SlotValue
```

---

## REST API

### Base URL

```
http://127.0.0.1:8000
```

### Endpoints

#### `POST /games` — Create a new game

**Request body:**
```json
{
  "piecesPerPlayer": 8
}
```

**Response:**
```json
{
  "gameId": "abc123",
  "playerToken": "tok_xxx",
  "state": { /* GameState */ }
}
```

- Human plays as **Red (`"R"`)**.
- Server / AI plays as **Blue (`"B"`)**.
- `playerToken` authenticates the human player for subsequent requests.

---

#### `GET /games/{gameId}` — Get current game state

**Response:**
```json
{
  "state": { /* GameState */ }
}
```

---

#### `POST /games/{gameId}/move` — Submit a move

The human sends their action. The server:
1. Validates and applies the human's action.
2. Checks for win/draw.
3. If the game is not over and it's AI's turn, the AI makes its move(s).
4. Checks for win/draw again.
5. Returns the updated state (after both human and AI moves).

**Request body (placement phase — place a piece):**
```json
{
  "action": "place",
  "squareIndex": 0,
  "slotIndex": 2,
  "playerToken": "tok_xxx"
}
```

**Request body (placementSlide phase — slide a square):**
```json
{
  "action": "slide",
  "squareIndex": 3,
  "playerToken": "tok_xxx"
}
```

**Request body (movement phase — slide only):**
```json
{
  "action": "slide",
  "squareIndex": 1,
  "playerToken": "tok_xxx"
}
```

**Response (success):**
```json
{
  "state": { /* GameState — after human move + AI move */ }
}
```

**Response (error):**
```json
{
  "error": "Invalid move: slot is occupied"
}
```

**Note:** `squareIndex` in a `slide` action refers to the square being slid **into the hole** (must be adjacent to `holeSquareIndex`).

---

#### `POST /games/{gameId}/restart` — Restart the game

**Response:**
```json
{
  "state": { /* fresh GameState */ }
}
```

---

## Client → Server Flow (typical turn)

### During placement:

```
1. Human taps a slot
   → POST /games/{id}/move  { action: "place", squareIndex, slotIndex }
   ← Server validates, applies placement

2. Human taps a highlighted square to slide
   → POST /games/{id}/move  { action: "slide", squareIndex }
   ← Server validates, applies slide, then AI does its turn (place + slide)
   ← Returns state after both players' turns
```

### During movement:

```
1. Human taps a highlighted square to slide
   → POST /games/{id}/move  { action: "slide", squareIndex }
   ← Server validates, applies slide, then AI does its slide
   ← Returns state after both players' turns
```

---

## UI Requirements (client-side)

- Show the **3×3 board** with square tiles and **red/blue pieces**.
- The **hole square** is rendered with a dashed border (transparent background).
- During placement: **tap an empty slot** to place a piece.
- During placementSlide / movement: **squares adjacent to the hole** are highlighted with a **green dashed border**. Tap a highlighted square to slide it into the hole (one tap).
- Show **current player** turn indicator, **current phase**, piece counts, and a **Restart** button.
