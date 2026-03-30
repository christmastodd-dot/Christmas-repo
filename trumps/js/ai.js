/**
 * AI — decision-making for computer-controlled players.
 * Implements positional play, trump management, partner awareness, and endgame logic.
 */

const AI = {

    // ═══════════════════════════════════════════════════════
    //  BIDDING
    // ═══════════════════════════════════════════════════════

    /**
     * Decide a bid based on hand strength and position.
     * Returns { amount, direction } or null (pass).
     */
    decideBid(player, currentBid, game) {
        const eval_ = this._evaluateHand(player);

        // Calculate minimum bid considering low superiority
        let minBid;
        if (!currentBid) {
            minBid = 3;
        } else if (eval_.direction === 'low' && currentBid.direction === 'high') {
            // Low can match a High bid at the same number
            minBid = currentBid.amount;
        } else {
            minBid = currentBid.amount + 1;
        }

        // Not strong enough
        if (eval_.maxBid < minBid) return null;

        // Position matters: if partner has already bid, be more conservative
        const partnerBid = this._partnerHasBid(player, game);
        if (partnerBid && eval_.maxBid < minBid + 1) {
            // Partner already has the bid — don't outbid them unless very strong
            return null;
        }

        // Opponents have the bid — be more aggressive to contest
        const opponentHasBid = currentBid && game.players[currentBid.playerIndex].team !== player.team;
        const aggressiveness = opponentHasBid ? 0.8 : 0.55;

        if (Math.random() > aggressiveness && currentBid) return null;

        // First to bid — open if decent
        if (!currentBid && eval_.maxBid >= 3) {
            return { amount: 3, direction: eval_.direction };
        }

        // Bid the minimum needed
        if (eval_.maxBid >= minBid) {
            return { amount: minBid, direction: eval_.direction };
        }

        return null;
    },

    /** Check if partner has the current high bid. */
    _partnerHasBid(player, game) {
        if (!game.currentBid) return false;
        const bidder = game.players[game.currentBid.playerIndex];
        return bidder.team === player.team;
    },

    /**
     * Comprehensive hand evaluation for bidding.
     */
    _evaluateHand(player) {
        const counts = player.suitCounts();

        // Find best suit (longest, break ties by high card strength)
        let bestSuit = null;
        let bestScore = -1;
        for (const suit of SUITS) {
            const cards = player.cardsOfSuit(suit);
            let score = cards.length * 3;
            for (const c of cards) {
                if (c.rank === 14) score += 4;      // Ace
                else if (c.rank === 13) score += 3;  // King
                else if (c.rank === 12) score += 2;  // Queen
                else if (c.rank === 11) score += 1;  // Jack
            }
            if (score > bestScore) {
                bestScore = score;
                bestSuit = suit;
            }
        }

        // Count winners across all suits
        let totalHighCards = 0;
        let trumpHighCards = 0;
        for (const card of player.hand) {
            if (card.rank >= 12) totalHighCards++;
        }
        for (const card of player.cardsOfSuit(bestSuit)) {
            if (card.rank >= 12) trumpHighCards++;
        }

        // Direction: count low cards (2-5) vs high cards (J+)
        let lowCount = 0;
        let highCount = 0;
        for (const card of player.hand) {
            if (card.rank <= 5) lowCount++;
            if (card.rank >= 11) highCount++;
        }
        // Also factor in suit voids for low — being void helps in low
        let voidCount = 0;
        for (const suit of SUITS) {
            if (counts[suit] === 0) voidCount++;
        }
        const direction = (lowCount >= 7 || (lowCount >= 5 && voidCount >= 1)) ? 'low' : 'high';

        // Estimate trick-taking power
        let estimatedTricks = 0;
        const bestCount = counts[bestSuit];

        // Trump length tricks
        if (bestCount >= 4) estimatedTricks += (bestCount - 3) * 0.8;
        if (bestCount >= 6) estimatedTricks += 0.5; // extra for very long trump

        // High cards in trump suit
        estimatedTricks += trumpHighCards * 0.9;

        // High cards in side suits (less reliable)
        const sideHighCards = totalHighCards - trumpHighCards;
        estimatedTricks += sideHighCards * 0.6;

        // Void/singleton bonuses (can trump in)
        for (const suit of SUITS) {
            if (suit === bestSuit) continue;
            if (counts[suit] === 0) estimatedTricks += 1.2;
            else if (counts[suit] === 1) estimatedTricks += 0.6;
        }

        // Convert to bid
        const maxBid = Math.max(0, Math.min(7, Math.floor(estimatedTricks) - 1));
        const bidChance = Math.min(0.9, 0.25 + estimatedTricks / 12);

        return { maxBid, direction, bidChance, strongSuit: bestSuit, estimatedTricks };
    },

    // Keep old name for compatibility
    _evaluateHandStrength(player) {
        return this._evaluateHand(player);
    },

    // ═══════════════════════════════════════════════════════
    //  CARD PLAY
    // ═══════════════════════════════════════════════════════

    /**
     * Choose a card to play with positional awareness.
     */
    chooseCard(player, trick, game) {
        if (player.hand.length === 0) return null;

        // Leading
        if (trick.length === 0) {
            return this._chooseLead(player, game);
        }

        const leadSuit = trick[0].card.suit;
        const suitCards = player.cardsOfSuit(leadSuit);
        const position = trick.length; // 1=second, 2=third, 3=fourth

        // Can follow suit
        if (suitCards.length > 0) {
            return this._followSuit(player, suitCards, trick, position, game);
        }

        // Can't follow — trump or discard
        return this._cantFollowSuit(player, trick, position, game);
    },

    // ─── Leading ──────────────────────────────────────────

    _chooseLead(player, game) {
        const isOnBidTeam = game.isOnBiddingTeam(player.index);
        const trumpCards = player.cardsOfSuit(game.trumpSuit);
        const nonTrump = player.hand.filter(c => c.suit !== game.trumpSuit);

        // Count remaining trump in all hands (estimate)
        const trumpPlayed = 12 - this._estimateRemainingTrump(player, game);

        // ── Strategy 1: Lead trump to pull opponents' trump ──
        if (isOnBidTeam && trumpCards.length >= 3 && trumpPlayed < 8) {
            return this._bestCard(trumpCards, game.direction);
        }

        // ── Strategy 2: Lead a winning card (top of a suit) ──
        for (const suit of SUITS) {
            if (suit === game.trumpSuit) continue;
            const cards = player.cardsOfSuit(suit);
            if (cards.length === 0) continue;
            const best = this._bestCard(cards, game.direction);
            if (this._isLikelyWinner(best, suit, game)) {
                return best;
            }
        }

        // ── Strategy 3: Lead from longest non-trump suit ──
        if (nonTrump.length > 0) {
            let longestSuit = null;
            let longestLen = 0;
            for (const suit of SUITS) {
                if (suit === game.trumpSuit) continue;
                const len = player.cardsOfSuit(suit).length;
                if (len > longestLen) {
                    longestLen = len;
                    longestSuit = suit;
                }
            }
            if (longestSuit) {
                const cards = player.cardsOfSuit(longestSuit);
                return this._bestCard(cards, game.direction);
            }
        }

        // ── Strategy 4: Lead weakest card to avoid waste ──
        if (nonTrump.length > 0) {
            return this._weakestCard(nonTrump, game.direction);
        }

        // Only trump left
        return this._weakestCard(trumpCards, game.direction);
    },

    /** Rough estimate of how many trump are still out. */
    _estimateRemainingTrump(player, game) {
        // We know our own trump count; assume 12 total dealt, estimate rest
        const ourTrump = player.cardsOfSuit(game.trumpSuit).length;
        const tricksDone = game.trickNumber - 1;
        // Rough: 12 total trump in deck, minus ours, minus ~1 per 3 tricks played
        return Math.max(0, 12 - ourTrump - Math.floor(tricksDone / 3));
    },

    /** Is this card likely the best remaining in its suit? */
    _isLikelyWinner(card, suit, game) {
        // If it's an Ace in high, or a 2 (or Ace) in low, it's probably winning
        if (game.direction === 'high') {
            return card.rank >= 13; // K or A
        } else {
            return card.rank <= 3 || card.rank === 14; // Ace (=1), 2, or 3
        }
    },

    // ─── Following suit ───────────────────────────────────

    _followSuit(player, suitCards, trick, position, game) {
        const sorted = this._sortByStrength(suitCards, game.direction);
        const partnerWinning = this._isPartnerWinning(player, trick, game);
        const isLastToPlay = position === 3;

        // ── Fourth seat: play cheaply if partner winning, else try to win ──
        if (isLastToPlay) {
            if (partnerWinning) {
                return sorted[sorted.length - 1]; // Play weakest — partner has it
            }
            // Must win: play lowest card that wins
            for (let i = sorted.length - 1; i >= 0; i--) {
                if (this._wouldWin(sorted[i], trick, game)) {
                    return sorted[i];
                }
            }
            return sorted[sorted.length - 1]; // Can't win — dump weakest
        }

        // ── Second seat: play strong to set pressure ──
        if (position === 1) {
            // If we have the best card, play it
            if (this._wouldWin(sorted[0], trick, game)) {
                // But play the lowest winner to preserve strength
                for (let i = sorted.length - 1; i >= 0; i--) {
                    if (this._wouldWin(sorted[i], trick, game)) {
                        return sorted[i];
                    }
                }
            }
            // Can't beat lead — play weakest
            return sorted[sorted.length - 1];
        }

        // ── Third seat: partner led — help if needed ──
        if (position === 2) {
            if (partnerWinning) {
                return sorted[sorted.length - 1]; // Partner is winning, save strength
            }
            // Try to overtake the opponent's card
            for (let i = sorted.length - 1; i >= 0; i--) {
                if (this._wouldWin(sorted[i], trick, game)) {
                    return sorted[i];
                }
            }
            return sorted[sorted.length - 1]; // Can't win
        }

        // Default: lowest winner or weakest
        for (let i = sorted.length - 1; i >= 0; i--) {
            if (this._wouldWin(sorted[i], trick, game)) {
                return sorted[i];
            }
        }
        return sorted[sorted.length - 1];
    },

    // ─── Can't follow suit ────────────────────────────────

    _cantFollowSuit(player, trick, position, game) {
        const trumpCards = player.cardsOfSuit(game.trumpSuit);
        const partnerWinning = this._isPartnerWinning(player, trick, game);

        // Partner is winning — don't waste trump
        if (partnerWinning) {
            return this._chooseDiscard(player, game);
        }

        // Have trump — consider trumping in
        if (trumpCards.length > 0) {
            // Check if opponent already played trump in this trick
            const opponentTrumped = trick.some(t =>
                t.card.suit === game.trumpSuit &&
                game.players[t.playerIndex].team !== player.team
            );

            if (opponentTrumped) {
                // Need to overtrump
                const opTrump = trick.filter(t =>
                    t.card.suit === game.trumpSuit &&
                    game.players[t.playerIndex].team !== player.team
                );
                const highestOpTrump = this._bestCard(opTrump.map(t => t.card), game.direction);

                // Find our lowest trump that beats theirs
                const sorted = this._sortByStrength(trumpCards, game.direction);
                for (let i = sorted.length - 1; i >= 0; i--) {
                    const fakePlay = { playerIndex: -1, card: sorted[i] };
                    const fakeOp = { playerIndex: -2, card: highestOpTrump };
                    if (game._beats(fakePlay, fakeOp, trick[0].card.suit)) {
                        return sorted[i];
                    }
                }
                // Can't overtrump — discard instead of wasting trump
                return this._chooseDiscard(player, game);
            }

            // No opponent trump yet — play lowest trump
            const sorted = this._sortByStrength(trumpCards, game.direction);
            return sorted[sorted.length - 1];
        }

        // No trump — discard
        return this._chooseDiscard(player, game);
    },

    // ─── Discard selection ────────────────────────────────

    _chooseDiscard(player, game) {
        const nonTrump = player.hand.filter(c => c.suit !== game.trumpSuit);
        if (nonTrump.length === 0) {
            return this._weakestCard(player.hand, game.direction);
        }

        // Priority: discard from shortest non-trump suit (work toward voiding)
        const suitLengths = {};
        for (const c of nonTrump) {
            suitLengths[c.suit] = (suitLengths[c.suit] || 0) + 1;
        }

        // Sort suits by length ascending
        const suits = Object.entries(suitLengths).sort((a, b) => a[1] - b[1]);
        const shortestSuit = suits[0][0];
        const shortCards = nonTrump.filter(c => c.suit === shortestSuit);

        // From that suit, discard the weakest card
        return this._weakestCard(shortCards, game.direction);
    },

    // ═══════════════════════════════════════════════════════
    //  KITTY DISCARDS
    // ═══════════════════════════════════════════════════════

    /**
     * Choose 4 cards to discard after picking up kitty.
     * Strategy: void short non-trump suits, keep trump and high cards.
     */
    chooseDiscards(player, numDiscards) {
        const eval_ = this._evaluateHand(player);
        const trumpSuit = eval_.strongSuit;

        // Score each card for keep-worthiness (lower = more discardable)
        const scored = player.hand.map(card => {
            let keepScore = 0;

            // Trump cards are valuable
            if (card.suit === trumpSuit) {
                keepScore += 20;
                keepScore += card.rank; // Higher trump = more valuable
            }

            // High cards in any suit
            if (card.rank === 14) keepScore += 12;
            else if (card.rank === 13) keepScore += 8;
            else if (card.rank === 12) keepScore += 5;

            // Cards in suits we can void — voiding is valuable
            const suitCount = player.cardsOfSuit(card.suit).length;
            if (card.suit !== trumpSuit) {
                // Shorter suit cards are more discardable (helps void)
                if (suitCount <= 2) keepScore -= 3;
                if (suitCount === 1) keepScore -= 5; // Already a singleton — discard it to void
                // But long side suits have some value
                if (suitCount >= 4) keepScore += 2;
            }

            // Low cards in non-trump suits are nearly worthless
            if (card.suit !== trumpSuit && card.rank <= 8) {
                keepScore -= 3;
            }

            return { card, keepScore };
        });

        // Sort by least keepable first
        scored.sort((a, b) => a.keepScore - b.keepScore);
        return scored.slice(0, numDiscards).map(s => s.card);
    },

    // ═══════════════════════════════════════════════════════
    //  UTILITIES
    // ═══════════════════════════════════════════════════════

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
        return game.players[trick[bestIdx].playerIndex].team === player.team;
    },

    /** Would this card win against all currently played cards? */
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

    /** Get the strongest card (best in direction). */
    _bestCard(cards, direction) {
        const sorted = this._sortByStrength(cards, direction);
        return sorted[0];
    },

    /** Get the weakest card (worst in direction). */
    _weakestCard(cards, direction) {
        const sorted = this._sortByStrength(cards, direction);
        return sorted[sorted.length - 1];
    },

    /** Sort cards strongest first. */
    _sortByStrength(cards, direction) {
        return cards.slice().sort((a, b) => {
            const aVal = a.effectiveValue(direction);
            const bVal = b.effectiveValue(direction);
            if (direction === 'low') return aVal - bVal;
            return bVal - aVal;
        });
    },
};
