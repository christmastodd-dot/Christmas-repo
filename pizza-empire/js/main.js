const config = {
  type: Phaser.AUTO,
  width: Data.W,
  height: Data.H,
  backgroundColor: '#0d0d0d',
  parent: 'game-container',
  scene: [MenuScene, CityScene, RestaurantScene, PizzaScene, CrimeScene],
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  render: {
    antialias: true,
    pixelArt: false,
  },
};

new Phaser.Game(config);
