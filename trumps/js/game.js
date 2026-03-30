/**
 * Game — core game state and flow controller for Hawaii Trumps.
 * Orchestrates dealing, bidding, kitty, trick play, and scoring.
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

        // Hand state
        this.kitty = [];
        this.dealer = 0;          // index of current dealer
        this.currentBid = null;   // { player, amount, direction }
        this.trumpSuit = null;
        this.direction = null;    // 'high' or 'low'
        this.currentTrick = [];   // [{ player, card }]
        this.leadPlayer = null;   // index of who leads current trick
        this.trickNumber = 0;
        this.phase = 'idle';      // idle | dealing | bidding | kitty | playing | scoring
    }

    /** Start a new hand: shuffle, deal, begin bidding. */
    startHand() {
        // Reset players
        this.players.forEach(p => p.reset());
        this.kitty = [];
        this.currentBid = null;
        this.trumpSuit = null;
        this.direction = null;
        this.currentTrick = [];
        this.trickNumber = 0;

        // Deal
        const { hands, kitty } = this.deck.deal();
        this.kitty = kitty;
        this.players.forEach((p, i) => p.receiveCards(hands[i]));

        this.phase = 'dealing';
        return { hands, kitty };
    }

    /** Get the player to the left of the dealer (first to bid). */
    get firstBidder() {
        return (this.dealer + 1) % 4;
    }

    /** Advance dealer to next player. */
    advanceDealer() {
        this.dealer = (this.dealer + 1) % 4;
    }

    /** Get team trick counts. */
    get teamTricks() {
        return {
            ns: this.players[0].tricksWon + this.players[2].tricksWon,
            ew: this.players[1].tricksWon + this.players[3].tricksWon,
        };
    }
}
