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
  // initialState() returns a fresh state. resetGame() uses Object.assign so
  // closures keep their reference to `state`.
  function initialState() {
    return {
      currentRoom: "living-room",
      lastRoom: null, // the room Ruby just came from (used for entry positioning)
      inventory: [],
      selectedItem: null, // currently selected inventory item id, if any
      flags: {}, // e.g. { grandpaTalked: true }
      removedHotspots: {}, // { roomId: Set of removed hotspot ids }
      dialogueQueue: [],
      dialogueOnComplete: null, // optional callback fired when the queue empties
      transitioning: false, // true while a fade between rooms is in progress
    };
  }
  const state = initialState();

  const FADE_MS = 180;

  // ----- DOM references ---------------------------------------------------
  const sceneEl = document.getElementById("scene");
  const dialogueEl = document.getElementById("dialogue");
  const dialogueTextEl = document.getElementById("dialogue-text");
  const dialogueNextEl = document.getElementById("dialogue-next");
  const inventoryListEl = document.getElementById("inventory-list");
  const titleScreenEl = document.getElementById("title-screen");
  const startButtonEl = document.getElementById("start-button");
  const winScreenEl = document.getElementById("win-screen");
  const playAgainButtonEl = document.getElementById("play-again-button");
  const confettiEl = winScreenEl ? winScreenEl.querySelector(".confetti") : null;

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
  // showDialogue can take a single string or an array of lines, plus an
  // optional callback that fires once the player has dismissed the last line.
  function showDialogue(lines, onComplete) {
    state.dialogueQueue = Array.isArray(lines) ? lines.slice() : [String(lines)];
    state.dialogueOnComplete = onComplete || null;
    advanceDialogue();
  }

  function advanceDialogue() {
    if (state.dialogueQueue.length === 0) {
      dialogueEl.classList.add("hidden");
      const cb = state.dialogueOnComplete;
      state.dialogueOnComplete = null;
      if (cb) cb();
      return;
    }
    const next = state.dialogueQueue.shift();
    dialogueTextEl.textContent = next;
    dialogueEl.classList.remove("hidden");
  }

  dialogueNextEl.addEventListener("click", advanceDialogue);

  // Pick the right talk lines based on flags. linesByState entries are
  // checked in order; the first whose requireFlags are all set AND
  // forbidFlags are all unset wins. Falls back to action.lines.
  function talkLines(action) {
    if (action.linesByState) {
      for (const entry of action.linesByState) {
        const reqOk = (entry.requireFlags || []).every((f) => state.flags[f]);
        const forbidOk = (entry.forbidFlags || []).every((f) => !state.flags[f]);
        if (reqOk && forbidOk) return entry.lines;
      }
    }
    return action.lines;
  }

  // ----- Room transitions ------------------------------------------------
  function gotoRoom(roomId) {
    if (state.transitioning || state.currentRoom === roomId) return;
    state.transitioning = true;

    // Hide any active dialogue so it doesn't bleed across rooms. We also
    // clear the dialogue completion callback because the player won't be
    // able to dismiss the dialogue normally any more.
    state.dialogueQueue = [];
    state.dialogueOnComplete = null;
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
        maybeTriggerWin();
      });
    }, FADE_MS);
  }

  // If Ruby has just walked back into the living room with the glasses,
  // automatically fire Grandpa's win dialogue and then show the win screen.
  function maybeTriggerWin() {
    if (
      state.currentRoom === "living-room" &&
      state.flags.glassesPickedUp &&
      !state.flags.winShown
    ) {
      state.flags.winShown = true;
      showDialogue(WIN_LINES, showWinScreen);
    }
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
      case "talk": {
        const lines = talkLines(action);
        if (lines) showDialogue(lines);
        if (action.setsFlag) {
          state.flags[action.setsFlag] = true;
          // Re-render so any newly-enabled hotspots reflect the change.
          renderScene();
        }
        break;
      }

      case "pickup": {
        if (action.item && !state.inventory.includes(action.item)) {
          state.inventory.push(action.item);
        }
        if (action.removeHotspot) {
          removeHotspot(state.currentRoom, hotspot.id);
        }
        if (action.setsFlag) {
          state.flags[action.setsFlag] = true;
        }
        renderInventory();
        renderScene();
        // If the pickup chains into a room transition, fire it once the
        // player has dismissed the pickup message.
        const onComplete = action.thenGoto
          ? () => gotoRoom(action.thenGoto)
          : null;
        if (action.message) {
          showDialogue(action.message, onComplete);
        } else if (onComplete) {
          onComplete();
        }
        break;
      }

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

  // ----- Title screen, win screen, reset ---------------------------------
  function hideTitleScreen() {
    if (titleScreenEl) titleScreenEl.classList.add("hidden");
  }

  function showTitleScreen() {
    if (titleScreenEl) titleScreenEl.classList.remove("hidden");
  }

  function showWinScreen() {
    if (!winScreenEl) return;
    spawnConfetti();
    winScreenEl.classList.remove("hidden");
  }

  function hideWinScreen() {
    if (winScreenEl) winScreenEl.classList.add("hidden");
    if (confettiEl) confettiEl.innerHTML = "";
  }

  // Build a shower of falling emoji confetti for the win screen.
  function spawnConfetti() {
    if (!confettiEl) return;
    confettiEl.innerHTML = "";
    const symbols = ["🎉", "✨", "🌟", "👓", "🌻", "💛"];
    const count = 32;
    for (let i = 0; i < count; i++) {
      const span = document.createElement("span");
      span.textContent = symbols[i % symbols.length];
      span.style.left = Math.random() * 100 + "%";
      span.style.animationDuration = 2.4 + Math.random() * 2.6 + "s";
      span.style.animationDelay = Math.random() * 1.5 + "s";
      confettiEl.appendChild(span);
    }
  }

  // Wipe game state in place (so closures keep their reference) and restart.
  function resetGame() {
    Object.assign(state, initialState());
    hideWinScreen();
    renderScene();
    renderInventory();
  }

  // ----- Boot -------------------------------------------------------------
  function boot() {
    // Render the scene behind the title screen so the fade-in looks nice.
    renderScene();
    renderInventory();
    showTitleScreen();
  }

  if (startButtonEl) {
    startButtonEl.addEventListener("click", hideTitleScreen);
  }
  if (playAgainButtonEl) {
    playAgainButtonEl.addEventListener("click", resetGame);
  }

  // Wait for the DOM to be ready before booting.
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
