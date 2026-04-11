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
    inventory: [], // array of item ids, e.g. ["flashlight"]
    flags: {}, // e.g. { grandpaTalked: true }
    removedHotspots: {}, // { roomId: Set of hotspot ids that have been removed }
    dialogueQueue: [], // remaining lines to show in the dialogue box
  };

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

  // ----- Rendering --------------------------------------------------------
  function renderScene() {
    const scene = SCENES[state.currentRoom];
    if (!scene) {
      console.error("Unknown room:", state.currentRoom);
      return;
    }

    // Reset the scene element and apply the room's background class.
    sceneEl.className = "";
    sceneEl.classList.add(scene.background);
    sceneEl.innerHTML = "";

    // Draw each hotspot that hasn't been removed.
    scene.hotspots.forEach((hotspot) => {
      if (isHotspotRemoved(state.currentRoom, hotspot.id)) return;

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

    // Draw Ruby at the room's start position.
    const ruby = document.createElement("div");
    ruby.id = "ruby";
    ruby.textContent = "👧";
    ruby.style.left = scene.rubyStart.x + "%";
    ruby.style.top = scene.rubyStart.y + "%";
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

  // ----- Action dispatch --------------------------------------------------
  function handleHotspotClick(hotspot) {
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

      case "look":
        if (action.message) showDialogue(action.message);
        break;

      case "goto":
        if (action.room && SCENES[action.room]) {
          state.currentRoom = action.room;
          renderScene();
        }
        break;

      default:
        console.warn("Unknown action type:", action.type);
    }
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
