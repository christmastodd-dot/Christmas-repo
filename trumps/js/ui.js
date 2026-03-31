/**
 * UI — renders game state to the DOM.
 */

const UI = {
    /** Update the status message in the header. */
    setStatus(msg) {
        document.getElementById('game-status').textContent = msg;
    },

    /** Render a player's hand into their seat container. */
    renderHand(player) {
        const container = document.getElementById(`hand-${player.position}`);
        container.innerHTML = '';

        player.hand.forEach((card, i) => {
            let el;
            if (player.isHuman) {
                el = card.toElement();
                el.style.animationDelay = `${i * 0.04}s`;
                el.classList.add('dealing');
            } else {
                el = Card.backElement();
                el.style.animationDelay = `${i * 0.04}s`;
                el.classList.add('dealing');
            }
            // Ensure consistent left-to-right overlap
            el.style.zIndex = i;
            container.appendChild(el);
        });

        // Update card count badge
        this.updateCardCount(player);
    },

    /** Show/update a card count badge on a player's seat. */
    updateCardCount(player) {
        const seat = document.getElementById(`seat-${player.position}`);
        let badge = seat.querySelector('.card-count');
        if (!badge) {
            badge = document.createElement('span');
            badge.className = 'card-count';
            seat.appendChild(badge);
        }
        badge.textContent = player.hand.length;
        // Highlight if not 12 during play (kitty phase has 16)
        badge.classList.toggle('card-count-warn', player.hand.length !== 12 && player.hand.length !== 16 && player.hand.length !== 0);
    },

    /** Render all four hands. */
    renderAllHands(players) {
        players.forEach(p => UI.renderHand(p));
    },

    /** Update the scoreboard. */
    renderScores(scores) {
        document.getElementById('score-ns').textContent = scores.ns;
        document.getElementById('score-ew').textContent = scores.ew;
    },

    /** Clear the center play area. */
    clearPlayArea() {
        document.getElementById('played-cards').innerHTML = '';
    },

    /** Show a card played to the center, positioned by seat. */
    showPlayedCard(player, card, isLead) {
        const area = document.getElementById('played-cards');
        const wrapper = document.createElement('div');
        wrapper.className = 'played-card-wrapper';
        wrapper.dataset.position = player.position;
        wrapper.dataset.playerIndex = player.index;
        if (isLead) wrapper.dataset.isLead = 'true';

        const cardEl = card.toElement();
        cardEl.classList.add('playing');

        const tag = document.createElement('span');
        tag.className = 'player-tag';
        tag.textContent = player.label;

        wrapper.appendChild(cardEl);
        wrapper.appendChild(tag);
        area.appendChild(wrapper);
    },

    /** Highlight the trick winner's card. */
    highlightTrickWinner(winnerIndex) {
        const area = document.getElementById('played-cards');
        const wrappers = area.querySelectorAll('.played-card-wrapper');
        wrappers.forEach(w => {
            if (parseInt(w.dataset.playerIndex) === winnerIndex) {
                w.classList.add('trick-winner');
            }
        });
    },

    /** Show lead suit watermark in center of play area. */
    showLeadSuit(suit) {
        this.hideLeadSuit();
        const badge = document.createElement('div');
        badge.id = 'lead-suit-badge';
        badge.className = `lead-suit-badge ${SUIT_COLORS[suit]}`;
        badge.textContent = SUIT_SYMBOLS[suit];
        document.getElementById('played-cards').appendChild(badge);
    },

    hideLeadSuit() {
        const badge = document.getElementById('lead-suit-badge');
        if (badge) badge.remove();
    },

    /** Mark legal/illegal cards in the human player's hand. */
    markLegalPlays(player, game) {
        const handEl = document.getElementById('hand-south');
        const cards = handEl.querySelectorAll('.card');

        // Determine legal cards
        let legalIds;
        if (game.currentTrick.length === 0) {
            // Leading — all cards are legal
            legalIds = new Set(player.hand.map(c => c.id));
        } else {
            const leadSuit = game.currentTrick[0].card.suit;
            const suitCards = player.cardsOfSuit(leadSuit);
            if (suitCards.length > 0) {
                legalIds = new Set(suitCards.map(c => c.id));
            } else {
                // Can't follow suit — all cards legal
                legalIds = new Set(player.hand.map(c => c.id));
            }
        }

        cards.forEach(cardEl => {
            const cardId = cardEl.dataset.cardId;
            if (legalIds.has(cardId)) {
                cardEl.classList.add('legal-play');
                cardEl.classList.remove('illegal-play');
            } else {
                cardEl.classList.add('illegal-play');
                cardEl.classList.remove('legal-play');
            }
        });
    },

    /** Clear legal/illegal markings. */
    clearLegalPlays() {
        const handEl = document.getElementById('hand-south');
        if (!handEl) return;
        handEl.querySelectorAll('.card').forEach(cardEl => {
            cardEl.classList.remove('legal-play', 'illegal-play');
        });
    },

    /** Show current bid info in scoreboard. */
    showScoreboardBid(text) {
        const el = document.getElementById('scoreboard-bid');
        if (el) el.textContent = text;
    },

    clearScoreboardBid() {
        const el = document.getElementById('scoreboard-bid');
        if (el) el.textContent = '';
    },

    /** Show/hide a panel by id. */
    showPanel(id) {
        document.getElementById(id).classList.remove('hidden');
    },

    hidePanel(id) {
        document.getElementById(id).classList.add('hidden');
    },

    // ─── Bid History ──────────────────────────────────────

    /** Initialize the bid history log in the play area. */
    showBidHistory() {
        const area = document.getElementById('played-cards');
        area.innerHTML = '';

        const log = document.createElement('div');
        log.id = 'bid-history';
        log.className = 'bid-history';
        log.innerHTML = '<div class="bid-history-title">Bidding</div>';
        area.appendChild(log);
    },

    /** Add an entry to the bid history log. */
    addBidEntry(playerLabel, bidText, isHighlight) {
        const log = document.getElementById('bid-history');
        if (!log) return;

        const entry = document.createElement('div');
        entry.className = `bid-entry${isHighlight ? ' bid-winner' : ''}`;
        entry.innerHTML = `<span class="bid-player">${playerLabel}</span> <span class="bid-value">${bidText}</span>`;
        log.appendChild(entry);

        // Scroll to bottom if overflow
        log.scrollTop = log.scrollHeight;
    },

    // ─── Dealer Chip ──────────────────────────────────────

    /** Show dealer indicator on a player's seat. */
    showDealerChip(playerIndex) {
        // Remove any existing dealer chips
        document.querySelectorAll('.dealer-chip').forEach(el => el.remove());

        const position = POSITIONS[playerIndex];
        const seat = document.getElementById(`seat-${position}`);
        const chip = document.createElement('div');
        chip.className = 'dealer-chip';
        chip.textContent = 'D';
        chip.title = 'Dealer';
        seat.appendChild(chip);
    },

    // ─── Turn Indicator ───────────────────────────────────

    /** Highlight whose turn it is. */
    setActiveSeat(playerIndex) {
        document.querySelectorAll('.seat').forEach(s => s.classList.remove('active-seat'));
        if (playerIndex !== null && playerIndex !== undefined) {
            const position = POSITIONS[playerIndex];
            document.getElementById(`seat-${position}`).classList.add('active-seat');
        }
    },

    // ─── Trump Info Display ───────────────────────────────

    /** Show trump info bar during play. */
    showTrumpInfo(suit, direction, trickNum) {
        let bar = document.getElementById('trump-info-bar');
        if (!bar) {
            bar = document.createElement('div');
            bar.id = 'trump-info-bar';
            bar.className = 'trump-info-bar';
            const header = document.getElementById('game-header');
            header.appendChild(bar);
        }
        const color = SUIT_COLORS[suit];
        bar.innerHTML = `Trump: <span class="${color}">${SUIT_SYMBOLS[suit]}</span> ${direction.toUpperCase()} | Pack ${trickNum}/12`;
    },

    /** Update pack number in trump info bar. */
    updateTrickNum(trickNum) {
        const bar = document.getElementById('trump-info-bar');
        if (bar) {
            const parts = bar.innerHTML.split('| Pack');
            if (parts.length === 2) {
                bar.innerHTML = parts[0] + `| Pack ${trickNum}/12`;
            }
        }
    },

    /** Hide trump info bar. */
    hideTrumpInfo() {
        const bar = document.getElementById('trump-info-bar');
        if (bar) bar.remove();
    },

    // ─── Pack Score & Packs-to-Make Tracker ───────────────

    /**
     * Show pack counts and packs-to-make tracker near the play area.
     * game: Game instance (to read bid info)
     */
    showTrickCounts(nsTricks, ewTricks, game) {
        let el = document.getElementById('trick-counts');
        if (!el) {
            el = document.createElement('div');
            el.id = 'trick-counts';
            document.getElementById('play-area').appendChild(el);
        }

        // Basic trick counts
        let html = `<span class="tc-team">N/S: ${nsTricks}</span> <span class="tc-sep">|</span> <span class="tc-team">E/W: ${ewTricks}</span>`;

        // Packs-to-make tracker (only during play with a bid)
        if (game && game.currentBid && game.bidWinner !== null) {
            const needed = 6 + game.currentBid.amount;
            const bidTeam = game.bidTeam;
            const defTeam = game.defendTeam;
            const bidTricks = bidTeam === 'ns' ? nsTricks : ewTricks;
            const defTricks = defTeam === 'ns' ? nsTricks : ewTricks;
            const bidTeamLabel = bidTeam === 'ns' ? 'N/S' : 'E/W';
            const defTeamLabel = defTeam === 'ns' ? 'N/S' : 'E/W';

            const bidStillNeeds = Math.max(0, needed - bidTricks);
            const defToSet = Math.max(0, (13 - needed + 1) - defTricks); // tricks defense needs to guarantee a set

            html += `<br><span class="tc-tracker">`;
            if (bidStillNeeds === 0) {
                html += `<span class="tc-made">${bidTeamLabel} MADE IT!</span>`;
            } else {
                html += `${bidTeamLabel} needs <strong>${bidStillNeeds}</strong> more`;
            }
            html += ` <span class="tc-sep">|</span> `;
            if (defToSet === 0) {
                html += `<span class="tc-set">${defTeamLabel} SET!</span>`;
            } else {
                html += `${defTeamLabel} needs <strong>${defToSet}</strong> to set`;
            }
            html += `</span>`;
        }

        el.innerHTML = html;
    },

    hideTrickCounts() {
        const el = document.getElementById('trick-counts');
        if (el) el.remove();
    },

    // ─── Winning Bid Announcement ─────────────────────────

    /**
     * Show a large winning bid announcement overlay in the play area.
     * Returns a function to remove it.
     */
    showBidWinner(playerLabel, amount, direction) {
        const area = document.getElementById('played-cards');
        area.innerHTML = '';

        const overlay = document.createElement('div');
        overlay.className = 'bid-winner-overlay';

        const title = document.createElement('div');
        title.className = 'bid-winner-title';
        title.textContent = playerLabel === 'You (South)' ? 'You Won the Bid!' : `${playerLabel} Wins!`;

        const bidValue = document.createElement('div');
        bidValue.className = 'bid-winner-value';
        bidValue.textContent = `${amount} ${direction}`;

        const badge = document.createElement('div');
        badge.className = `bid-winner-direction ${direction}`;
        badge.textContent = direction === 'low' ? '▼ LOW' : '▲ HIGH';

        overlay.appendChild(title);
        overlay.appendChild(bidValue);
        overlay.appendChild(badge);
        area.appendChild(overlay);

        // Trigger entrance animation
        requestAnimationFrame(() => overlay.classList.add('show'));

        return () => overlay.remove();
    },
};
