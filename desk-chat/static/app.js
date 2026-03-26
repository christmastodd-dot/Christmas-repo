/* Cap Chat — client (E2E encrypted) */

const params = new URLSearchParams(window.location.search);
const myName = params.get("name") || "";
const roomCode = params.get("room") || "";
const e2eSecret = decodeURIComponent(window.location.hash.slice(1));

// Clear the hash from the URL bar so it's not visible/bookmarkable
if (window.location.hash) {
    history.replaceState(null, "", window.location.pathname + window.location.search);
}

if (!myName || !roomCode || !e2eSecret) {
    window.location.href = "/";
}

document.title = "Cap Chat — " + roomCode;
document.getElementById("room-label").textContent = roomCode;

// ── E2E Encryption (AES-256-GCM via Web Crypto) ──

let cryptoKey = null;

async function deriveKey(secret, salt) {
    const enc = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
        "raw", enc.encode(secret), "PBKDF2", false, ["deriveKey"]
    );
    return crypto.subtle.deriveKey(
        { name: "PBKDF2", salt: enc.encode(salt), iterations: 100000, hash: "SHA-256" },
        keyMaterial,
        { name: "AES-GCM", length: 256 },
        false,
        ["encrypt", "decrypt"]
    );
}

async function encryptText(plaintext) {
    const enc = new TextEncoder();
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ciphertext = await crypto.subtle.encrypt(
        { name: "AES-GCM", iv },
        cryptoKey,
        enc.encode(plaintext)
    );
    // Combine IV + ciphertext → base64
    const combined = new Uint8Array(iv.length + ciphertext.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(ciphertext), iv.length);
    return btoa(String.fromCharCode(...combined));
}

async function decryptText(encoded) {
    try {
        const data = Uint8Array.from(atob(encoded), c => c.charCodeAt(0));
        const iv = data.slice(0, 12);
        const ciphertext = data.slice(12);
        const decrypted = await crypto.subtle.decrypt(
            { name: "AES-GCM", iv },
            cryptoKey,
            ciphertext
        );
        return new TextDecoder().decode(decrypted);
    } catch {
        return "[decryption failed — wrong key?]";
    }
}

const messagesEl = document.getElementById("messages");
const memberList = document.getElementById("member-list");
const msgInput = document.getElementById("msg-input");
const sendBtn = document.getElementById("send-btn");
const tabsEl = document.getElementById("tabs");
const typingEl = document.getElementById("typing");
const reconnectingEl = document.getElementById("reconnecting");
const quietToggle = document.getElementById("quiet-toggle");

// ── State ──

let ws = null;
let members = [];
let reconnectDelay = 1000;
let msgCounter = 0;

// DM state
let dmConversations = {};   // name -> [{type, sender, text, timestamp}]
let activeTab = "room";     // "room" or a display name
let unreadTabs = new Set();

// Typing indicator state
let typingTimeout = null;
let lastTypingSent = 0;
const TYPING_THROTTLE = 2000;

// Reaction emojis
const REACTION_EMOJIS = ["\u{1F44D}", "\u{1F44E}", "\u{1F602}", "\u{1F525}", "\u{2764}\uFE0F", "\u{1F64F}"];

function nextMsgId() {
    return myName + "-" + (++msgCounter) + "-" + Date.now();
}

// ── WebSocket ──

function connect() {
    const protocol = location.protocol === "https:" ? "wss:" : "ws:";
    const url = `${protocol}//${location.host}/ws/${encodeURIComponent(roomCode)}?name=${encodeURIComponent(myName)}`;
    ws = new WebSocket(url);

    ws.onopen = () => {
        reconnectDelay = 1000;
        reconnectingEl.classList.remove("show");
    };

    ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        handleMessage(msg);
    };

    ws.onclose = () => {
        reconnectingEl.classList.add("show");
        setTimeout(() => {
            reconnectDelay = Math.min(reconnectDelay * 2, 10000);
            connect();
        }, reconnectDelay);
    };

    ws.onerror = () => {};
}

function send(obj) {
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(obj));
    }
}

// ── Message Handling ──

function handleMessage(msg) {
    switch (msg.type) {
        case "message":
            handleChatMessage(msg);
            break;
        case "dm":
            handleDM(msg);
            break;
        case "system":
            appendSystem(msg.text, msg.timestamp);
            break;
        case "members":
            updateMembers(msg.members);
            break;
        case "typing":
            showTypingIndicator(msg);
            break;
        case "gavel":
            if (msg.sender !== myName) showGavel(msg.sender);
            break;
        case "countdown":
            if (msg.sender !== myName) startCountdown(msg.seconds, msg.sender);
            break;
        case "countdown_stop":
            if (msg.sender !== myName) stopCountdown();
            break;
        case "reaction_update":
            updateReactionDisplay(msg.msg_id, msg.reactions);
            break;
    }
}

async function handleChatMessage(msg) {
    if (activeTab !== "room") {
        unreadTabs.add("room");
        renderTabs();
    }
    const plaintext = await decryptText(msg.text);
    appendMessage(msg.sender, plaintext, msg.timestamp, messagesEl, msg.id);
}

async function handleDM(msg) {
    const otherName = msg.sender === myName ? msg.recipient : msg.sender;

    const decryptedMsg = { ...msg, text: await decryptText(msg.text) };

    if (!dmConversations[otherName]) {
        dmConversations[otherName] = [];
    }
    dmConversations[otherName].push(decryptedMsg);

    if (activeTab === otherName) {
        const container = document.getElementById("dm-messages-" + otherName);
        if (container) {
            appendMessage(decryptedMsg.sender, decryptedMsg.text, decryptedMsg.timestamp, container);
        }
    } else {
        unreadTabs.add(otherName);
    }
    renderTabs();
}

function showTypingIndicator(msg) {
    if (msg.channel === activeTab || (msg.channel === "room" && activeTab === "room")) {
        if (msg.sender !== myName) {
            typingEl.textContent = msg.sender + " is typing...";
            clearTimeout(typingTimeout);
            typingTimeout = setTimeout(() => { typingEl.textContent = ""; }, 3000);
        }
    }
}

// ── DOM Helpers ──

function appendMessage(sender, text, timestamp, container, msgId) {
    if (!container) container = messagesEl;
    const atBottom = isAtBottom(container);

    const div = document.createElement("div");
    div.className = "msg";
    if (msgId) div.dataset.msgId = msgId;

    const senderSpan = document.createElement("span");
    senderSpan.className = "sender";
    senderSpan.textContent = sender;

    const textSpan = document.createElement("span");
    textSpan.className = "text";
    textSpan.textContent = text;
    linkify(textSpan);

    const timeSpan = document.createElement("span");
    timeSpan.className = "time";
    timeSpan.textContent = timestamp;

    // Reaction button
    const reactBtn = document.createElement("span");
    reactBtn.className = "react-btn";
    reactBtn.textContent = "+";
    reactBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        showReactionPicker(div, msgId);
    });

    div.appendChild(senderSpan);
    div.appendChild(textSpan);
    div.appendChild(timeSpan);
    if (msgId) div.appendChild(reactBtn);

    // Reactions row (populated by updates)
    const rxRow = document.createElement("div");
    rxRow.className = "reactions-row";
    div.appendChild(rxRow);

    container.appendChild(div);
    if (atBottom) scrollToBottom(container);
}

function appendSystem(text, timestamp) {
    const atBottom = isAtBottom(messagesEl);

    const div = document.createElement("div");
    div.className = "msg system";

    const textSpan = document.createElement("span");
    textSpan.className = "text";
    textSpan.textContent = text;

    const timeSpan = document.createElement("span");
    timeSpan.className = "time";
    timeSpan.textContent = timestamp;

    div.appendChild(textSpan);
    div.appendChild(document.createTextNode(" "));
    div.appendChild(timeSpan);
    messagesEl.appendChild(div);

    if (atBottom) scrollToBottom(messagesEl);
}

function updateMembers(list) {
    members = list;
    memberList.innerHTML = "";
    list.forEach((name) => {
        const li = document.createElement("li");
        li.textContent = name;
        if (name === myName) {
            li.className = "you";
        } else {
            li.className = "clickable";
            li.addEventListener("click", () => openDM(name));
        }
        memberList.appendChild(li);
    });
}

function linkify(el) {
    const text = el.textContent;
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    if (!urlRegex.test(text)) return;

    el.textContent = "";
    text.split(urlRegex).forEach((part) => {
        if (urlRegex.test(part)) {
            const a = document.createElement("a");
            a.href = part;
            a.textContent = part;
            a.target = "_blank";
            a.rel = "noopener";
            a.style.color = "#5a7a9a";
            el.appendChild(a);
        } else {
            el.appendChild(document.createTextNode(part));
        }
    });
}

function isAtBottom(el) {
    return el.scrollTop + el.clientHeight >= el.scrollHeight - 30;
}

function scrollToBottom(el) {
    el.scrollTop = el.scrollHeight;
}

// ── Tabs & DMs ──

function openDM(name) {
    if (name === myName) return;
    if (!dmConversations[name]) {
        dmConversations[name] = [];
    }
    switchTab(name);
}

function switchTab(tab) {
    activeTab = tab;
    unreadTabs.delete(tab);
    typingEl.textContent = "";
    renderTabs();
    renderActiveView();
}

function renderTabs() {
    tabsEl.innerHTML = "";
    const dmNames = Object.keys(dmConversations);
    if (dmNames.length === 0) {
        tabsEl.style.display = "none";
        return;
    }
    tabsEl.style.display = "flex";

    // Room tab
    const roomTab = document.createElement("div");
    roomTab.className = "tab" + (activeTab === "room" ? " active" : "");
    roomTab.textContent = "Room";
    if (unreadTabs.has("room")) {
        const dot = document.createElement("span");
        dot.className = "unread";
        roomTab.appendChild(dot);
    }
    roomTab.addEventListener("click", () => switchTab("room"));
    tabsEl.appendChild(roomTab);

    // DM tabs
    dmNames.forEach((name) => {
        const tab = document.createElement("div");
        tab.className = "tab" + (activeTab === name ? " active" : "");
        tab.textContent = name;

        if (unreadTabs.has(name)) {
            const dot = document.createElement("span");
            dot.className = "unread";
            tab.appendChild(dot);
        }

        const close = document.createElement("span");
        close.className = "close-tab";
        close.textContent = "\u00d7";
        close.addEventListener("click", (e) => {
            e.stopPropagation();
            delete dmConversations[name];
            unreadTabs.delete(name);
            if (activeTab === name) switchTab("room");
            else renderTabs();
        });
        tab.appendChild(close);

        tab.addEventListener("click", () => switchTab(name));
        tabsEl.appendChild(tab);
    });
}

function renderActiveView() {
    // Hide/show the room messages vs DM messages
    if (activeTab === "room") {
        messagesEl.style.display = "";
        // Remove any DM container that's visible
        document.querySelectorAll(".dm-container").forEach((el) => el.remove());
        msgInput.placeholder = "Message...";
    } else {
        messagesEl.style.display = "none";
        document.querySelectorAll(".dm-container").forEach((el) => el.remove());

        const container = document.createElement("div");
        container.className = "messages dm-container";
        container.id = "dm-messages-" + activeTab;
        messagesEl.parentNode.insertBefore(container, typingEl);

        // Replay history
        (dmConversations[activeTab] || []).forEach((msg) => {
            appendMessage(msg.sender, msg.text, msg.timestamp, container);
        });
        scrollToBottom(container);
        msgInput.placeholder = "Message " + activeTab + "...";
    }
}

// ── Input Handling ──

async function sendMessage() {
    const text = msgInput.value.trim();
    if (!text) return;

    const encrypted = await encryptText(text);

    if (activeTab === "room") {
        send({ type: "message", text: encrypted, id: nextMsgId() });
    } else {
        send({ type: "dm", recipient: activeTab, text: encrypted });
    }
    msgInput.value = "";
}

function sendTyping() {
    const now = Date.now();
    if (now - lastTypingSent > TYPING_THROTTLE) {
        lastTypingSent = now;
        send({ type: "typing", channel: activeTab });
    }
}

sendBtn.addEventListener("click", sendMessage);
msgInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
});
msgInput.addEventListener("input", sendTyping);

// Action buttons — trigger locally + broadcast to others
document.getElementById("gavel-btn").addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    showGavel(myName);
    send({ type: "gavel" });
});
document.getElementById("countdown-btn").addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    startCountdown(300, myName);
    send({ type: "countdown" });
});

// ── Gavel Mode ──

function showGavel(sender) {
    const overlay = document.createElement("div");
    overlay.className = "gavel-overlay";

    const gavelContainer = document.createElement("div");
    gavelContainer.className = "gavel-visual";
    gavelContainer.innerHTML = `
        <svg width="180" height="180" viewBox="0 0 100 100" fill="none">
            <!-- Sound block / base -->
            <rect x="25" y="78" width="50" height="8" rx="2" fill="#5C3D1A" stroke="#3E2A0F" stroke-width="1"/>
            <rect x="30" y="74" width="40" height="6" rx="2" fill="#6B4F12" stroke="#3E2A0F" stroke-width="1"/>
            <!-- Handle -->
            <line x1="50" y1="45" x2="50" y2="72" stroke="#8B6914" stroke-width="5" stroke-linecap="round"/>
            <!-- Gavel head -->
            <rect class="gavel-head" x="30" y="28" width="40" height="18" rx="4" fill="#A07828" stroke="#6B4F12" stroke-width="1.5"/>
            <!-- Wood grain on head -->
            <line x1="35" y1="33" x2="65" y2="33" stroke="#8B6914" stroke-width="0.5" opacity="0.5"/>
            <line x1="35" y1="37" x2="65" y2="37" stroke="#8B6914" stroke-width="0.5" opacity="0.5"/>
            <line x1="35" y1="41" x2="65" y2="41" stroke="#8B6914" stroke-width="0.5" opacity="0.3"/>
            <!-- Metal bands -->
            <rect x="30" y="29" width="4" height="16" rx="1" fill="#888" opacity="0.4"/>
            <rect x="66" y="29" width="4" height="16" rx="1" fill="#888" opacity="0.4"/>
        </svg>`;

    const label = document.createElement("div");
    label.className = "gavel-label";
    label.textContent = "ORDER! — " + sender;

    overlay.appendChild(gavelContainer);
    overlay.appendChild(label);
    document.body.appendChild(overlay);

    // Trigger animation
    requestAnimationFrame(() => overlay.classList.add("active"));

    setTimeout(() => {
        overlay.classList.remove("active");
        overlay.classList.add("fade-out");
        setTimeout(() => overlay.remove(), 500);
    }, 2000);
}

// ── Reactions ──

let activePickerEl = null;

function showReactionPicker(msgDiv, msgId) {
    // Close any existing picker
    closeReactionPicker();
    if (!msgId) return;

    const picker = document.createElement("div");
    picker.className = "reaction-picker";

    REACTION_EMOJIS.forEach((emoji) => {
        const btn = document.createElement("span");
        btn.className = "reaction-picker-emoji";
        btn.textContent = emoji;
        btn.addEventListener("click", (e) => {
            e.stopPropagation();
            send({ type: "reaction", msg_id: msgId, emoji });
            closeReactionPicker();
        });
        picker.appendChild(btn);
    });

    msgDiv.appendChild(picker);
    activePickerEl = picker;

    // Close picker when clicking elsewhere
    setTimeout(() => {
        document.addEventListener("click", closeReactionPicker, { once: true });
    }, 0);
}

function closeReactionPicker() {
    if (activePickerEl) {
        activePickerEl.remove();
        activePickerEl = null;
    }
}

function updateReactionDisplay(msgId, reactionsData) {
    const msgDiv = document.querySelector(`.msg[data-msg-id="${msgId}"]`);
    if (!msgDiv) return;

    let rxRow = msgDiv.querySelector(".reactions-row");
    if (!rxRow) {
        rxRow = document.createElement("div");
        rxRow.className = "reactions-row";
        msgDiv.appendChild(rxRow);
    }
    rxRow.innerHTML = "";

    for (const [emoji, names] of Object.entries(reactionsData)) {
        if (!names.length) continue;
        const badge = document.createElement("span");
        badge.className = "reaction-badge";
        if (names.includes(myName)) badge.classList.add("mine");
        badge.textContent = emoji + " " + names.length;
        badge.title = names.join(", ");
        badge.addEventListener("click", () => {
            send({ type: "reaction", msg_id: msgId, emoji });
        });
        rxRow.appendChild(badge);
    }
}

// ── Countdown Timer ──

let countdownInterval = null;
let countdownEl = null;

function startCountdown(seconds, sender) {
    // Clear any existing countdown
    if (countdownInterval) clearInterval(countdownInterval);
    if (countdownEl) countdownEl.remove();

    let remaining = seconds;

    countdownEl = document.createElement("div");
    countdownEl.className = "countdown-timer";
    countdownEl.innerHTML = '<div class="countdown-title">Debate Limit</div>'
        + '<div class="countdown-label">started by ' + sender + '</div>'
        + '<div class="countdown-time"></div>'
        + '<div class="countdown-stop">\u00d7</div>';
    document.body.appendChild(countdownEl);

    countdownEl.querySelector(".countdown-stop").addEventListener("click", () => {
        stopCountdown();
        send({ type: "countdown_stop" });
    });

    const timeDisplay = countdownEl.querySelector(".countdown-time");

    function update() {
        const m = Math.floor(remaining / 60);
        const s = remaining % 60;
        timeDisplay.textContent = m + ":" + (s < 10 ? "0" : "") + s;

        if (remaining <= 30) {
            countdownEl.classList.add("urgent");
        }
        if (remaining <= 0) {
            clearInterval(countdownInterval);
            countdownInterval = null;
            timeDisplay.textContent = "TIME";
            countdownEl.classList.add("done");
            setTimeout(() => {
                countdownEl.classList.add("fade-out");
                setTimeout(() => { countdownEl.remove(); countdownEl = null; }, 500);
            }, 5000);
        }
        remaining--;
    }

    update();
    countdownInterval = setInterval(update, 1000);
}

function stopCountdown() {
    if (countdownInterval) {
        clearInterval(countdownInterval);
        countdownInterval = null;
    }
    if (countdownEl) {
        countdownEl.classList.add("fade-out");
        setTimeout(() => {
            if (countdownEl) { countdownEl.remove(); countdownEl = null; }
        }, 500);
    }
}

// ── Quiet Mode ──

quietToggle.addEventListener("click", () => {
    document.body.classList.toggle("quiet");
    quietToggle.textContent = document.body.classList.contains("quiet")
        ? "Exit quiet mode"
        : "Quiet mode";
});

// ── Mobile sidebar ──

const sidebarToggle = document.getElementById("sidebar-toggle");
const sidebarEl = document.getElementById("sidebar");
const sidebarOverlay = document.getElementById("sidebar-overlay");

function closeSidebar() {
    sidebarEl.classList.remove("open");
    sidebarOverlay.classList.remove("show");
}

sidebarToggle.addEventListener("click", () => {
    const open = sidebarEl.classList.toggle("open");
    sidebarOverlay.classList.toggle("show", open);
});

sidebarOverlay.addEventListener("click", closeSidebar);

// Close sidebar when a DM is opened on mobile
const origOpenDM = openDM;
openDM = function(name) {
    closeSidebar();
    origOpenDM(name);
};

// ── Mobile keyboard fix (iOS) ──

const inputBar = document.querySelector(".input-bar");
let keyboardOpen = false;

if (window.visualViewport) {
    const onViewportResize = () => {
        const vv = window.visualViewport;
        // Full layout height minus visible viewport = keyboard + toolbar height
        const keyboardHeight = window.innerHeight - vv.height;

        if (keyboardHeight > 100) {
            // Keyboard is open — float input bar above it
            keyboardOpen = true;
            inputBar.style.position = "fixed";
            inputBar.style.left = "0";
            inputBar.style.right = "0";
            inputBar.style.bottom = keyboardHeight + "px";
            inputBar.style.background = "#1a1a1e";
            inputBar.style.zIndex = "500";
            inputBar.style.borderTop = "1px solid #2a2a2e";
        } else {
            // Keyboard closed — restore normal flow
            keyboardOpen = false;
            inputBar.style.position = "";
            inputBar.style.left = "";
            inputBar.style.right = "";
            inputBar.style.bottom = "";
            inputBar.style.zIndex = "";
        }
    };

    window.visualViewport.addEventListener("resize", onViewportResize);
    window.visualViewport.addEventListener("scroll", onViewportResize);
}

// Fallback: scroll input into view on focus
msgInput.addEventListener("focus", () => {
    setTimeout(() => {
        if (!keyboardOpen) {
            msgInput.scrollIntoView({ block: "center", behavior: "smooth" });
        }
    }, 400);
});

// ── Start ──

(async () => {
    cryptoKey = await deriveKey(e2eSecret, "cap-chat-" + roomCode);
    connect();
    renderTabs();
})();
