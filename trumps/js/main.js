/**
 * Main — entry point and game flow controller.
 * Wires Game events to UI updates and manages turn flow.
 */

(function () {
    const game = new Game();
    window.trumpsGame = game;

    // ─── Event Callbacks ──────────────────────────────────

    game.onPhaseChange = (phase, data) => {
        console.log(`Phase: ${phase}`, data);

        switch (phase) {
            case 'dealing':
                UI.clearPlayArea();
                UI.renderAllHands(game.players);
                UI.renderScores(game.scores);
                UI.setStatus(`Dealing... Dealer: ${game.players[game.dealer].label}`);
                // Auto-advance to bidding after a short delay for deal animation
                setTimeout(() => game.startBidding(), 800);
                break;

            case 'bidding':
                UI.setStatus('Bidding phase — place your bids!');
                processBiddingTurn();
                break;

            case 'redeal':
                UI.setStatus('Everyone passed! Redealing...');
                setTimeout(() => {
                    game.advanceDealer();
                    game.startHand();
                }, 1500);
                break;

            case 'kitty':
                UI.setStatus(`${game.players[data.bidWinner].label} won the bid at ${data.bid.amount} ${data.bid.direction || ''}.`);
                handleKittyPhase();
                break;

            case 'trumpSelect':
                handleTrumpSelection();
                break;

            case 'playing':
                UI.setStatus(`Trump: ${SUIT_SYMBOLS[data.trumpSuit]} ${data.direction.toUpperCase()} — ${game.players[data.lead].label} leads.`);
                UI.renderAllHands(game.players);
                processPlayTurn();
                break;

            case 'scoring':
                handleScoring(data);
                break;
        }
    };

    game.onTurnChange = (playerIndex) => {
        console.log(`Turn: ${game.players[playerIndex].label}`);
    };

    game.onTrickComplete = (winnerIndex, result) => {
        console.log(`Trick ${result.trickNumber} won by ${result.winnerLabel}`);
    };

    game.onHandComplete = (result) => {
        console.log('Hand complete:', result);
    };

    // ─── Bidding Flow ─────────────────────────────────────

    function processBiddingTurn() {
        if (game.phase !== 'bidding') return;

        const bidder = game.players[game.bidderIndex];
        UI.setStatus(`Bidding: ${bidder.label}'s turn. ${game.currentBid ? `Current bid: ${game.currentBid.amount} ${game.currentBid.direction || ''}` : 'No bids yet.'}`);

        if (bidder.isHuman) {
            showBidPanel();
        } else {
            // AI bids after a short delay
            setTimeout(() => {
                const aiBid = AI.decideBid(bidder, game.currentBid, game);
                const result = game.placeBid(bidder.index, aiBid);
                if (result.valid) {
                    UI.setStatus(result.message);
                    if (result.biddingComplete) {
                        // Phase change callback will handle next step
                    } else {
                        setTimeout(() => processBiddingTurn(), 600);
                    }
                }
            }, 500 + Math.random() * 500);
        }
    }

    function showBidPanel() {
        const panel = document.getElementById('bid-panel');
        const controls = document.getElementById('bid-controls');
        controls.innerHTML = '';

        const minBid = game.currentBid ? game.currentBid.amount + 1 : 3;

        // Direction buttons
        const dirRow = document.createElement('div');
        dirRow.className = 'bid-info';
        dirRow.innerHTML = '<strong>Direction:</strong>';
        let selectedDirection = 'high';

        const highBtn = document.createElement('button');
        highBtn.className = 'btn btn-secondary selected';
        highBtn.textContent = 'High';
        highBtn.onclick = () => {
            selectedDirection = 'high';
            highBtn.classList.add('selected');
            lowBtn.classList.remove('selected');
        };

        const lowBtn = document.createElement('button');
        lowBtn.className = 'btn btn-secondary';
        lowBtn.textContent = 'Low';
        lowBtn.onclick = () => {
            selectedDirection = 'low';
            lowBtn.classList.add('selected');
            highBtn.classList.remove('selected');
        };

        dirRow.appendChild(highBtn);
        dirRow.appendChild(lowBtn);
        controls.appendChild(dirRow);

        // Bid amount buttons
        const amtRow = document.createElement('div');
        amtRow.className = 'bid-info';
        amtRow.innerHTML = '<strong>Bid:</strong> ';

        for (let n = minBid; n <= 7; n++) {
            const btn = document.createElement('button');
            btn.className = 'btn btn-primary';
            btn.textContent = n;
            btn.onclick = () => {
                UI.hidePanel('bid-panel');
                const result = game.placeBid(0, { amount: n, direction: selectedDirection });
                if (result.valid) {
                    UI.setStatus(result.message);
                    if (!result.biddingComplete) {
                        setTimeout(() => processBiddingTurn(), 600);
                    }
                }
            };
            amtRow.appendChild(btn);
        }
        controls.appendChild(amtRow);

        // Pass button
        const passBtn = document.createElement('button');
        passBtn.className = 'btn btn-secondary';
        passBtn.textContent = 'Pass';
        passBtn.style.marginTop = '10px';
        passBtn.onclick = () => {
            UI.hidePanel('bid-panel');
            const result = game.placeBid(0, null);
            if (result.valid) {
                UI.setStatus(result.message);
                if (!result.biddingComplete) {
                    setTimeout(() => processBiddingTurn(), 600);
                }
            }
        };
        controls.appendChild(passBtn);

        UI.showPanel('bid-panel');
    }

    // ─── Kitty Phase ──────────────────────────────────────

    function handleKittyPhase() {
        game.pickUpKitty();
        const winner = game.players[game.bidWinner];

        if (winner.isHuman) {
            showKittyPanel(winner);
        } else {
            // AI discards
            setTimeout(() => {
                const discards = AI.chooseDiscards(winner, 4);
                game.discardFromKitty(discards);
                // AI declares trump
                if (game.phase === 'trumpSelect') {
                    const suit = winner.strongestSuit();
                    const dir = game.direction || 'high';
                    game.declareTrump(suit, dir);
                }
            }, 800);
        }
    }

    function showKittyPanel(player) {
        UI.renderHand(player); // Re-render with 16 cards

        const panel = document.getElementById('kitty-panel');
        const controls = document.getElementById('kitty-controls');
        controls.innerHTML = '';

        const info = document.createElement('div');
        info.className = 'bid-info';
        info.textContent = 'Select 4 cards from your hand to discard, then click Confirm.';
        controls.appendChild(info);

        const selected = new Set();

        // Make player's cards selectable
        const handEl = document.getElementById('hand-south');
        handEl.querySelectorAll('.card').forEach(cardEl => {
            cardEl.onclick = () => {
                const cardId = cardEl.dataset.cardId;
                if (selected.has(cardId)) {
                    selected.delete(cardId);
                    cardEl.classList.remove('selected');
                } else if (selected.size < 4) {
                    selected.add(cardId);
                    cardEl.classList.add('selected');
                }
                confirmBtn.disabled = selected.size !== 4;
                info.textContent = `Select ${4 - selected.size} more card(s) to discard.`;
                if (selected.size === 4) info.textContent = 'Click Confirm to discard.';
            };
        });

        const confirmBtn = document.createElement('button');
        confirmBtn.className = 'btn btn-primary';
        confirmBtn.textContent = 'Confirm Discards';
        confirmBtn.disabled = true;
        confirmBtn.onclick = () => {
            const discards = player.hand.filter(c => selected.has(c.id));
            const result = game.discardFromKitty(discards);
            if (result.valid) {
                UI.hidePanel('kitty-panel');
                UI.renderHand(player);
                // If we still need trump selection, that phase callback handles it
            } else {
                info.textContent = result.message;
            }
        };
        controls.appendChild(confirmBtn);

        UI.showPanel('kitty-panel');
    }

    // ─── Trump Selection ──────────────────────────────────

    function handleTrumpSelection() {
        const winner = game.players[game.bidWinner];

        if (winner.isHuman) {
            showTrumpPanel();
        } else {
            // AI picks trump
            setTimeout(() => {
                const suit = winner.strongestSuit();
                const dir = game.direction || 'high';
                game.declareTrump(suit, dir);
            }, 600);
        }
    }

    function showTrumpPanel() {
        const panel = document.getElementById('trump-panel');
        const controls = document.getElementById('trump-controls');
        controls.innerHTML = '';

        // Direction selection (if not yet set)
        if (!game.direction) {
            const dirRow = document.createElement('div');
            dirRow.className = 'bid-info';
            dirRow.innerHTML = '<strong>Direction:</strong>';

            let selectedDir = 'high';
            const highBtn = document.createElement('button');
            highBtn.className = 'btn btn-secondary selected';
            highBtn.textContent = 'High';
            highBtn.onclick = () => {
                selectedDir = 'high';
                highBtn.classList.add('selected');
                lowBtn.classList.remove('selected');
            };

            const lowBtn = document.createElement('button');
            lowBtn.className = 'btn btn-secondary';
            lowBtn.textContent = 'Low';
            lowBtn.onclick = () => {
                selectedDir = 'low';
                lowBtn.classList.add('selected');
                highBtn.classList.remove('selected');
            };

            dirRow.appendChild(highBtn);
            dirRow.appendChild(lowBtn);
            controls.appendChild(dirRow);

            // Store reference for suit buttons
            controls.dataset.getDir = '';
            Object.defineProperty(controls, '_getDirection', {
                value: () => selectedDir,
                configurable: true,
            });
        }

        // Suit buttons
        const suitRow = document.createElement('div');
        suitRow.className = 'bid-info';
        suitRow.innerHTML = '<strong>Trump Suit:</strong>';

        for (const suit of SUITS) {
            const btn = document.createElement('button');
            btn.className = `btn btn-suit`;
            btn.innerHTML = `${SUIT_SYMBOLS[suit]} ${suit}`;
            btn.onclick = () => {
                const dir = game.direction || (controls._getDirection ? controls._getDirection() : 'high');
                const result = game.declareTrump(suit, dir);
                if (result.valid) {
                    UI.hidePanel('trump-panel');
                }
            };
            suitRow.appendChild(btn);
        }
        controls.appendChild(suitRow);

        UI.showPanel('trump-panel');
    }

    // ─── Trick Play ───────────────────────────────────────

    function processPlayTurn() {
        if (game.phase !== 'playing') return;

        const currentIndex = game._currentTurnPlayer();
        const player = game.players[currentIndex];

        if (player.isHuman) {
            enableCardPlay();
        } else {
            // AI plays after delay
            setTimeout(() => {
                const card = AI.chooseCard(player, game.currentTrick, game);
                if (card) {
                    const result = game.playCard(player.index, card);
                    if (result.valid) {
                        UI.showPlayedCard(player, card);
                        UI.renderHand(player);
                        if (result.trickComplete) {
                            handleTrickEnd();
                        } else {
                            processPlayTurn();
                        }
                    }
                }
            }, 400 + Math.random() * 400);
        }
    }

    function enableCardPlay() {
        UI.setStatus(`Your turn — play a card. Trump: ${SUIT_SYMBOLS[game.trumpSuit]} ${game.direction.toUpperCase()}`);
        const handEl = document.getElementById('hand-south');
        handEl.querySelectorAll('.card').forEach(cardEl => {
            cardEl.onclick = () => {
                const cardId = cardEl.dataset.cardId;
                const card = game.players[0].hand.find(c => c.id === cardId);
                if (!card) return;

                const result = game.playCard(0, card);
                if (result.valid) {
                    UI.showPlayedCard(game.players[0], card);
                    UI.renderHand(game.players[0]);
                    disableCardPlay();
                    if (result.trickComplete) {
                        handleTrickEnd();
                    } else {
                        processPlayTurn();
                    }
                } else {
                    UI.setStatus(result.message);
                }
            };
        });
    }

    function disableCardPlay() {
        const handEl = document.getElementById('hand-south');
        handEl.querySelectorAll('.card').forEach(cardEl => {
            cardEl.onclick = null;
        });
    }

    function handleTrickEnd() {
        // Short delay to show the completed trick, then resolve
        setTimeout(() => {
            const result = game.resolveTrick();
            const tricks = game.teamTricks;
            UI.setStatus(`Trick ${result.trickNumber} won by ${result.winnerLabel}! (N/S: ${tricks.ns} | E/W: ${tricks.ew})`);

            // Clear play area and continue after a pause
            setTimeout(() => {
                UI.clearPlayArea();
                if (game.phase === 'playing') {
                    processPlayTurn();
                }
                // If scoring, the phase change callback handles it
            }, 1200);
        }, 800);
    }

    // ─── Scoring ──────────────────────────────────────────

    function handleScoring(data) {
        UI.renderScores(game.scores);
        const msg = data.made
            ? `${data.bidTeam.toUpperCase()} made their bid of ${data.bidAmount}! (${data.bidTeamTricks} tricks)`
            : `${data.bidTeam.toUpperCase()} went SET on ${data.bidAmount}! (Only ${data.bidTeamTricks} tricks, needed ${data.needed})`;

        UI.setStatus(`${msg} — Score: N/S ${data.scores.ns} | E/W ${data.scores.ew}`);

        // Auto-start next hand after delay
        setTimeout(() => {
            game.nextHand();
        }, 3000);
    }

    // ─── Start the game ───────────────────────────────────

    game.startHand();
})();
