# Help Grandpa Find His Glasses

A tiny point-and-click adventure game where Ruby (a blonde 8-year-old) helps Grandpa
find the glasses he keeps misplacing. Built as a co-creation project — no build
step, no dependencies, just open the file in a browser.

## How to play

1. Open `index.html` in any modern browser (or visit the deployed URL).
2. Click **Start the Adventure** on the title screen.
3. Click on people and things in each room to look at them or pick them up.
4. To **use** an item from your pocket, click it once (it'll glow yellow), then
   click on something in the room. Click the same item again to deselect.
5. If you get stuck, walk back to Grandpa and click him — he gives different
   hints depending on how far you've gotten.

There are three rooms — the living room, the kitchen, and the garden — and the
puzzles all chain together. When Ruby finds the glasses, she'll automatically
take them back to Grandpa for the win sequence.

## File structure

```
├── index.html        # markup shell: scene, dialogue, inventory, overlays
├── style.css         # all the visuals, animations, room backgrounds
├── game.js           # state, renderer, click dispatch, sounds, win flow
├── data/
│   └── scenes.js     # ITEMS, SCENES, WIN_LINES — all the game content
├── render.yaml       # Render.com static-site deploy blueprint
└── README.md         # this file
```

The split is deliberate: **`data/scenes.js` is content**, and **`game.js` is the
engine**. You can add a whole new room or rewrite the puzzle without touching
the engine — just edit `data/scenes.js`.

## How to add a new hotspot

A hotspot is one clickable thing in a room. Open `data/scenes.js`, find the
`hotspots` array for the room you want, and add an entry:

```js
{
  id: "rubber-duck",        // unique id within the room
  label: "Rubber duck",     // shown on hover
  emoji: "🦆",
  x: 60, y: 70,             // position as a percentage of the room (0-100)
  size: 48,                 // optional, default 48
  onClick: {
    type: "look",
    message: "A cheerful little rubber duck. Squeak squeak.",
  },
},
```

Action types you can use in `onClick`:

- **`look`** — show a message. Optional `messageWhen: [{ flag, message }]`
  lets the description change after a flag is set.
- **`pickup`** — add an item to the inventory. Supports `item`, `setsFlag`,
  `removeHotspot: true`, `message`, and `thenGoto: "room-id"` to chain a
  room transition after the message.
- **`talk`** — show dialogue. Supports `lines`, `setsFlag`, and `linesByState`
  for progressive hints based on flags.
- **`goto`** — change rooms. Supports `room` and `disabledMessage`. Combine
  with `requires: [flag]` to gate a door behind a flag.

To make a hotspot react when an item is **used** on it, give it an `onUse`
map keyed by item id:

```js
onUse: {
  flashlight: {
    message: "You shine the flashlight and find a hidden coin!",
    setsFlag: "coinRevealed",
  },
}
```

A use action can also `swapItem: "newId"` (replace the used item with another)
or `consumesItem: true` (remove it).

To **hide** a hotspot until a flag is set, add `hiddenUntil: ["someFlag"]`.
To show it but **disable** it until a flag is set, use `requires: ["someFlag"]`.

## How to add a new room

Add another entry under `SCENES`:

```js
attic: {
  name: "The Dusty Attic",
  background: "room-attic",        // CSS class for the background
  rubyStart: { x: 50, y: 70 },
  rubyStartFrom: {                  // optional per-door entry positions
    "living-room": { x: 12, y: 70 },
  },
  hotspots: [
    /* ... */
  ],
},
```

Then add a matching room background in `style.css`:

```css
#scene.room-attic {
  background: linear-gradient(#3a3147 0%, #3a3147 60%, #1f1a28 60%, #1f1a28 100%);
}
```

Finally, link the new room from an existing one with a `goto` hotspot:

```js
{
  id: "attic-stairs",
  label: "Attic",
  emoji: "🪜",
  x: 5, y: 30,
  onClick: { type: "goto", room: "attic" },
},
```

## How to add a new item

Add it to `ITEMS` at the top of `data/scenes.js`:

```js
const ITEMS = {
  // ...
  coin: {
    emoji: "🪙",
    name: "Lucky Coin",
    rejection: "The coin doesn't fit there.",
  },
};
```

The `rejection` line is what Grandpa says when Ruby tries to use the item
somewhere it doesn't belong.

## How to deploy

This game is a static site, so it deploys for free on **Render**:

1. Go to [dashboard.render.com](https://dashboard.render.com) → **New** → **Blueprint**.
2. Connect this repo and pick the branch you want to deploy.
3. Render reads `render.yaml` automatically and creates a static site at
   `https://grandpa-glasses-game.onrender.com` (or similar).
4. Every push to that branch will auto-redeploy.

You can also just open `index.html` directly in a browser — there's no server
needed and no API keys involved.

## Stuck?

<details>
<summary>Walkthrough (spoilers!)</summary>

1. Talk to Grandpa
2. Take the flashlight from the bookshelf
3. Walk to the kitchen and read the newspaper
4. Use the flashlight on the fridge to spot a key behind it
5. Pick up the key
6. Use the key on the garden gate, then walk through
7. Pick up the watering can on the garden path
8. Use the watering can on the bird bath to fill it
9. Use the full watering can on the droopy sunflower
10. Pick up the glasses that appear in the dirt

</details>
