/**
 * Deck — 52-card deck for Hawaii Trumps (no jokers).
 * Handles creation, shuffling, and dealing.
 */

class Deck {
    constructor() {
        this.cards = [];
        this.build();
    }

    /** Build a fresh 52-card deck. */
    build() {
        this.cards = [];
        for (const suit of SUITS) {
            for (const rank of RANKS) {
                this.cards.push(new Card(suit, rank));
            }
        }
    }

    /** Fisher-Yates shuffle. */
    shuffle() {
        for (let i = this.cards.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
        }
    }

    /**
     * Deal the deck for a 4-player Hawaii Trumps game.
     * Returns { hands: [hand0, hand1, hand2, hand3], kitty: Card[] }
     * Each hand has 12 cards, kitty has 4 cards.
     */
    deal() {
        this.build();
        this.shuffle();

        const hands = [[], [], [], []];
        // Deal 12 cards to each player (round-robin)
        for (let i = 0; i < 48; i++) {
            hands[i % 4].push(this.cards[i]);
        }
        // Remaining 4 cards go to kitty
        const kitty = this.cards.slice(48, 52);

        return { hands, kitty };
    }
}
