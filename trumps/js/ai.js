/**
 * AI — decision-making for computer-controlled players.
 * Basic strategy for bidding and card play.
 */

const AI = {
    /**
     * Decide a bid based on hand strength.
     * Returns { amount, direction } or null (pass).
     */
    decideBid(player, currentBid, game) {
        const strength = this._evaluateHandStrength(player);
        const minBid = currentBid ? currentBid.amount + 1 : 3;

        // Not strong enough to bid
        if (strength.maxBid < minBid) return null;

        // Add some randomness — don't always bid the max
        const willBid = Math.random() < strength.bidChance;
        if (!willBid && currentBid) return null; // Pass if there's already a bid and we're not eager

        // First bidder with a decent hand should usually bid
        if (!currentBid && strength.maxBid >= 3 && Math.random() < 0.7) {
            return { amount: 3, direction: strength.direction };
        }

        // Outbid if strong enough
        if (strength.maxBid >= minBid) {
            const bidAmount = Math.min(minBid, strength.maxBid); // Bid minimum required
            return { amount: bidAmount, direction: strength.direction };
        }

        return null;
    },

    /**
     * Evaluate hand strength for bidding.
     * Returns { maxBid, direction, bidChance, strongSuit }
     */
    _evaluateHandStrength(player) {
        const counts = player.suitCounts();
        let bestSuit = null;
        let bestCount = 0;
        let totalHighCards = 0; // A, K, Q

        for (const suit of SUITS) {
            if (counts[suit] > bestCount) {
                bestCount = counts[suit];
                bestSuit = suit;
            }
        }

        // Count high cards (A, K, Q across all suits)
        for (const card of player.hand) {
            if (card.rank >= 12) totalHighCards++; // Q, K, A
        }

        // Count high cards in best suit
        let suitHighCards = 0;
        for (const card of player.cardsOfSuit(bestSuit)) {
            if (card.rank >= 12) suitHighCards++;
        }

        // Determine direction preference
        let lowCount = 0;
        for (const card of player.hand) {
            if (card.rank <= 5) lowCount++;
        }
        const direction = lowCount >= 7 ? 'low' : 'high';

        // Estimate how many tricks we can win
        let estimatedTricks = 0;

        // Long suit tricks (cards in best suit beyond 3)
        if (bestCount >= 4) estimatedTricks += bestCount - 3;

        // High card tricks
        estimatedTricks += Math.min(totalHighCards, 4);

        // Trump suit bonus
        if (bestCount >= 5) estimatedTricks += 1;

        // Convert estimated tricks to bid (bid = tricks above 6)
        const maxBid = Math.max(0, Math.min(7, Math.floor(estimatedTricks) - 1));

        // Chance of actually bidding (higher with better hand)
        const bidChance = Math.min(0.9, 0.3 + (estimatedTricks / 10));

        return { maxBid, direction, bidChance, strongSuit: bestSuit };
    },

    /**
     * Choose a card to play.
     * Basic strategy: follow suit, play high/low based on direction, trump if possible.
     */
    chooseCard(player, trick, game) {
        if (player.hand.length === 0) return null;

        // If leading, choose a card to lead
        if (trick.length === 0) {
            return this._chooseLead(player, game);
        }

        // Follow suit
        const leadSuit = trick[0].card.suit;
        const suitCards = player.cardsOfSuit(leadSuit);

        if (suitCards.length > 0) {
            return this._chooseBestFollow(suitCards, trick, game);
        }

        // Can't follow suit — trump or discard
        const trumpCards = player.cardsOfSuit(game.trumpSuit);
        if (trumpCards.length > 0) {
            // Check if partner is currently winning
            if (this._isPartnerWinning(player, trick, game)) {
                // Don't trump partner — discard weakest
                return this._chooseDiscard(player, game);
            }
            // Trump in
            return this._chooseSmallestWinningTrump(trumpCards, trick, game);
        }

        // No trump — discard
        return this._chooseDiscard(player, game);
    },

    /** Choose a card to lead with. */
    _chooseLead(player, game) {
        const trumpCards = player.cardsOfSuit(game.trumpSuit);

        // If we have a lot of trump, lead trump to pull them out
        if (trumpCards.length >= 4) {
            return this._bestCard(trumpCards, game.direction);
        }

        // Lead from a strong non-trump suit
        for (const suit of SUITS) {
            if (suit === game.trumpSuit) continue;
            const cards = player.cardsOfSuit(suit);
            if (cards.length >= 3) {
                return this._bestCard(cards, game.direction);
            }
        }

        // Lead highest/lowest non-trump card
        const nonTrump = player.hand.filter(c => c.suit !== game.trumpSuit);
        if (nonTrump.length > 0) {
            return this._bestCard(nonTrump, game.direction);
        }

        return this._bestCard(player.hand, game.direction);
    },

    /** Choose best card when following suit. */
    _chooseBestFollow(suitCards, trick, game) {
        // Try to win the trick if possible
        const sorted = this._sortByStrength(suitCards, game.direction);

        // If we can beat the current best, play our lowest winner
        for (let i = sorted.length - 1; i >= 0; i--) {
            if (this._wouldWin(sorted[i], trick, game)) {
                return sorted[i];
            }
        }

        // Can't win — play weakest
        return sorted[sorted.length - 1];
    },

    /** Choose smallest trump that would win. */
    _chooseSmallestWinningTrump(trumpCards, trick, game) {
        const sorted = this._sortByStrength(trumpCards, game.direction);
        // Play the weakest trump (it'll beat non-trump)
        return sorted[sorted.length - 1];
    },

    /** Choose a card to discard (weakest card from shortest non-trump suit). */
    _chooseDiscard(player, game) {
        const nonTrump = player.hand.filter(c => c.suit !== game.trumpSuit);
        if (nonTrump.length === 0) {
            // Only have trump — play weakest
            const sorted = this._sortByStrength(player.hand, game.direction);
            return sorted[sorted.length - 1];
        }

        // Find shortest suit to void
        const counts = {};
        for (const c of nonTrump) {
            counts[c.suit] = (counts[c.suit] || 0) + 1;
        }

        let shortestSuit = null;
        let shortestCount = Infinity;
        for (const [suit, count] of Object.entries(counts)) {
            if (count < shortestCount) {
                shortestCount = count;
                shortestSuit = suit;
            }
        }

        const shortCards = nonTrump.filter(c => c.suit === shortestSuit);
        const sorted = this._sortByStrength(shortCards, game.direction);
        return sorted[sorted.length - 1]; // Weakest from shortest suit
    },

    /** Check if the player's partner is currently winning the trick. */
    _isPartnerWinning(player, trick, game) {
        if (trick.length === 0) return false;
        const leadSuit = trick[0].card.suit;
        let bestIdx = 0;
        for (let i = 1; i < trick.length; i++) {
            if (game._beats(trick[i], trick[bestIdx], leadSuit)) {
                bestIdx = i;
            }
        }
        const winningPlayer = trick[bestIdx].playerIndex;
        return game.players[winningPlayer].team === player.team;
    },

    /** Would this card win the current trick? */
    _wouldWin(card, trick, game) {
        const leadSuit = trick[0].card.suit;
        const fakePlay = { playerIndex: -1, card };
        let best = trick[0];
        for (let i = 1; i < trick.length; i++) {
            if (game._beats(trick[i], best, leadSuit)) {
                best = trick[i];
            }
        }
        return game._beats(fakePlay, best, leadSuit);
    },

    /** Get the best card (strongest in direction). */
    _bestCard(cards, direction) {
        const sorted = this._sortByStrength(cards, direction);
        return sorted[0];
    },

    /** Sort cards by strength (strongest first). */
    _sortByStrength(cards, direction) {
        return cards.slice().sort((a, b) => {
            const aVal = a.effectiveValue(direction);
            const bVal = b.effectiveValue(direction);
            if (direction === 'low') return aVal - bVal; // Lower is stronger
            return bVal - aVal; // Higher is stronger
        });
    },

    /**
     * Choose 4 cards to discard after picking up kitty.
     * Strategy: void shortest non-trump suits, discard weak cards.
     */
    chooseDiscards(player, numDiscards) {
        const strength = this._evaluateHandStrength(player);
        const trumpSuit = strength.strongSuit;

        // Score each card for discard desirability (higher = more discardable)
        const scored = player.hand.map(card => {
            let score = 0;
            // Non-trump cards are more discardable
            if (card.suit !== trumpSuit) score += 10;
            // Low cards in non-trump suits are most discardable
            if (card.suit !== trumpSuit && card.rank <= 10) score += 5;
            // Cards from short suits (helps void the suit)
            const count = player.cardsOfSuit(card.suit).length;
            if (card.suit !== trumpSuit && count <= 3) score += 8 - count;
            return { card, score };
        });

        // Sort by most discardable first
        scored.sort((a, b) => b.score - a.score);
        return scored.slice(0, numDiscards).map(s => s.card);
    },
};
