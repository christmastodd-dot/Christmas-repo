/**
 * Main — entry point. Initializes the game and kicks off the first hand.
 */

(function () {
    const game = new Game();

    // Make game globally accessible for debugging
    window.trumpsGame = game;

    // Start first hand
    game.startHand();

    // Render initial state
    UI.renderAllHands(game.players);
    UI.renderScores(game.scores);
    UI.setStatus(`Dealt! You have 12 cards. Dealer: ${game.players[game.dealer].label}`);

    console.log('Trumps game initialized.');
    console.log('Your hand:', game.players[0].hand.map(c => c.name).join(', '));
    console.log('Kitty:', game.kitty.map(c => c.name).join(', '));
})();
