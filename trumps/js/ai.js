/**
 * AI — decision-making for computer-controlled players.
 * Stub for Milestone 1 — will be implemented in Milestone 7.
 */

const AI = {
    /** Placeholder: decide a bid. */
    decideBid(player, currentBid, game) {
        return null; // pass
    },

    /** Placeholder: choose a card to play. */
    chooseCard(player, trick, game) {
        // For now, play the first legal card
        return player.hand[0] || null;
    },

    /** Placeholder: choose cards to discard from kitty. */
    chooseDiscards(player, numDiscards) {
        return player.hand.slice(-numDiscards);
    },
};
