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
                UI.clearScoreboardBid();
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

            case 'kitty': {
                const winnerLabel = game.players[data.bidWinner].label;
                const bidDir = data.bid.direction || '';
                UI.clearPlayArea();
                UI.showBidWinner(winnerLabel, data.bid.amount, bidDir);
                UI.setStatus(`${winnerLabel} won the bid at ${data.bid.amount} ${bidDir}.`);
                // Show announcement for 2 seconds, then proceed to kitty
                setTimeout(() => {
                    handleKittyPhase();
                }, 2000);
                break;
            }

            case 'trumpSelect':
                handleTrumpSelection();
                break;

            case 'playing':
                UI.clearPlayArea();
                UI.showTrumpInfo(data.trumpSuit, data.direction, game.trickNumber);
                UI.showTrickCounts(0, 0, game);
                UI.showScoreboardBid(`Bid: ${game.currentBid.amount} ${data.direction} ${SUIT_SYMBOLS[data.trumpSuit]}`);
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
        console.log(`Pack ${result.trickNumber} won by ${result.winnerLabel}`);
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

        let selectedAmount = null;
        let selectedDirection = 'low'; // Default to low since it's superior

        // Create confirm button early so it can be referenced by updatePreview
        const bidConfirmBtn = document.createElement('button');
        bidConfirmBtn.className = 'btn btn-primary bid-confirm-btn';
        bidConfirmBtn.textContent = 'Bid';
        bidConfirmBtn.disabled = true;

        // Current bid info
        if (game.currentBid) {
            const info = document.createElement('div');
            info.className = 'bid-info';
            info.innerHTML = `Current bid: <strong>${game.currentBid.amount} ${game.currentBid.direction}</strong> by ${game.players[game.currentBid.playerIndex].label}`;
            controls.appendChild(info);

            // Explain low superiority
            const hint = document.createElement('div');
            hint.className = 'bid-info bid-hint';
            hint.innerHTML = '<em>Low outranks High at the same number</em>';
            controls.appendChild(hint);
        }

        // Direction toggle
        const dirRow = document.createElement('div');
        dirRow.className = 'bid-info';

        const dirLabel = document.createElement('span');
        dirLabel.innerHTML = '<strong>Direction: </strong>';
        dirRow.appendChild(dirLabel);

        const highBtn = document.createElement('button');
        highBtn.className = 'btn btn-secondary';
        highBtn.textContent = 'High';

        const lowBtn = document.createElement('button');
        lowBtn.className = 'btn btn-secondary selected';
        lowBtn.textContent = 'Low';

        // Helper: compute min bid for a given direction
        function getMinBid(direction) {
            if (!game.currentBid) return 3;
            if (direction === 'low' && game.currentBid.direction === 'high') {
                return game.currentBid.amount;
            }
            return game.currentBid.amount + 1;
        }

        // Preview label showing current selection
        const previewRow = document.createElement('div');
        previewRow.className = 'bid-preview';
        previewRow.textContent = '';

        function updatePreview() {
            if (selectedAmount !== null) {
                previewRow.textContent = `${selectedAmount} ${selectedDirection}`;
                bidConfirmBtn.disabled = false;
            } else {
                previewRow.textContent = '';
                bidConfirmBtn.disabled = true;
            }
        }

        function rebuildAmountButtons() {
            amtRow.innerHTML = '';
            const minBid = getMinBid(selectedDirection);

            // If selected amount is no longer valid for new direction, clear it
            if (selectedAmount !== null && selectedAmount < minBid) {
                selectedAmount = null;
            }

            if (minBid <= 7) {
                const amtLabel = document.createElement('span');
                amtLabel.innerHTML = '<strong>Bid: </strong>';
                amtRow.appendChild(amtLabel);

                for (let n = minBid; n <= 7; n++) {
                    const btn = document.createElement('button');
                    btn.className = 'btn btn-secondary' + (n === selectedAmount ? ' selected' : '');
                    btn.textContent = n;
                    btn.onclick = () => {
                        selectedAmount = n;
                        // Highlight only this one
                        amtRow.querySelectorAll('.btn').forEach(b => b.classList.remove('selected'));
                        btn.classList.add('selected');
                        updatePreview();
                    };
                    amtRow.appendChild(btn);
                }
            } else {
                amtRow.innerHTML = '<em>Cannot outbid — pass or the bid stands.</em>';
            }

            updatePreview();
        }

        highBtn.onclick = () => {
            selectedDirection = 'high';
            highBtn.classList.add('selected');
            lowBtn.classList.remove('selected');
            rebuildAmountButtons();
        };

        lowBtn.onclick = () => {
            selectedDirection = 'low';
            lowBtn.classList.add('selected');
            highBtn.classList.remove('selected');
            rebuildAmountButtons();
        };

        dirRow.appendChild(highBtn);
        dirRow.appendChild(lowBtn);
        controls.appendChild(dirRow);

        // Bid amount buttons (rebuilt dynamically when direction changes)
        const amtRow = document.createElement('div');
        amtRow.className = 'bid-info';
        controls.appendChild(amtRow);
        rebuildAmountButtons();

        // Preview
        controls.appendChild(previewRow);

        // Action buttons row
        const actionRow = document.createElement('div');
        actionRow.className = 'bid-actions';

        bidConfirmBtn.onclick = () => {
            if (selectedAmount === null) return;
            UI.hidePanel('bid-panel');
            const bid = { amount: selectedAmount, direction: selectedDirection };
            const result = game.placeBid(0, bid);
            if (result.valid) {
                UI.addBidEntry('You', `${selectedAmount} ${selectedDirection}`, false);
                UI.setStatus(result.message);
                if (!result.biddingComplete) {
                    setTimeout(() => processBiddingTurn(), 700);
                }
            }
        };
        actionRow.appendChild(bidConfirmBtn);

        // Pass button (hidden if first bidder must bid)
        const isFirstBidder = game.biddingPosition === 0;

        if (!isFirstBidder) {
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
            actionRow.appendChild(passBtn);
        } else {
            const mustBidRow = document.createElement('div');
            mustBidRow.className = 'bid-info bid-hint';
            mustBidRow.innerHTML = '<em>First bidder must bid — you cannot pass.</em>';
            controls.appendChild(mustBidRow);
        }

        controls.appendChild(actionRow);
        UI.showPanel('bid-panel');
    }

    // ─── Kitty Phase ──────────────────────────────────────

    // Track kitty card IDs so we can highlight them after merging
    let kittyCardIds = [];

    function handleKittyPhase() {
        const winner = game.players[game.bidWinner];

        if (winner.isHuman) {
            // Step 1: Show kitty cards face-up in a reveal panel
            kittyCardIds = game.kitty.map(c => c.id);
            showKittyReveal(winner);
        } else {
            UI.setStatus(`${winner.label} is looking at the kitty...`);
            game.pickUpKitty();
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

    /** Step 1: Show the 4 kitty cards face-up — player selects which to take. */
    function showKittyReveal(player) {
        const cardsEl = document.getElementById('kitty-reveal-cards');
        cardsEl.innerHTML = '';

        const selectedKitty = new Set();

        // Render kitty cards face-up and selectable
        game.kitty.forEach(card => {
            const el = card.toElement();
            el.classList.add('kitty-selectable', 'kitty-selected');
            selectedKitty.add(card.id); // All selected by default

            el.onclick = () => {
                if (selectedKitty.has(card.id)) {
                    selectedKitty.delete(card.id);
                    el.classList.remove('kitty-selected');
                } else {
                    selectedKitty.add(card.id);
                    el.classList.add('kitty-selected');
                }
                updateKittyInfo();
            };
            cardsEl.appendChild(el);
        });

        const infoEl = document.getElementById('kitty-reveal-info');

        function updateKittyInfo() {
            const count = selectedKitty.size;
            if (count === 4) {
                infoEl.textContent = 'Taking all 4 cards — you will discard 4.';
            } else if (count === 0) {
                infoEl.textContent = 'Taking no cards — nothing to discard.';
            } else {
                infoEl.textContent = `Taking ${count} card${count !== 1 ? 's' : ''} — you will discard ${count}.`;
            }
        }
        updateKittyInfo();

        const btn = document.getElementById('kitty-reveal-btn');
        btn.textContent = 'Confirm Selection';
        btn.onclick = () => {
            UI.hidePanel('kitty-reveal-panel');
            const selectedCards = game.kitty.filter(c => selectedKitty.has(c.id));
            kittyCardIds = selectedCards.map(c => c.id);
            game.pickUpSelectedKitty(selectedCards);

            if (selectedCards.length === 0) {
                // Nothing taken — skip discard, go to trump
                player.sortHand();
                if (game.direction && game.trumpSuit) {
                    game._startPlaying();
                } else {
                    game.phase = 'trumpSelect';
                    game._emit('onPhaseChange', 'trumpSelect', { bidWinner: game.bidWinner });
                }
            } else {
                showDiscardPanel(player, selectedCards.length);
            }
        };

        UI.showPanel('kitty-reveal-panel');
    }

    /** Step 2: Player discards N cards (equal to number taken from kitty). */
    function showDiscardPanel(player, numToDiscard) {
        const controls = document.getElementById('kitty-controls');
        controls.innerHTML = '';

        const counter = document.createElement('div');
        counter.className = 'discard-counter';
        counter.textContent = `Select ${numToDiscard} card${numToDiscard !== 1 ? 's' : ''} to discard (0/${numToDiscard})`;
        controls.appendChild(counter);

        const confirmBtn = document.createElement('button');
        confirmBtn.className = 'btn btn-primary';
        confirmBtn.textContent = 'Confirm Discards';
        confirmBtn.disabled = true;
        confirmBtn.onclick = () => {
            const discards = player.hand.filter(c => selected.has(c.id));
            const result = game.discardFromKitty(discards);
            if (result.valid) {
                UI.hidePanel('kitty-panel');
                kittyCardIds = [];
                discardTray.remove();
                document.getElementById('hand-south').classList.remove('discard-mode');
                UI.renderHand(player);
            } else {
                counter.textContent = result.message;
            }
        };
        controls.appendChild(confirmBtn);

        const selected = new Set();

        // Create discard tray above the hand
        const seatSouth = document.querySelector('.seat-south');
        let discardTray = seatSouth.querySelector('.discard-tray');
        if (discardTray) discardTray.remove();
        discardTray = document.createElement('div');
        discardTray.className = 'discard-tray';
        seatSouth.insertBefore(discardTray, seatSouth.querySelector('.hand'));

        // Render the hand
        renderHandForDiscard(player, selected, numToDiscard, discardTray, confirmBtn, counter);

        UI.showPanel('kitty-panel');
    }

    /** Rebuild the hand and discard tray to reflect current selection. */
    function renderHandForDiscard(player, selected, numToDiscard, discardTray, confirmBtn, counter) {
        const container = document.getElementById('hand-south');
        container.innerHTML = '';
        container.classList.add('discard-mode');
        discardTray.innerHTML = '';

        // Render discard tray cards
        if (selected.size > 0) {
            player.hand.filter(c => selected.has(c.id)).forEach(card => {
                const el = card.toElement();
                el.classList.add('discard-tray-card');
                el.onclick = () => {
                    selected.delete(card.id);
                    renderHandForDiscard(player, selected, numToDiscard, discardTray, confirmBtn, counter);
                };
                discardTray.appendChild(el);
            });
        }

        // Render remaining hand cards
        player.hand.filter(c => !selected.has(c.id)).forEach((card, i) => {
            const el = card.toElement();
            el.style.zIndex = i;
            el.classList.add('discard-candidate');
            if (kittyCardIds.includes(card.id)) {
                el.classList.add('kitty-new');
            }
            el.onclick = () => {
                if (selected.size < numToDiscard) {
                    selected.add(card.id);
                    renderHandForDiscard(player, selected, numToDiscard, discardTray, confirmBtn, counter);
                }
            };
            container.appendChild(el);
        });

        confirmBtn.disabled = selected.size !== numToDiscard;
        if (selected.size === numToDiscard) {
            counter.textContent = 'Ready! Click Confirm to discard.';
        } else {
            counter.textContent = `Select ${numToDiscard} card${numToDiscard !== 1 ? 's' : ''} to discard (${selected.size}/${numToDiscard})`;
        }
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

        // Show bid context
        const infoEl = document.getElementById('trump-info');
        if (game.direction) {
            infoEl.textContent = `Your bid: ${game.currentBid.amount} ${game.direction}. Choose your trump suit.`;
        } else {
            infoEl.textContent = `Your bid: ${game.currentBid.amount}. Choose direction and trump suit.`;
        }

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

        // Suit buttons in a 2x2 grid
        const suitGrid = document.createElement('div');
        suitGrid.className = 'trump-suit-grid';

        for (const suit of SUITS) {
            const btn = document.createElement('button');
            btn.className = 'btn btn-suit';
            const color = SUIT_COLORS[suit];
            btn.innerHTML = `<span class="suit-icon ${color}">${SUIT_SYMBOLS[suit]}</span>${suit.charAt(0).toUpperCase() + suit.slice(1)}`;
            btn.onclick = () => {
                const result = game.declareTrump(suit, selectedDir);
                if (result.valid) {
                    UI.hidePanel('trump-panel');
                } else {
                    UI.setStatus(result.message);
                }
            };
            suitGrid.appendChild(btn);
        }
        controls.appendChild(suitGrid);

        UI.showPanel('trump-panel');
    }

    // ─── Trick Play ───────────────────────────────────────

    function processPlayTurn() {
        if (game.phase !== 'playing') return;

        const currentIndex = game._currentTurnPlayer();
        const player = game.players[currentIndex];
        UI.setActiveSeat(currentIndex);
        UI.updateTrickNum(game.trickNumber);

        // Show lead suit watermark if a card has been led
        if (game.currentTrick.length > 0) {
            UI.showLeadSuit(game.currentTrick[0].card.suit);
        }

        if (player.isHuman) {
            enableCardPlay();
        } else {
            setTimeout(() => {
                const card = AI.chooseCard(player, game.currentTrick, game);
                if (card) {
                    const isLead = game.currentTrick.length === 0;
                    const result = game.playCard(player.index, card);
                    if (result.valid) {
                        UI.showPlayedCard(player, card, isLead);
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
        const human = game.players[0];

        // Show lead suit info in status
        if (game.currentTrick.length > 0) {
            const leadSuit = game.currentTrick[0].card.suit;
            const hasSuit = human.hasSuit(leadSuit);
            if (hasSuit) {
                UI.setStatus(`Your turn — must follow ${leadSuit} ${SUIT_SYMBOLS[leadSuit]}`);
            } else {
                UI.setStatus(`Your turn — no ${leadSuit}, play any card.`);
            }
        } else {
            UI.setStatus('Your turn — lead any card.');
        }

        // Mark legal/illegal cards
        UI.markLegalPlays(human, game);

        const handEl = document.getElementById('hand-south');
        handEl.querySelectorAll('.card').forEach(cardEl => {
            cardEl.onclick = () => {
                // Block clicks on illegal cards
                if (cardEl.classList.contains('illegal-play')) {
                    UI.setStatus(`Must follow suit (${game.currentTrick[0].card.suit} ${SUIT_SYMBOLS[game.currentTrick[0].card.suit]})`);
                    return;
                }

                const cardId = cardEl.dataset.cardId;
                const card = human.hand.find(c => c.id === cardId);
                if (!card) return;

                const isLead = game.currentTrick.length === 0;
                const result = game.playCard(0, card);
                if (result.valid) {
                    UI.clearLegalPlays();
                    UI.showPlayedCard(human, card, isLead);
                    UI.renderHand(human);
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
        UI.clearLegalPlays();
        const handEl = document.getElementById('hand-south');
        handEl.querySelectorAll('.card').forEach(cardEl => {
            cardEl.onclick = null;
        });
    }

    function handleTrickEnd() {
        // Short pause to show all 4 cards
        setTimeout(() => {
            const result = game.resolveTrick();
            const tricks = game.teamTricks;

            // Highlight the winning card
            UI.highlightTrickWinner(result.winnerIndex);
            UI.hideLeadSuit();
            UI.showTrickCounts(tricks.ns, tricks.ew, game);
            UI.setStatus(`Pack ${result.trickNumber} won by ${result.winnerLabel}! (N/S: ${tricks.ns} | E/W: ${tricks.ew})`);

            // Pause to show winner highlight, then clear and continue
            setTimeout(() => {
                UI.clearPlayArea();
                if (game.phase === 'playing') {
                    processPlayTurn();
                }
            }, 1400);
        }, 600);
    }

    // ─── Scoring ──────────────────────────────────────────

    function handleScoring(data) {
        UI.renderScores(game.scores);
        UI.hideTrumpInfo();
        UI.hideTrickCounts();
        UI.clearScoreboardBid();
        UI.setActiveSeat(null);

        // Show hand result overlay
        showHandResult(data);
    }

    function showHandResult(data) {
        const titleEl = document.getElementById('hand-result-title');
        const bodyEl = document.getElementById('hand-result-body');
        const btn = document.getElementById('hand-result-btn');

        const bidTeamLabel = data.bidTeam === 'ns' ? 'N/S (You)' : 'E/W';
        const defTeamLabel = data.defTeam === 'ns' ? 'N/S (You)' : 'E/W';

        if (data.made) {
            let celebration = '';
            if (data.bidTeamTricks === 12) {
                celebration = '<div class="result-bolos">BOLOS!</div>';
            } else if (data.bidTeamTricks === 11) {
                celebration = '<div class="result-bolos side-bolos">SIDE BOLOS!</div>';
            }
            titleEl.textContent = 'Bid Made!';
            bodyEl.innerHTML = `
                ${celebration}
                <div class="result-made">${bidTeamLabel} made ${data.bidAmount}!</div>
                <div class="result-detail">${data.bidTeamTricks} packs taken (needed ${data.needed})</div>
            `;
        } else {
            let celebration = '';
            if (data.reverseBolos) {
                celebration = '<div class="result-bolos reverse-bolos">REVERSE BOLOS!</div>';
            }
            titleEl.textContent = 'Set!';
            bodyEl.innerHTML = `
                ${celebration}
                <div class="result-set">${bidTeamLabel} went set on ${data.bidAmount}!</div>
                <div class="result-detail">${data.earlyVictory ? 'Clinched early!' : `Only ${data.bidTeamTricks} packs`} (needed ${data.needed}) — ${defTeamLabel} gets the win</div>
            `;
        }

        const nsWinning = data.scores.ns >= data.scores.ew;
        const ewWinning = data.scores.ew >= data.scores.ns;
        bodyEl.innerHTML += `
            <div class="result-scores">
                <div class="team">
                    <span class="team-label">N/S (You)</span>
                    <span class="team-val ${nsWinning ? 'winning' : ''}">${data.scores.ns}</span>
                </div>
                <div class="team">
                    <span class="team-label">E/W</span>
                    <span class="team-val ${ewWinning && !nsWinning ? 'winning' : ''}">${data.scores.ew}</span>
                </div>
            </div>
            <div class="result-detail">First to ${game.winTarget} wins the game</div>
        `;

        if (data.gameOver) {
            btn.textContent = 'See Results';
            btn.onclick = () => {
                UI.hidePanel('hand-result-panel');
                showGameOver(data);
            };
        } else {
            btn.textContent = 'Next Hand';
            btn.onclick = () => {
                UI.hidePanel('hand-result-panel');
                game.nextHand();
            };
        }

        UI.setStatus(data.made
            ? `${bidTeamLabel} made their bid!`
            : `${bidTeamLabel} went SET!`);

        UI.showPanel('hand-result-panel');
    }

    // ─── Game Over ────────────────────────────────────────

    function showGameOver(data) {
        const titleEl = document.getElementById('game-over-title');
        const bodyEl = document.getElementById('game-over-body');
        const btn = document.getElementById('game-over-btn');

        const youWon = data.winner === 'ns';

        titleEl.textContent = youWon ? 'You Win!' : 'Game Over';

        bodyEl.innerHTML = `
            <div class="${youWon ? 'game-over-win' : 'game-over-lose'}">
                ${youWon ? 'Congratulations! Your team wins!' : 'E/W takes the game.'}
            </div>
            <div class="final-score">
                <div class="fs-team">
                    <div class="fs-label">N/S (You)</div>
                    <div class="fs-val" style="color: ${youWon ? '#4ecb71' : 'var(--text-light)'}">${data.scores.ns}</div>
                </div>
                <div class="fs-team">
                    <div class="fs-label">E/W</div>
                    <div class="fs-val" style="color: ${!youWon ? '#4ecb71' : 'var(--text-light)'}">${data.scores.ew}</div>
                </div>
            </div>
            <div class="result-detail">Hands played: ${game.handsPlayed}</div>
        `;

        btn.onclick = () => {
            UI.hidePanel('game-over-panel');
            game.newGame();
        };

        UI.showPanel('game-over-panel');
    }

    // ─── Help ─────────────────────────────────────────────

    document.getElementById('help-btn').onclick = () => {
        UI.showPanel('help-panel');
    };

    document.getElementById('help-close-btn').onclick = () => {
        UI.hidePanel('help-panel');
    };

    // ─── Green Bottles (Drunk Mode) ──────────────────────

    let drinkCount = 0;
    const drinkBtn = document.getElementById('drink-btn');

    // Add a counter badge next to the bottle
    const drinkCounter = document.createElement('span');
    drinkCounter.className = 'drink-count';
    drinkCounter.textContent = '';
    drinkBtn.appendChild(drinkCounter);

    function updateDrunkLevel() {
        const container = document.getElementById('game-container');
        if (drinkCount === 0) {
            container.classList.remove('drunk');
            drinkBtn.classList.remove('active');
            drinkBtn.title = 'Drink Green Bottles';
            drinkCounter.textContent = '';
        } else {
            container.classList.add('drunk');
            container.style.setProperty('--drunk', drinkCount);
            drinkBtn.classList.add('active');
            drinkBtn.title = drinkCount >= 10 ? 'Max bottles! Double-click to sober up' : `${drinkCount}/10 bottles — click for more`;
            drinkCounter.textContent = drinkCount;
        }
    }

    drinkBtn.onclick = () => {
        if (drinkCount < 10) {
            drinkCount++;
            updateDrunkLevel();
        }
    };

    drinkBtn.ondblclick = () => {
        drinkCount = 0;
        updateDrunkLevel();
    };

    // ─── Start the game ───────────────────────────────────

    game.startHand();
})();
