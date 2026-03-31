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

        const center = this._buildCenter();

        el.innerHTML = `
            <span class="rank-top"><span class="rank-label">${this.displayRank}</span><span class="rank-suit">${this.symbol}</span></span>
            ${center}
            <span class="rank-bottom"><span class="rank-label">${this.displayRank}</span><span class="rank-suit">${this.symbol}</span></span>
        `;
        return el;
    }

    /**
     * Build the center content of the card — pips for numbered, art for face cards.
     */
    _buildCenter() {
        if (this.rank >= 11 && this.rank <= 13) {
            return this._faceCardCenter();
        }
        if (this.rank === 14) {
            // Ace — single large pip
            return `<span class="suit-center suit-ace">${this.symbol}</span>`;
        }
        return this._pipLayout();
    }

    /**
     * Generate pip layout for numbered cards (2-10).
     */
    _pipLayout() {
        const s = this.symbol;
        // Pip position classes: t=top, m=middle, b=bottom, l=left, r=right, c=center
        const layouts = {
            2:  ['tc', 'bc'],
            3:  ['tc', 'mc', 'bc'],
            4:  ['tl', 'tr', 'bl', 'br'],
            5:  ['tl', 'tr', 'mc', 'bl', 'br'],
            6:  ['tl', 'tr', 'ml', 'mr', 'bl', 'br'],
            7:  ['tl', 'tr', 'ml', 'mr', 'tmc', 'bl', 'br'],
            8:  ['tl', 'tr', 'ml', 'mr', 'tmc', 'bmc', 'bl', 'br'],
            9:  ['tl', 'tr', 'tml', 'tmr', 'mc', 'bml', 'bmr', 'bl', 'br'],
            10: ['tl', 'tr', 'tml', 'tmr', 'tmc', 'bmc', 'bml', 'bmr', 'bl', 'br'],
        };
        const pips = layouts[this.rank] || [];
        const pipEls = pips.map(pos => `<span class="pip pip-${pos}">${s}</span>`).join('');
        return `<div class="pip-area">${pipEls}</div>`;
    }

    /**
     * Generate face card center art with inline SVG portraits.
     */
    _faceCardCenter() {
        const c = this.color === 'red' ? '#c0392b' : '#1a1a1a';
        const c2 = this.color === 'red' ? '#e74c3c' : '#333';
        const bg = this.color === 'red' ? '#fde8e5' : '#e8e8f0';

        const portraits = {
            11: `<svg viewBox="0 0 40 52" class="face-svg">
                <rect x="2" y="2" width="36" height="48" rx="4" fill="${bg}" stroke="${c}" stroke-width="1"/>
                <circle cx="20" cy="16" r="7" fill="${c2}"/>
                <rect x="12" y="22" width="16" height="4" rx="2" fill="${c}"/>
                <path d="M14 26 L14 38 L18 38 L18 30 L22 30 L22 38 L26 38 L26 26 Z" fill="${c}"/>
                <rect x="10" y="23" width="20" height="2" rx="1" fill="${c2}"/>
                <circle cx="20" cy="10" r="2" fill="${bg}"/>
                <rect x="16" y="6" width="8" height="3" rx="1" fill="${c}"/>
            </svg>`,
            12: `<svg viewBox="0 0 40 52" class="face-svg">
                <rect x="2" y="2" width="36" height="48" rx="4" fill="${bg}" stroke="${c}" stroke-width="1"/>
                <circle cx="20" cy="16" r="7" fill="${c2}"/>
                <path d="M14 22 Q14 40 20 42 Q26 40 26 22 Z" fill="${c}"/>
                <circle cx="20" cy="16" r="5" fill="${bg}" opacity="0.3"/>
                <path d="M14 7 L16 12 L20 9 L24 12 L26 7 L23 10 L20 6 L17 10 Z" fill="${c}"/>
                <circle cx="20" cy="10" r="1.5" fill="${bg}"/>
            </svg>`,
            13: `<svg viewBox="0 0 40 52" class="face-svg">
                <rect x="2" y="2" width="36" height="48" rx="4" fill="${bg}" stroke="${c}" stroke-width="1"/>
                <circle cx="20" cy="16" r="7" fill="${c2}"/>
                <path d="M12 24 L12 38 L16 38 L16 32 L24 32 L24 38 L28 38 L28 24 Z" fill="${c}"/>
                <rect x="12" y="22" width="16" height="4" rx="2" fill="${c}"/>
                <polygon points="13,8 20,3 27,8 24,8 20,5 16,8" fill="${c}"/>
                <rect x="15" y="8" width="10" height="2" rx="1" fill="${c2}"/>
                <circle cx="20" cy="5" r="1.5" fill="${bg}"/>
            </svg>`,
        };

        return `<div class="face-art">
            ${portraits[this.rank]}
            <span class="face-suit">${this.symbol}</span>
        </div>`;
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
