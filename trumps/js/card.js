/**
 * Card — represents a single playing card.
 *
 * Hawaii Trumps uses a standard 52-card deck (no jokers).
 */

const SUITS = ['spades', 'hearts', 'diamonds', 'clubs'];
const SUIT_SYMBOLS = {
    spades: '\u2660',
    hearts: '\u2665',
    diamonds: '\u2666',
    clubs: '\u2663',
};
const SUIT_COLORS = {
    spades: 'black',
    hearts: 'red',
    diamonds: 'red',
    clubs: 'black',
};

// Rank values: 2=2 .. 10=10, J=11, Q=12, K=13, A=14
const RANKS = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];
const RANK_NAMES = {
    2: '2', 3: '3', 4: '4', 5: '5', 6: '6', 7: '7', 8: '8', 9: '9', 10: '10',
    11: 'J', 12: 'Q', 13: 'K', 14: 'A',
};

class Card {
    constructor(suit, rank) {
        this.suit = suit;       // e.g. 'spades'
        this.rank = rank;       // numeric: 2-14 (14=Ace)
        this.id = `${RANK_NAMES[rank]}_${suit}`;
    }

    get name() {
        return `${RANK_NAMES[this.rank]} of ${this.suit}`;
    }

    get symbol() {
        return SUIT_SYMBOLS[this.suit];
    }

    get color() {
        return SUIT_COLORS[this.suit];
    }

    get displayRank() {
        return RANK_NAMES[this.rank];
    }

    /**
     * Returns the effective value of this card given the bid direction.
     * High: A=14 is best, 2=2 is worst (normal order).
     * Low:  A=1 is best (low), 2=2, ... K=13 is worst.
     */
    effectiveValue(direction) {
        if (direction === 'low') {
            // In Low, Ace becomes 1 (the best low card)
            return this.rank === 14 ? 1 : this.rank;
        }
        return this.rank; // High — normal order
    }

    /**
     * Compare two cards for sorting a hand display (always high-to-low by suit grouping).
     */
    static compareBySuitThenRank(a, b) {
        const suitOrder = SUITS.indexOf(a.suit) - SUITS.indexOf(b.suit);
        if (suitOrder !== 0) return suitOrder;
        return b.rank - a.rank; // High rank first within suit
    }

    /**
     * Create an HTML element for this card (face-up).
     */
    toElement() {
        const el = document.createElement('div');
        el.className = `card card-face ${this.color}`;
        el.dataset.cardId = this.id;

        el.innerHTML = `
            <span class="rank-top">${this.displayRank}<br>${this.symbol}</span>
            <span class="suit-center">${this.symbol}</span>
            <span class="rank-bottom">${this.displayRank}<br>${this.symbol}</span>
        `;
        return el;
    }

    /**
     * Create an HTML element for a face-down card.
     */
    static backElement() {
        const el = document.createElement('div');
        el.className = 'card card-back';
        return el;
    }
}
