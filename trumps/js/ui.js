/**
 * UI — renders game state to the DOM.
 */

const UI = {
    /** Update the status message in the header. */
    setStatus(msg) {
        document.getElementById('game-status').textContent = msg;
    },

    /** Render a player's hand into their seat container. */
    renderHand(player) {
        const container = document.getElementById(`hand-${player.position}`);
        container.innerHTML = '';

        player.hand.forEach((card, i) => {
            let el;
            if (player.isHuman) {
                el = card.toElement();
                el.style.animationDelay = `${i * 0.04}s`;
                el.classList.add('dealing');
            } else {
                el = Card.backElement();
                el.style.animationDelay = `${i * 0.04}s`;
                el.classList.add('dealing');
            }
            container.appendChild(el);
        });
    },

    /** Render all four hands. */
    renderAllHands(players) {
        players.forEach(p => UI.renderHand(p));
    },

    /** Update the scoreboard. */
    renderScores(scores) {
        document.getElementById('score-ns').textContent = scores.ns;
        document.getElementById('score-ew').textContent = scores.ew;
    },

    /** Clear the center play area. */
    clearPlayArea() {
        document.getElementById('played-cards').innerHTML = '';
    },

    /** Show a card played to the center. */
    showPlayedCard(player, card) {
        const area = document.getElementById('played-cards');
        const wrapper = document.createElement('div');
        wrapper.className = 'played-card-wrapper';

        const cardEl = card.toElement();
        cardEl.classList.add('playing');

        const tag = document.createElement('span');
        tag.className = 'player-tag';
        tag.textContent = player.label;

        wrapper.appendChild(cardEl);
        wrapper.appendChild(tag);
        area.appendChild(wrapper);
    },

    /** Show/hide a panel by id. */
    showPanel(id) {
        document.getElementById(id).classList.remove('hidden');
    },

    hidePanel(id) {
        document.getElementById(id).classList.add('hidden');
    },
};
