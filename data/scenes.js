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
    rubyStart: { x: 50, y: 70 },
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

  // Stub kitchen for Milestone 1 - we'll fill this out in Milestone 2.
  kitchen: {
    name: "Grandpa's Kitchen",
    background: "room-kitchen",
    rubyStart: { x: 12, y: 70 },
    hotspots: [
      {
        id: "kitchen-placeholder",
        label: "Coming soon",
        emoji: "🚧",
        x: 50,
        y: 50,
        size: 64,
        onClick: {
          type: "look",
          message: "The rest of the kitchen will be ready in Milestone 2!",
        },
      },
      {
        id: "back-to-living-room",
        label: "Back",
        emoji: "🚪",
        x: 8,
        y: 55,
        size: 56,
        onClick: { type: "goto", room: "living-room" },
      },
    ],
  },
};
