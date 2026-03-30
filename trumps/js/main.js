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
                UI.hideTrumpInfo();
                UI.hideTrickCounts();
                UI.clearPlayArea();
                UI.renderAllHands(game.players);
                UI.renderScores(game.scores);
                UI.showDealerChip(game.dealer);
                UI.setStatus(`Dealing... Dealer: ${game.players[game.dealer].label}`);
                setTimeout(() => game.startBidding(), 800);
                break;

            case 'bidding':
                UI.showBidHistory();
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
                UI.clearPlayArea();
                UI.addBidEntry(
                    game.players[data.bidWinner].label,
                    `WINS at ${data.bid.amount} ${data.bid.direction || ''}`,
                    true
                );
                UI.setStatus(`${game.players[data.bidWinner].label} won the bid at ${data.bid.amount} ${data.bid.direction || ''}.`);
                handleKittyPhase();
                break;

            case 'trumpSelect':
                handleTrumpSelection();
                break;

            case 'playing':
                UI.clearPlayArea();
                UI.showTrumpInfo(data.trumpSuit, data.direction, game.trickNumber);
                UI.showTrickCounts(0, 0);
                UI.setStatus(`${game.players[data.lead].label} leads.`);
                UI.renderAllHands(game.players);
                processPlayTurn();
                break;

            case 'scoring':
                handleScoring(data);
                break;
        }
    };

    game.onTurnChange = (playerIndex) => {
        UI.setActiveSeat(playerIndex);
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
        UI.setActiveSeat(game.bidderIndex);

        const currentBidText = game.currentBid
            ? `Current high bid: ${game.currentBid.amount} ${game.currentBid.direction} by ${game.players[game.currentBid.playerIndex].label}`
            : 'No bids yet.';
        UI.setStatus(`${bidder.label}'s turn to bid. ${currentBidText}`);

        if (bidder.isHuman) {
            showBidPanel();
        } else {
            setTimeout(() => {
                const aiBid = AI.decideBid(bidder, game.currentBid, game);
                const result = game.placeBid(bidder.index, aiBid);
                if (result.valid) {
                    // Add to bid history
                    if (aiBid) {
                        UI.addBidEntry(bidder.label, `${aiBid.amount} ${aiBid.direction}`, false);
                    } else {
                        UI.addBidEntry(bidder.label, 'Pass', false);
                    }
                    UI.setStatus(result.message);
                    if (!result.biddingComplete) {
                        setTimeout(() => processBiddingTurn(), 700);
                    }
                }
            }, 600 + Math.random() * 600);
        }
    }

    function showBidPanel() {
        const controls = document.getElementById('bid-controls');
        controls.innerHTML = '';

        const minBid = game.currentBid ? game.currentBid.amount + 1 : 3;

        // Current bid info
        if (game.currentBid) {
            const info = document.createElement('div');
            info.className = 'bid-info';
            info.innerHTML = `Current bid: <strong>${game.currentBid.amount} ${game.currentBid.direction}</strong> by ${game.players[game.currentBid.playerIndex].label}`;
            controls.appendChild(info);
        }

        // Direction toggle
        const dirRow = document.createElement('div');
        dirRow.className = 'bid-info';
        let selectedDirection = 'high';

        const dirLabel = document.createElement('span');
        dirLabel.innerHTML = '<strong>Direction: </strong>';
        dirRow.appendChild(dirLabel);

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

        if (minBid <= 7) {
            const amtLabel = document.createElement('span');
            amtLabel.innerHTML = '<strong>Bid: </strong>';
            amtRow.appendChild(amtLabel);

            for (let n = minBid; n <= 7; n++) {
                const btn = document.createElement('button');
                btn.className = 'btn btn-primary';
                btn.textContent = n;
                btn.onclick = () => {
                    UI.hidePanel('bid-panel');
                    const bid = { amount: n, direction: selectedDirection };
                    const result = game.placeBid(0, bid);
                    if (result.valid) {
                        UI.addBidEntry('You', `${n} ${selectedDirection}`, false);
                        UI.setStatus(result.message);
                        if (!result.biddingComplete) {
                            setTimeout(() => processBiddingTurn(), 700);
                        }
                    }
                };
                amtRow.appendChild(btn);
            }
        } else {
            amtRow.innerHTML = '<em>Cannot outbid — pass or the bid stands.</em>';
        }
        controls.appendChild(amtRow);

        // Pass button
        const passRow = document.createElement('div');
        passRow.style.marginTop = '12px';

        const passBtn = document.createElement('button');
        passBtn.className = 'btn btn-secondary';
        passBtn.textContent = 'Pass';
        passBtn.onclick = () => {
            UI.hidePanel('bid-panel');
            const result = game.placeBid(0, null);
            if (result.valid) {
                UI.addBidEntry('You', 'Pass', false);
                UI.setStatus(result.message);
                if (!result.biddingComplete) {
                    setTimeout(() => processBiddingTurn(), 700);
                }
            }
        };
        passRow.appendChild(passBtn);
        controls.appendChild(passRow);

        UI.showPanel('bid-panel');
    }

    // ─── Kitty Phase ──────────────────────────────────────

    function handleKittyPhase() {
        game.pickUpKitty();
        const winner = game.players[game.bidWinner];

        if (winner.isHuman) {
            showKittyPanel(winner);
        } else {
            UI.setStatus(`${winner.label} is looking at the kitty...`);
            setTimeout(() => {
                const discards = AI.chooseDiscards(winner, 4);
                game.discardFromKitty(discards);
                if (game.phase === 'trumpSelect') {
                    const strength = AI._evaluateHandStrength(winner);
                    const suit = strength.strongSuit;
                    const dir = game.direction || strength.direction;
                    game.declareTrump(suit, dir);
                }
            }, 1000);
        }
    }

    function showKittyPanel(player) {
        UI.renderHand(player); // Re-render with 16 cards

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
                if (selected.size < 4) {
                    info.textContent = `Select ${4 - selected.size} more card(s) to discard.`;
                } else {
                    info.textContent = 'Click Confirm to discard these 4 cards.';
                }
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
            setTimeout(() => {
                const strength = AI._evaluateHandStrength(winner);
                const suit = strength.strongSuit;
                const dir = game.direction || strength.direction;
                game.declareTrump(suit, dir);
            }, 600);
        }
    }

    function showTrumpPanel() {
        const controls = document.getElementById('trump-controls');
        controls.innerHTML = '';

        let selectedDir = game.direction || 'high';

        // Direction selection (if not yet set during bidding)
        if (!game.direction) {
            const dirRow = document.createElement('div');
            dirRow.className = 'bid-info';

            const dirLabel = document.createElement('span');
            dirLabel.innerHTML = '<strong>Direction: </strong>';
            dirRow.appendChild(dirLabel);

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
        }

        // Suit buttons
        const suitRow = document.createElement('div');
        suitRow.className = 'bid-info';
        const suitLabel = document.createElement('div');
        suitLabel.innerHTML = '<strong>Choose Trump Suit:</strong>';
        suitLabel.style.marginBottom = '8px';
        suitRow.appendChild(suitLabel);

        for (const suit of SUITS) {
            const btn = document.createElement('button');
            btn.className = 'btn btn-suit';
            const color = SUIT_COLORS[suit];
            btn.innerHTML = `<span class="${color}">${SUIT_SYMBOLS[suit]}</span> ${suit.charAt(0).toUpperCase() + suit.slice(1)}`;
            btn.onclick = () => {
                const result = game.declareTrump(suit, selectedDir);
                if (result.valid) {
                    UI.hidePanel('trump-panel');
                } else {
                    UI.setStatus(result.message);
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
        UI.setActiveSeat(currentIndex);
        UI.updateTrickNum(game.trickNumber);

        if (player.isHuman) {
            enableCardPlay();
        } else {
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
        UI.setStatus(`Your turn — play a card.`);
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
        setTimeout(() => {
            const result = game.resolveTrick();
            const tricks = game.teamTricks;
            UI.showTrickCounts(tricks.ns, tricks.ew);
            UI.setStatus(`Trick ${result.trickNumber} won by ${result.winnerLabel}! (N/S: ${tricks.ns} | E/W: ${tricks.ew})`);

            setTimeout(() => {
                UI.clearPlayArea();
                if (game.phase === 'playing') {
                    processPlayTurn();
                }
            }, 1200);
        }, 800);
    }

    // ─── Scoring ──────────────────────────────────────────

    function handleScoring(data) {
        UI.renderScores(game.scores);
        UI.hideTrumpInfo();
        UI.hideTrickCounts();
        UI.setActiveSeat(null);

        const msg = data.made
            ? `${data.bidTeam.toUpperCase()} made their bid of ${data.bidAmount}! (${data.bidTeamTricks} tricks)`
            : `${data.bidTeam.toUpperCase()} went SET on ${data.bidAmount}! (Only ${data.bidTeamTricks} tricks, needed ${data.needed})`;

        UI.setStatus(`${msg} — Score: N/S ${data.scores.ns} | E/W ${data.scores.ew}`);

        setTimeout(() => {
            game.nextHand();
        }, 3000);
    }

    // ─── Start the game ───────────────────────────────────

    game.startHand();
})();
