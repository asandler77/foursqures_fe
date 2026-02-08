## Four in a Square (“Arba BaRibua”) — React Native Game Spec

Build a React Native game called **“Four in a Square”** (Hebrew: **“Arba BaRibua”**) for **2 players**.

### IMPORTANT WORKFLOW NOTE
This description is a general guide. **Do NOT generate the whole solution in one big bulk.**  
Work in **small chunks/steps**. Before each chunk, briefly explain what you are going to do next, then output only that chunk.  
**Wait for my confirmation or next instruction** before continuing to the next chunk.

## Board
- **3x3 grid** of big squares (total **9**).
- Each big square contains a **2x2 mini-grid** (**4 slots**).
- Each slot can hold **at most one piece**.
- Two players: **Red (R)** and **Blue (B)**.

## Game start
- The board starts **EMPTY** (no pieces on the board).

## Turn-based gameplay
- Players alternate turns.
- Each turn has **TWO phases**:

### 1) Placement phase (early game)
- The player places **ONE** of their pieces into **any empty slot** on the board.
- Continue placing until all pieces are placed (**choose piece count; default 4 per player unless specified**).

### 2) Movement phase (after placement is finished)
- The player moves **exactly ONE** of their pieces per turn.
- A move = **slide** the selected piece to an adjacent slot according to the movement rules:
  - Movement is only between **neighboring big squares** (up/down/left/right).
  - The piece moves into an **empty slot** in the adjacent big square (**no diagonal moves**).
  - No jumping; destination slot must be empty.

## Win condition (UPDATED)
A player wins if they form a **2x2 solid block** of their color (**RR/RR** or **BB/BB**) inside the **UNION of TWO ADJACENT big squares**.

The winning 2x2 block can be:
- Fully inside **one** big square (classic 2x2 fill), OR
- **Straddling** the boundary between two adjacent big squares (horizontal or vertical adjacency).

In other words, consider any pair of adjacent big squares:
- **Horizontal pair** forms a **2x4** area; a win exists if there is any **2x2** sub-block of the same color inside it.
- **Vertical pair** forms a **4x2** area; a win exists if there is any **2x2** sub-block of the same color inside it.

### Example win patterns in a 2x4 area (`|` = boundary)
1)
```
[ R R | . . ]
[ R R | . . ]
```
2)
```
[ . . | R R ]
[ . . | R R ]
```
3)
```
[ . R | R . ]
[ . R | R . ]
```

### Example win patterns in a 4x2 area (vertical adjacency; boundary between row 2 and 3)
1)
```
[ R R ]
[ R R ]
[ . . ]
[ . . ]
```
2)
```
[ . . ]
[ . . ]
[ R R ]
[ R R ]
```
3)
```
[ . . ]
[ R R ]
[ R R ]
[ . . ]
```

Same patterns apply for **Blue** (replace **R** with **B**).

## End condition
- Define what happens if **no moves are available** (**draw or loss**) and implement consistently.

## UI requirements
- Show the **3x3 board** with tile styling and **red/blue pieces**.
- During placement: **tap an empty slot** to place a piece.
- During movement: **tap a piece to select it**; **highlight valid destination slots**; tap destination to move.
- Show **current player** turn indicator (Red / Blue), **current phase** (Placement / Movement), and a **Restart** button.

