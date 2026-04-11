/**
 * Scene definitions for "Help Grandpa Find His Glasses".
 *
 * Each scene describes a room: its background, where Ruby starts when she
 * walks in, and the list of clickable hotspots.
 *
 * A hotspot has:
 *   id          - unique within the scene
 *   label       - tooltip shown on hover
 *   emoji       - what's drawn for it
 *   x, y        - position as a percentage of the scene (0-100)
 *   size        - optional font-size in pixels (default 48)
 *   requires    - optional list of flag names. If unmet, hotspot renders DISABLED.
 *   hiddenUntil - optional list of flag names. If unmet, hotspot is NOT rendered.
 *   onClick     - an action that fires when no inventory item is selected
 *   onUse       - { itemId: useAction } map; fires when that item is selected
 *
 * onClick action types:
 *   { type: "talk",   lines: ["...", "..."], setsFlag?: "grandpaTalked" }
 *   { type: "pickup", item: "flashlight",  removeHotspot?: true, message?: "..." }
 *   { type: "look",   message: "...", messageWhen?: [{ flag, message }] }
 *   { type: "goto",   room: "kitchen", disabledMessage?: "..." }
 *
 * onUse useAction shape:
 *   { message: "...", setsFlag?: "...", swapItem?: "newId", consumesItem?: true }
 *
 * Items have an `emoji`, a `name`, and a `rejection` message used when the
 * player tries to use them somewhere they don't fit.
 */

const ITEMS = {
  flashlight: {
    emoji: "🔦",
    name: "Flashlight",
    rejection: "The flashlight isn't useful here.",
  },
  key: {
    emoji: "🗝️",
    name: "Brass Key",
    rejection: "There's nothing to unlock here.",
  },
  "watering-can": {
    emoji: "🪣",
    name: "Empty Watering Can",
    rejection: "The watering can is empty — you'd better fill it first.",
  },
  "watering-can-full": {
    emoji: "💧",
    name: "Full Watering Can",
    rejection: "Best not to pour water on that.",
  },
  glasses: {
    emoji: "👓",
    name: "Grandpa's Glasses",
    rejection: "You should give these straight to Grandpa.",
  },
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
          messageWhen: [
            {
              flag: "fridgeRevealed",
              message:
                "The gap behind the fridge is bright now from your flashlight beam. You can clearly see the brass key glinting back there.",
            },
          ],
        },
        onUse: {
          flashlight: {
            message:
              "You shine the flashlight into the dark gap behind the fridge. A glint of metal — there's a brass key back there!",
            setsFlag: "fridgeRevealed",
          },
        },
      },
      {
        id: "fridge-key",
        label: "Brass key",
        emoji: "🗝️",
        x: 80,
        y: 48,
        size: 36,
        hiddenUntil: ["fridgeRevealed"],
        onClick: {
          type: "pickup",
          item: "key",
          removeHotspot: true,
          message: "You squeeze your arm behind the fridge and grab the brass key.",
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
            "Today's newspaper, opened to the gardening section. A muddy thumbprint smudges an article titled 'Sunflower Care: Watering at Daybreak'. Grandpa must have been reading this just before heading outside.",
        },
      },
      {
        id: "garden-gate",
        label: "Garden gate",
        emoji: "🚪",
        x: 93,
        y: 55,
        size: 56,
        requires: ["gardenUnlocked"],
        onClick: {
          type: "goto",
          room: "garden",
          disabledMessage:
            "The garden gate is locked tight. You'd need a key to open it.",
        },
        onUse: {
          key: {
            message:
              "Click! The brass key fits perfectly. The garden gate swings open.",
            setsFlag: "gardenUnlocked",
          },
        },
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
          message:
            "A pretty stone bird bath, brim-full with cool rainwater from last night.",
        },
        onUse: {
          "watering-can": {
            message: "You dip the watering can into the bird bath until it's full.",
            swapItem: "watering-can-full",
          },
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
          message:
            "A tall sunflower, looking droopy and sad. The earth around it is bone dry — it badly needs water.",
          messageWhen: [
            {
              flag: "sunflowerWatered",
              message:
                "The sunflower stands tall and proud now, soaking up the sun. Much happier!",
            },
          ],
        },
        onUse: {
          "watering-can-full": {
            message:
              "You tip the watering can over the sunflower's roots. The earth drinks it up — and as the soil settles, something glints in the dirt!",
            setsFlag: "sunflowerWatered",
            consumesItem: true,
          },
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
          type: "pickup",
          item: "watering-can",
          removeHotspot: true,
          message: "You pick up the empty watering can.",
        },
      },
      {
        id: "garden-glasses",
        label: "Glasses!",
        emoji: "👓",
        x: 58,
        y: 62,
        size: 44,
        hiddenUntil: ["sunflowerWatered"],
        onClick: {
          type: "pickup",
          item: "glasses",
          removeHotspot: true,
          message:
            "You did it! Grandpa's glasses were buried in the dirt by the sunflower the whole time. Better get these back to him!",
        },
      },
    ],
  },
};
