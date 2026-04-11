/**
 * Help Grandpa Find His Glasses - main game script.
 *
 * This file holds the game state, draws the current scene, and handles
 * what happens when you click on things. It reads scene data from
 * data/scenes.js (which defines the global SCENES and ITEMS).
 */

(function () {
  "use strict";

  // ----- Game state -------------------------------------------------------
  const state = {
    currentRoom: "living-room",
    lastRoom: null, // the room Ruby just came from (used to position her on entry)
    inventory: [], // array of item ids, e.g. ["flashlight"]
    selectedItem: null, // currently selected inventory item id, if any
    flags: {}, // e.g. { grandpaTalked: true }
    removedHotspots: {}, // { roomId: Set of hotspot ids that have been removed }
    dialogueQueue: [], // remaining lines to show in the dialogue box
    transitioning: false, // true while a fade between rooms is in progress
  };

  const FADE_MS = 180;

  // ----- DOM references ---------------------------------------------------
  const sceneEl = document.getElementById("scene");
  const dialogueEl = document.getElementById("dialogue");
  const dialogueTextEl = document.getElementById("dialogue-text");
  const dialogueNextEl = document.getElementById("dialogue-next");
  const inventoryListEl = document.getElementById("inventory-list");

  // ----- Helpers ----------------------------------------------------------
  function isHotspotRemoved(roomId, hotspotId) {
    const set = state.removedHotspots[roomId];
    return set ? set.has(hotspotId) : false;
  }

  function removeHotspot(roomId, hotspotId) {
    if (!state.removedHotspots[roomId]) {
      state.removedHotspots[roomId] = new Set();
    }
    state.removedHotspots[roomId].add(hotspotId);
  }

  function hotspotEnabled(hotspot) {
    if (!hotspot.requires) return true;
    return hotspot.requires.every((flag) => state.flags[flag]);
  }

  function isHotspotHidden(hotspot) {
    if (!hotspot.hiddenUntil) return false;
    return hotspot.hiddenUntil.some((flag) => !state.flags[flag]);
  }

  // Picks the right look message based on flags. messageWhen entries are
  // checked in order; the first matching flag wins.
  function lookMessage(action) {
    if (action.messageWhen) {
      for (const entry of action.messageWhen) {
        if (state.flags[entry.flag]) return entry.message;
      }
    }
    return action.message;
  }

  // ----- Rendering --------------------------------------------------------
  function renderScene() {
    const scene = SCENES[state.currentRoom];
    if (!scene) {
      console.error("Unknown room:", state.currentRoom);
      return;
    }

    // Remove any previous room-* class but preserve other classes (like
    // "fading") that the transition logic owns.
    Array.from(sceneEl.classList).forEach((cls) => {
      if (cls.startsWith("room-")) sceneEl.classList.remove(cls);
    });
    sceneEl.classList.add(scene.background);
    sceneEl.innerHTML = "";

    // Draw each hotspot that hasn't been removed or hidden.
    scene.hotspots.forEach((hotspot) => {
      if (isHotspotRemoved(state.currentRoom, hotspot.id)) return;
      if (isHotspotHidden(hotspot)) return;

      const el = document.createElement("div");
      el.className = "hotspot";
      if (!hotspotEnabled(hotspot)) {
        el.classList.add("disabled");
      }
      el.style.left = hotspot.x + "%";
      el.style.top = hotspot.y + "%";
      el.style.fontSize = (hotspot.size || 48) + "px";
      el.textContent = hotspot.emoji;

      const labelEl = document.createElement("span");
      labelEl.className = "label";
      labelEl.textContent = hotspot.label;
      el.appendChild(labelEl);

      el.addEventListener("click", () => handleHotspotClick(hotspot));
      sceneEl.appendChild(el);
    });

    // Pick Ruby's entry position. If we know which door she came through,
    // use the rubyStartFrom map; otherwise fall back to rubyStart.
    const start =
      (scene.rubyStartFrom && scene.rubyStartFrom[state.lastRoom]) ||
      scene.rubyStart;

    const ruby = document.createElement("div");
    ruby.id = "ruby";
    ruby.textContent = "👧";
    ruby.style.left = start.x + "%";
    ruby.style.top = start.y + "%";
    sceneEl.appendChild(ruby);
  }

  function renderInventory() {
    inventoryListEl.innerHTML = "";
    state.inventory.forEach((itemId) => {
      const item = ITEMS[itemId];
      if (!item) return;
      const li = document.createElement("li");
      li.textContent = item.emoji;
      li.title = item.name;
      if (state.selectedItem === itemId) {
        li.classList.add("selected");
      }
      li.addEventListener("click", () => {
        // Click an item to select it; click again (or click another) to swap.
        state.selectedItem = state.selectedItem === itemId ? null : itemId;
        renderInventory();
      });
      inventoryListEl.appendChild(li);
    });
  }

  // ----- Dialogue ---------------------------------------------------------
  function showDialogue(lines) {
    state.dialogueQueue = Array.isArray(lines) ? lines.slice() : [String(lines)];
    advanceDialogue();
  }

  function advanceDialogue() {
    if (state.dialogueQueue.length === 0) {
      dialogueEl.classList.add("hidden");
      return;
    }
    const next = state.dialogueQueue.shift();
    dialogueTextEl.textContent = next;
    dialogueEl.classList.remove("hidden");
  }

  dialogueNextEl.addEventListener("click", advanceDialogue);

  // ----- Room transitions ------------------------------------------------
  function gotoRoom(roomId) {
    if (state.transitioning || state.currentRoom === roomId) return;
    state.transitioning = true;

    // Hide any active dialogue so it doesn't bleed across rooms.
    state.dialogueQueue = [];
    dialogueEl.classList.add("hidden");

    sceneEl.classList.add("fading");

    setTimeout(() => {
      state.lastRoom = state.currentRoom;
      state.currentRoom = roomId;
      renderScene();
      // Force the new content to paint at opacity 0, then fade back in.
      requestAnimationFrame(() => {
        sceneEl.classList.remove("fading");
        state.transitioning = false;
      });
    }, FADE_MS);
  }

  // ----- Action dispatch --------------------------------------------------
  function handleHotspotClick(hotspot) {
    if (state.transitioning) return;

    // ----- Use intent: an inventory item is selected. -------------------
    // Use actions bypass the requires check, because using is the way to
    // satisfy whatever requirement is gating the hotspot.
    if (state.selectedItem) {
      const itemId = state.selectedItem;
      state.selectedItem = null; // clear the selection before mutating inventory
      const useAction = hotspot.onUse && hotspot.onUse[itemId];
      if (useAction) {
        applyUse(useAction, itemId);
      } else {
        const item = ITEMS[itemId];
        showDialogue((item && item.rejection) || "That doesn't work here.");
      }
      renderInventory();
      return;
    }

    // ----- Click intent: no inventory item selected. --------------------
    if (!hotspotEnabled(hotspot)) {
      const action = hotspot.onClick;
      if (action && action.disabledMessage) {
        showDialogue(action.disabledMessage);
      }
      return;
    }

    const action = hotspot.onClick;
    if (!action) return;

    switch (action.type) {
      case "talk":
        if (action.lines) showDialogue(action.lines);
        if (action.setsFlag) {
          state.flags[action.setsFlag] = true;
          // Re-render so any newly-enabled hotspots reflect the change.
          renderScene();
        }
        break;

      case "pickup":
        if (action.item && !state.inventory.includes(action.item)) {
          state.inventory.push(action.item);
          renderInventory();
        }
        if (action.removeHotspot) {
          removeHotspot(state.currentRoom, hotspot.id);
        }
        if (action.message) showDialogue(action.message);
        renderScene();
        break;

      case "look": {
        const msg = lookMessage(action);
        if (msg) showDialogue(msg);
        break;
      }

      case "goto":
        if (action.room && SCENES[action.room]) {
          gotoRoom(action.room);
        }
        break;

      default:
        console.warn("Unknown action type:", action.type);
    }
  }

  // Apply a use action: show the message, set any flag, and update the
  // inventory item (swap or consume) as the data dictates.
  function applyUse(useAction, itemId) {
    if (useAction.setsFlag) {
      state.flags[useAction.setsFlag] = true;
    }
    if (useAction.swapItem) {
      const idx = state.inventory.indexOf(itemId);
      if (idx >= 0) state.inventory[idx] = useAction.swapItem;
    } else if (useAction.consumesItem) {
      const idx = state.inventory.indexOf(itemId);
      if (idx >= 0) state.inventory.splice(idx, 1);
    }
    if (useAction.message) showDialogue(useAction.message);
    renderScene();
  }

  // ----- Boot -------------------------------------------------------------
  function start() {
    renderScene();
    renderInventory();
  }

  // Wait for the DOM to be ready before booting.
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
