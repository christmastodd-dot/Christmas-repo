/**
 * Player — represents one seat at the table.
 * Positions: 0=South (human), 1=West, 2=North (partner), 3=East
 * Teams: N/S = players 0,2  |  E/W = players 1,3
 */

const POSITIONS = ['south', 'west', 'north', 'east'];
const POSITION_LABELS = {
    south: 'You (South)',
    west: 'West',
    north: 'North (Partner)',
    east: 'East',
};

class Player {
    constructor(index) {
        this.index = index;
        this.position = POSITIONS[index];
        this.label = POSITION_LABELS[this.position];
        this.isHuman = index === 0;
        this.team = (index % 2 === 0) ? 'ns' : 'ew'; // 0,2 = N/S; 1,3 = E/W
        this.hand = [];
        this.tricksWon = 0;
    }

    /** Receive dealt cards and sort the hand. */
    receiveCards(cards) {
        this.hand = cards.slice();
        this.sortHand();
    }

    /** Sort hand by suit grouping, then rank descending. */
    sortHand() {
        this.hand.sort(Card.compareBySuitThenRank);
    }

    /** Remove a card from hand (after playing it). */
    removeCard(card) {
        const idx = this.hand.findIndex(c => c.id === card.id);
        if (idx !== -1) this.hand.splice(idx, 1);
    }

    /** Add cards to hand (e.g., picking up kitty). */
    addCards(cards) {
        this.hand.push(...cards);
        this.sortHand();
    }

    /** Get cards of a specific suit in hand. */
    cardsOfSuit(suit) {
        return this.hand.filter(c => c.suit === suit);
    }

    /** Reset for a new hand. */
    reset() {
        this.hand = [];
        this.tricksWon = 0;
    }
}
