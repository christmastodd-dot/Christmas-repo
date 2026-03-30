/**
 * Game — core game state and flow controller for Hawaii Trumps.
 * Orchestrates dealing, bidding, kitty, trick play, and scoring.
 *
 * Turn order is clockwise: South(0) -> West(1) -> North(2) -> East(3)
 * Dealer rotates each hand. First bidder is left of dealer.
 */

class Game {
    constructor() {
        this.deck = new Deck();
        this.players = [
            new Player(0), // South — human
            new Player(1), // West — AI
            new Player(2), // North — AI (partner)
            new Player(3), // East — AI
        ];
        this.scores = { ns: 0, ew: 0 };
        this.winTarget = 3;  // First to 3 hand wins
        this.handsPlayed = 0;
        this.gameOver = false;
        this.winner = null; // 'ns' or 'ew'

        // Hand state
        this.kitty = [];
        this.dealer = 0;             // index of current dealer
        this.currentBid = null;      // { playerIndex, amount, direction } or null
        this.bidWinner = null;        // player index who won the bid
        this.trumpSuit = null;
        this.direction = null;        // 'high' or 'low'
        this.currentTrick = [];       // [{ playerIndex, card }]
        this.leadPlayerIndex = null;  // index of who leads current trick
        this.trickNumber = 0;
        this.phase = 'idle';          // idle | dealing | bidding | kitty | trumpSelect | playing | trickEnd | scoring

        // Bidding tracking
        this.bidderIndex = null;      // whose turn to bid
        this.passCount = 0;           // how many consecutive passes
        this.biddingOrder = [];       // ordered list of player indices for bidding

        // Callbacks — set by the controller (main.js) to drive UI
        this.onPhaseChange = null;    // (phase, data) => {}
        this.onTurnChange = null;     // (playerIndex) => {}
        this.onTrickComplete = null;  // (winnerIndex, trick) => {}
        this.onHandComplete = null;   // (result) => {}
    }

    // ─── Helpers ──────────────────────────────────────────

    /** Next player clockwise. */
    nextPlayer(index) {
        return (index + 1) % 4;
    }

    /** Get the player to the left of the dealer (first to bid/lead). */
    get firstBidder() {
        return this.nextPlayer(this.dealer);
    }

    /** Advance dealer to next player for new hand. */
    advanceDealer() {
        this.dealer = this.nextPlayer(this.dealer);
    }

    /** Get team trick counts for current hand. */
    get teamTricks() {
        return {
            ns: this.players[0].tricksWon + this.players[2].tricksWon,
            ew: this.players[1].tricksWon + this.players[3].tricksWon,
        };
    }

    /** Is the given player on the bidding team? */
    isOnBiddingTeam(playerIndex) {
        if (this.bidWinner === null) return false;
        return this.players[playerIndex].team === this.players[this.bidWinner].team;
    }

    /** Get the bid team key ('ns' or 'ew'). */
    get bidTeam() {
        if (this.bidWinner === null) return null;
        return this.players[this.bidWinner].team;
    }

    /** Get the defending team key. */
    get defendTeam() {
        return this.bidTeam === 'ns' ? 'ew' : 'ns';
    }

    // ─── Phase: Deal ──────────────────────────────────────

    /** Start a new hand: shuffle, deal, set up bidding. */
    startHand() {
        // Reset players
        this.players.forEach(p => p.reset());
        this.kitty = [];
        this.currentBid = null;
        this.bidWinner = null;
        this.trumpSuit = null;
        this.direction = null;
        this.currentTrick = [];
        this.trickNumber = 0;
        this.passCount = 0;
        this.bidderIndex = null;

        // Deal
        const { hands, kitty } = this.deck.deal();
        this.kitty = kitty;
        this.players.forEach((p, i) => p.receiveCards(hands[i]));

        // Validate deal: 12 cards each, 4 in kitty, 52 total
        const total = this.players.reduce((s, p) => s + p.hand.length, 0) + this.kitty.length;
        console.assert(total === 52, `Deal error: ${total} cards (expected 52)`);
        this.players.forEach(p => {
            console.assert(p.hand.length === 12, `${p.label} has ${p.hand.length} cards (expected 12)`);
        });
        console.assert(this.kitty.length === 4, `Kitty has ${this.kitty.length} cards (expected 4)`);

        this.phase = 'dealing';
        this._emit('onPhaseChange', 'dealing', { dealer: this.dealer });
    }

    // ─── Phase: Bidding ───────────────────────────────────

    /** Begin the bidding phase. Called after deal animation finishes. */
    startBidding() {
        this.phase = 'bidding';
        this.passCount = 0;
        this.currentBid = null;
        this.bidWinner = null;

        // Build bidding order: start left of dealer, go clockwise
        this.biddingOrder = [];
        let idx = this.firstBidder;
        for (let i = 0; i < 4; i++) {
            this.biddingOrder.push(idx);
            idx = this.nextPlayer(idx);
        }

        this.bidderIndex = this.biddingOrder[0];
        this._emit('onPhaseChange', 'bidding', { bidder: this.bidderIndex });
        this._emit('onTurnChange', this.bidderIndex);
    }

    /**
     * Process a bid from the current bidder.
     * bid: { amount, direction } or null for pass.
     * Returns: { valid, message, biddingComplete }
     */
    placeBid(playerIndex, bid) {
        if (playerIndex !== this.bidderIndex) {
            return { valid: false, message: 'Not your turn to bid.' };
        }

        if (bid === null) {
            // Pass
            this.passCount++;
            this.players[playerIndex].lastBid = null;

            // Check if bidding is over
            if (this._isBiddingComplete()) {
                return this._finalizeBidding();
            }

            // Advance to next bidder
            this._advanceBidder();
            return { valid: true, message: `${this.players[playerIndex].label} passes.`, biddingComplete: false };
        }

        // Validate bid
        const validation = this._validateBid(bid);
        if (!validation.valid) return validation;

        // Record bid
        this.currentBid = {
            playerIndex,
            amount: bid.amount,
            direction: bid.direction,
        };
        this.players[playerIndex].lastBid = bid;
        this.passCount = 0;

        // Check if max bid (7) — bidding ends immediately
        if (bid.amount === 7) {
            return this._finalizeBidding();
        }

        // Advance to next bidder
        this._advanceBidder();
        return { valid: true, message: `${this.players[playerIndex].label} bids ${bid.amount} ${bid.direction || ''}.`, biddingComplete: false };
    }

    /** Validate a bid against current state. */
    _validateBid(bid) {
        if (bid.amount < 3 || bid.amount > 7) {
            return { valid: false, message: 'Bid must be between 3 and 7.' };
        }
        if (bid.direction && bid.direction !== 'high' && bid.direction !== 'low') {
            return { valid: false, message: 'Direction must be "high" or "low".' };
        }

        if (this.currentBid) {
            if (bid.amount <= this.currentBid.amount) {
                return { valid: false, message: `Must bid higher than ${this.currentBid.amount}.` };
            }
        }

        return { valid: true };
    }

    /** Advance to the next eligible bidder (skip over settled). */
    _advanceBidder() {
        this.bidderIndex = this.nextPlayer(this.bidderIndex);

        // Skip the current high bidder (they don't bid against themselves)
        if (this.currentBid && this.bidderIndex === this.currentBid.playerIndex) {
            this.bidderIndex = this.nextPlayer(this.bidderIndex);
        }

        this._emit('onTurnChange', this.bidderIndex);
    }

    /** Check if bidding is complete (3 passes after a bid, or all 4 pass). */
    _isBiddingComplete() {
        if (this.currentBid === null && this.passCount >= 4) {
            return true; // Everyone passed — redeal
        }
        if (this.currentBid !== null && this.passCount >= 2) {
            return true; // 2 other players passed after the last bid (since we skip the high bidder)
        }
        return false;
    }

    /** Finalize bidding — determine winner or trigger redeal. */
    _finalizeBidding() {
        if (this.currentBid === null) {
            // Everyone passed — redeal
            this.phase = 'idle';
            this._emit('onPhaseChange', 'redeal', {});
            return { valid: true, message: 'Everyone passed. Redealing...', biddingComplete: true, redeal: true };
        }

        this.bidWinner = this.currentBid.playerIndex;
        this.direction = this.currentBid.direction || null;

        // If the first bidder won, they can declare trump after seeing kitty
        // (direction may also be declared then if they didn't specify)
        this.phase = 'kitty';
        this._emit('onPhaseChange', 'kitty', {
            bidWinner: this.bidWinner,
            bid: this.currentBid,
        });

        return {
            valid: true,
            message: `${this.players[this.bidWinner].label} wins the bid at ${this.currentBid.amount} ${this.currentBid.direction || '(will declare)'}.`,
            biddingComplete: true,
            redeal: false,
        };
    }

    // ─── Phase: Kitty ─────────────────────────────────────

    /** Bid winner picks up the kitty. */
    pickUpKitty() {
        const winner = this.players[this.bidWinner];
        console.assert(this.kitty.length === 4, `Kitty has ${this.kitty.length} cards before pickup (expected 4)`);
        console.assert(winner.hand.length === 12, `${winner.label} has ${winner.hand.length} cards before pickup (expected 12)`);
        winner.addCards(this.kitty);
        this.kitty = [];
        console.assert(winner.hand.length === 16, `${winner.label} has ${winner.hand.length} cards after pickup (expected 16)`);
    }

    /**
     * Bid winner discards 4 cards.
     * discards: Card[] (must be exactly 4, from winner's hand)
     */
    discardFromKitty(discards) {
        if (discards.length !== 4) {
            return { valid: false, message: 'Must discard exactly 4 cards.' };
        }

        const winner = this.players[this.bidWinner];
        for (const card of discards) {
            const idx = winner.hand.findIndex(c => c.id === card.id);
            if (idx === -1) {
                return { valid: false, message: `Card ${card.name} not in hand.` };
            }
            winner.hand.splice(idx, 1);
        }

        winner.sortHand();

        // Validate: winner should have exactly 12 cards after discard
        console.assert(winner.hand.length === 12, `${winner.label} has ${winner.hand.length} cards after discard (expected 12)`);

        // Move to trump selection (or straight to play if direction was already set)
        if (this.direction && this.trumpSuit) {
            this._startPlaying();
        } else {
            this.phase = 'trumpSelect';
            this._emit('onPhaseChange', 'trumpSelect', { bidWinner: this.bidWinner });
        }

        return { valid: true };
    }

    // ─── Phase: Trump Selection ───────────────────────────

    /**
     * Declare trump suit and direction (if not yet set).
     * suit: 'spades'|'hearts'|'diamonds'|'clubs'
     * direction: 'high'|'low' (required if not set during bidding)
     */
    declareTrump(suit, direction) {
        if (!SUITS.includes(suit)) {
            return { valid: false, message: 'Invalid suit.' };
        }
        if (direction && direction !== 'high' && direction !== 'low') {
            return { valid: false, message: 'Direction must be "high" or "low".' };
        }

        this.trumpSuit = suit;
        if (direction) this.direction = direction;

        if (!this.direction) {
            return { valid: false, message: 'Must declare direction (high or low).' };
        }

        this._startPlaying();
        return { valid: true };
    }

    // ─── Phase: Playing ───────────────────────────────────

    /** Begin trick-taking play. */
    _startPlaying() {
        // Validate: all players must have exactly 12 cards
        this.players.forEach(p => {
            console.assert(p.hand.length === 12, `${p.label} has ${p.hand.length} cards at play start (expected 12)`);
        });
        const totalCards = this.players.reduce((s, p) => s + p.hand.length, 0);
        console.assert(totalCards === 48, `Total cards in play: ${totalCards} (expected 48)`);

        this.phase = 'playing';
        this.trickNumber = 1;
        this.currentTrick = [];

        // The bid winner leads the first trick
        this.leadPlayerIndex = this.bidWinner;

        this._emit('onPhaseChange', 'playing', {
            trumpSuit: this.trumpSuit,
            direction: this.direction,
            lead: this.leadPlayerIndex,
        });
        this._emit('onTurnChange', this.leadPlayerIndex);
    }

    /**
     * Play a card into the current trick.
     * Returns: { valid, message, trickComplete }
     */
    playCard(playerIndex, card) {
        if (this.phase !== 'playing') {
            return { valid: false, message: 'Not in playing phase.' };
        }

        const expectedPlayer = this._currentTurnPlayer();
        if (playerIndex !== expectedPlayer) {
            return { valid: false, message: 'Not your turn.' };
        }

        // Validate follow-suit
        const validation = this._validatePlay(playerIndex, card);
        if (!validation.valid) return validation;

        // Remove from hand, add to trick
        this.players[playerIndex].removeCard(card);
        this.currentTrick.push({ playerIndex, card });

        // Check if trick is complete (4 cards played)
        if (this.currentTrick.length === 4) {
            return { valid: true, trickComplete: true };
        }

        // Advance to next player
        this._emit('onTurnChange', this._currentTurnPlayer());
        return { valid: true, trickComplete: false };
    }

    /** Determine whose turn it is in the current trick. */
    _currentTurnPlayer() {
        if (this.currentTrick.length === 0) return this.leadPlayerIndex;
        const lastPlayer = this.currentTrick[this.currentTrick.length - 1].playerIndex;
        return this.nextPlayer(lastPlayer);
    }

    /** Validate that the card play follows suit rules. */
    _validatePlay(playerIndex, card) {
        const player = this.players[playerIndex];

        // Must have the card
        if (!player.hand.find(c => c.id === card.id)) {
            return { valid: false, message: 'Card not in hand.' };
        }

        // If leading, any card is fine
        if (this.currentTrick.length === 0) {
            return { valid: true };
        }

        // Must follow suit of the lead card
        const leadSuit = this.currentTrick[0].card.suit;
        const hasSuit = player.cardsOfSuit(leadSuit).length > 0;

        if (hasSuit && card.suit !== leadSuit) {
            return { valid: false, message: `Must follow suit (${leadSuit}).` };
        }

        return { valid: true };
    }

    /**
     * Resolve a completed trick: determine winner, award trick, set up next.
     * Returns: { winnerIndex, winnerLabel }
     */
    resolveTrick() {
        const winnerIndex = this._determineTrickWinner();
        this.players[winnerIndex].tricksWon++;

        const result = {
            winnerIndex,
            winnerLabel: this.players[winnerIndex].label,
            trick: this.currentTrick.slice(),
            trickNumber: this.trickNumber,
        };

        this._emit('onTrickComplete', winnerIndex, result);

        // Prepare next trick
        this.trickNumber++;
        this.currentTrick = [];
        this.leadPlayerIndex = winnerIndex;

        // Check if hand is over (12 tricks played)
        if (this.trickNumber > 12) {
            this.phase = 'scoring';
            this._emit('onPhaseChange', 'scoring', this._scoreHand());
            return result;
        }

        this._emit('onTurnChange', this.leadPlayerIndex);
        return result;
    }

    /** Determine who wins the current trick based on trump and direction. */
    _determineTrickWinner() {
        const leadSuit = this.currentTrick[0].card.suit;
        let bestIndex = 0;

        for (let i = 1; i < this.currentTrick.length; i++) {
            if (this._beats(this.currentTrick[i], this.currentTrick[bestIndex], leadSuit)) {
                bestIndex = i;
            }
        }

        return this.currentTrick[bestIndex].playerIndex;
    }

    /** Does play A beat play B? Considers trump and direction. */
    _beats(playA, playB, leadSuit) {
        const a = playA.card;
        const b = playB.card;
        const aIsTrump = a.suit === this.trumpSuit;
        const bIsTrump = b.suit === this.trumpSuit;

        // Trump beats non-trump
        if (aIsTrump && !bIsTrump) return true;
        if (!aIsTrump && bIsTrump) return false;

        // Both trump or both non-trump
        if (a.suit === b.suit) {
            const aVal = a.effectiveValue(this.direction);
            const bVal = b.effectiveValue(this.direction);
            if (this.direction === 'low') {
                return aVal < bVal; // Lower is better in Low
            }
            return aVal > bVal; // Higher is better in High
        }

        // Different non-trump suits: the one following lead suit wins
        const aFollows = a.suit === leadSuit;
        const bFollows = b.suit === leadSuit;
        if (aFollows && !bFollows) return true;
        if (!aFollows && bFollows) return false;

        // Neither follows lead suit and neither is trump — first played wins (B)
        return false;
    }

    // ─── Phase: Scoring ───────────────────────────────────

    /** Score the completed hand. */
    _scoreHand() {
        const tricks = this.teamTricks;
        const bidAmount = this.currentBid.amount;
        const bidTeam = this.bidTeam;
        const defTeam = this.defendTeam;

        // Bidding team needs (6 + bidAmount) tricks to make their bid
        const needed = 6 + bidAmount;
        const bidTeamTricks = tricks[bidTeam];
        const made = bidTeamTricks >= needed;

        // Hawaii rules: scoring is just wins, no points for packs above threshold
        if (made) {
            this.scores[bidTeam]++;
        } else {
            this.scores[defTeam]++;
        }

        this.handsPlayed++;

        // Check for game over
        let gameOver = false;
        let winner = null;
        if (this.scores.ns >= this.winTarget) {
            gameOver = true;
            winner = 'ns';
        } else if (this.scores.ew >= this.winTarget) {
            gameOver = true;
            winner = 'ew';
        }

        if (gameOver) {
            this.gameOver = true;
            this.winner = winner;
        }

        const result = {
            bidTeam,
            defTeam,
            bidAmount,
            needed,
            bidTeamTricks,
            defTeamTricks: tricks[defTeam],
            made,
            scores: { ...this.scores },
            gameOver,
            winner,
        };

        this._emit('onHandComplete', result);
        return result;
    }

    // ─── New Hand ─────────────────────────────────────────

    /** Set up for the next hand (advance dealer, reset). */
    nextHand() {
        this.advanceDealer();
        this.startHand();
    }

    /** Reset everything for a brand new game. */
    newGame() {
        this.scores = { ns: 0, ew: 0 };
        this.handsPlayed = 0;
        this.gameOver = false;
        this.winner = null;
        this.dealer = 0;
        this.startHand();
    }

    // ─── Event Emitter ────────────────────────────────────

    _emit(callbackName, ...args) {
        if (typeof this[callbackName] === 'function') {
            this[callbackName](...args);
        }
    }
}
