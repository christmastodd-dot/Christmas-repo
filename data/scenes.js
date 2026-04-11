/**
 * Scene definitions for "Help Grandpa Find His Glasses".
 *
 * Each scene describes a room: its background, where Ruby starts when she
 * walks in, and the list of clickable hotspots.
 *
 * A hotspot has:
 *   id      - unique within the scene
 *   label   - tooltip shown on hover
 *   emoji   - what's drawn for it
 *   x, y    - position as a percentage of the scene (0-100)
 *   size    - optional font-size in pixels (default 48)
 *   requires - optional list of flag names that must be set for it to be enabled
 *   onClick - an action object: { type: "talk" | "pickup" | "goto" | "look", ... }
 *
 * Action types (Milestone 1):
 *   { type: "talk",   lines: ["...", "..."], setsFlag: "grandpaTalked" }
 *   { type: "pickup", item: "flashlight",  removeHotspot: true, message: "..." }
 *   { type: "look",   message: "..." }
 *   { type: "goto",   room: "kitchen", disabledMessage: "..." }
 *
 * Items (Milestone 1):
 *   flashlight  - 🔦
 */

const ITEMS = {
  flashlight: { emoji: "🔦", name: "Flashlight" },
};

const SCENES = {
  "living-room": {
    name: "Grandpa's Living Room",
    background: "room-living-room",
    rubyStart: { x: 50, y: 72 },
    rubyStartFrom: {
      kitchen: { x: 88, y: 72 },
    },
    hotspots: [
      {
        id: "grandpa",
        label: "Grandpa",
        emoji: "🧓",
        x: 22,
        y: 55,
        size: 64,
        onClick: {
          type: "talk",
          lines: [
            "Oh hi, Ruby! I'm in a pickle...",
            "I can't find my glasses anywhere!",
            "I had them this morning when I started in the kitchen.",
            "Could you help me look around the house?",
          ],
          setsFlag: "grandpaTalked",
        },
      },
      {
        id: "armchair",
        label: "Armchair",
        emoji: "🛋️",
        x: 22,
        y: 70,
        size: 56,
        onClick: {
          type: "look",
          message: "Grandpa's favorite armchair. He's sitting in it.",
        },
      },
      {
        id: "bookshelf",
        label: "Bookshelf",
        emoji: "📚",
        x: 75,
        y: 30,
        size: 56,
        onClick: {
          type: "pickup",
          item: "flashlight",
          removeHotspot: true,
          message: "You found a flashlight tucked between the books!",
        },
      },
      {
        id: "couch",
        label: "Couch",
        emoji: "🛋️",
        x: 55,
        y: 65,
        size: 56,
        onClick: {
          type: "look",
          message: "A cozy couch. You check between the cushions — no glasses here.",
        },
      },
      {
        id: "kitchen-door",
        label: "Kitchen",
        emoji: "🚪",
        x: 90,
        y: 55,
        size: 56,
        requires: ["grandpaTalked"],
        onClick: {
          type: "goto",
          room: "kitchen",
          disabledMessage: "Better talk to Grandpa first to find out what's going on.",
        },
      },
    ],
  },

  kitchen: {
    name: "Grandpa's Kitchen",
    background: "room-kitchen",
    // Default entry position; rubyStartFrom overrides this when she walks
    // in from a known door so she enters from the correct side.
    rubyStart: { x: 12, y: 72 },
    rubyStartFrom: {
      "living-room": { x: 12, y: 72 },
      garden: { x: 88, y: 72 },
    },
    hotspots: [
      {
        id: "door-living-room",
        label: "Living Room",
        emoji: "🚪",
        x: 7,
        y: 55,
        size: 56,
        onClick: { type: "goto", room: "living-room" },
      },
      {
        id: "cupboards",
        label: "Cupboards",
        emoji: "🗄️",
        x: 30,
        y: 25,
        size: 56,
        onClick: {
          type: "look",
          message: "Tidy cupboards full of plates and tea cups. No glasses in here.",
        },
      },
      {
        id: "fridge",
        label: "Fridge",
        emoji: "🧊",
        x: 70,
        y: 35,
        size: 64,
        onClick: {
          type: "look",
          message:
            "An old humming fridge. There's a gap between it and the wall — too dark to see what's back there.",
        },
      },
      {
        id: "table",
        label: "Table",
        emoji: "🪑",
        x: 50,
        y: 70,
        size: 56,
        onClick: {
          type: "look",
          message: "Grandpa's kitchen table. Crumbs from breakfast still sit on it.",
        },
      },
      {
        id: "newspaper",
        label: "Newspaper",
        emoji: "📰",
        x: 52,
        y: 58,
        size: 40,
        onClick: {
          type: "look",
          message:
            "Today's newspaper, the crossword half-finished. A muddy thumbprint on the gardening section catches your eye.",
        },
      },
      {
        id: "garden-gate",
        label: "Garden",
        emoji: "🚪",
        x: 93,
        y: 55,
        size: 56,
        // NOTE: In Milestone 3 this will gain a `requires: ["gardenUnlocked"]`
        // and the `use key` puzzle. For Milestone 2 the gate just opens so the
        // player can explore the garden scene.
        onClick: { type: "goto", room: "garden" },
      },
    ],
  },

  garden: {
    name: "Grandpa's Garden",
    background: "room-garden",
    rubyStart: { x: 12, y: 72 },
    rubyStartFrom: {
      kitchen: { x: 12, y: 72 },
    },
    hotspots: [
      {
        id: "door-kitchen",
        label: "Kitchen",
        emoji: "🚪",
        x: 7,
        y: 55,
        size: 56,
        onClick: { type: "goto", room: "kitchen" },
      },
      {
        id: "bird-bath",
        label: "Bird bath",
        emoji: "⛲",
        x: 32,
        y: 60,
        size: 64,
        onClick: {
          type: "look",
          message: "A pretty stone bird bath. Bone dry — it could really use some water.",
        },
      },
      {
        id: "sunflower",
        label: "Sunflower",
        emoji: "🌻",
        x: 55,
        y: 45,
        size: 72,
        onClick: {
          type: "look",
          message: "A tall sunflower, looking a little droopy. It needs water!",
        },
      },
      {
        id: "watering-can",
        label: "Watering can",
        emoji: "🪣",
        x: 80,
        y: 70,
        size: 52,
        onClick: {
          type: "look",
          message: "An empty watering can sitting on the garden path.",
        },
      },
    ],
  },
};
