class MenuScene extends Phaser.Scene {
  constructor() { super('MenuScene'); }

  create() {
    const W = Data.W, H = Data.H;
    this.add.rectangle(W/2, H/2, W, H, 0x0d0d0d);

    // Animated pizza
    const pizzaG = this.add.graphics();
    this._drawMenuPizza(pizzaG, W/2, H/2 - 30, 160);
    this.tweens.add({ targets: pizzaG, angle: 360, duration: 18000, repeat: -1 });

    // Title
    this.add.text(W/2, 80, 'PIZZA EMPIRE', {
      fontSize: '72px', fontFamily: 'Georgia, serif', color: '#e74c3c',
      stroke: '#000', strokeThickness: 6, shadow: { blur: 20, color: '#e74c3c', fill: true },
    }).setOrigin(0.5);

    this.add.text(W/2, 148, 'A PIZZA TYCOON', {
      fontSize: '22px', fontFamily: 'monospace', color: '#888', letterSpacing: 8,
    }).setOrigin(0.5);

    this.add.text(W/2, 175, '— Family business. By any means necessary. —', {
      fontSize: '15px', fontFamily: 'Georgia, serif', color: '#555',
    }).setOrigin(0.5);

    // Buttons
    this._makeBtn(W/2, H - 210, 'NEW GAME', '#e74c3c', () => {
      GameState.reset();
      GameState.startTick();
      this.scene.start('CityScene');
    });
    this._makeBtn(W/2, H - 145, 'HOW TO PLAY', '#2980b9', () => this._showHelp());

    this.add.text(W/2, H - 30, 'Pizza Empire v0.1  •  Inspired by Pizza Connection (1994)', {
      fontSize: '12px', color: '#333', fontFamily: 'monospace',
    }).setOrigin(0.5);

    // Floating notification teasers
    this._showTeaser();
  }

  _drawMenuPizza(g, cx, cy, r) {
    g.clear();
    g.fillStyle(0xe59866); g.fillCircle(cx, cy, r);
    g.fillStyle(0xe74c3c); g.fillCircle(cx, cy, r * 0.85);
    g.fillStyle(0xf5cba7); g.fillCircle(cx, cy, r * 0.78);
    const tops = [
      [0, -0.6], [0.5, -0.3], [-0.5, -0.3], [0.3, 0.5], [-0.3, 0.5],
      [0.7, 0.1], [-0.7, 0.1], [0, 0.7], [0.1, 0],
    ];
    tops.forEach(([dx, dy]) => {
      g.fillStyle(0xa93226);
      g.fillCircle(cx + dx * r * 0.7, cy + dy * r * 0.7, r * 0.1);
    });
    g.fillStyle(0xfdfefe, 0.6);
    [[0.2, -0.3], [-0.4, 0.1], [0.1, 0.5]].forEach(([dx, dy]) => {
      g.fillCircle(cx + dx * r * 0.7, cy + dy * r * 0.7, r * 0.08);
    });
    g.lineStyle(3, 0xd4ac0d, 0.8); g.strokeCircle(cx, cy, r);
  }

  _makeBtn(x, y, label, color, cb) {
    const hex = parseInt(color.replace('#',''), 16);
    const bg = this.add.rectangle(x, y, 260, 56, hex, 0.15)
      .setStrokeStyle(2, hex).setInteractive({ useHandCursor: true });
    const txt = this.add.text(x, y, label, {
      fontSize: '22px', fontFamily: 'monospace', color,
    }).setOrigin(0.5);
    bg.on('pointerover', () => { bg.setFillStyle(hex, 0.35); });
    bg.on('pointerout',  () => { bg.setFillStyle(hex, 0.15); });
    bg.on('pointerdown', cb);
    txt.setInteractive({ useHandCursor: true }).on('pointerdown', cb);
  }

  _showHelp() {
    const W = Data.W, H = Data.H;
    const panel = this.add.rectangle(W/2, H/2, 700, 500, 0x0d0d0d, 0.97)
      .setStrokeStyle(2, 0xe74c3c).setDepth(10);
    const lines = [
      'HOW TO PLAY',
      '',
      '1. BUY a restaurant location on the city map.',
      '2. FURNISH it — you need an oven and tables first.',
      '3. BUILD a pizza recipe in the Pizza Lab.',
      '4. ASSIGN the recipe to your restaurant.',
      '5. HIRE staff to improve service and quality.',
      '6. Watch the money roll in. Expand when ready.',
      '',
      'CRIME NETWORK:',
      '  • Bribe inspectors to avoid shutdowns.',
      '  • Hire muscle to sabotage rival locations.',
      '  • Launder profits through creative accounting.',
      '  • Build street cred to unlock bigger players.',
      '  • Watch your HEAT — too high and police raid you.',
      '',
      '[Click anywhere to close]',
    ];
    const txt = this.add.text(W/2, H/2, lines.join('\n'), {
      fontSize: '16px', fontFamily: 'monospace', color: '#ccc',
      align: 'left', lineSpacing: 6,
    }).setOrigin(0.5).setDepth(11);
    const close = () => { panel.destroy(); txt.destroy(); };
    panel.setInteractive().on('pointerdown', close);
    txt.setInteractive().on('pointerdown', close);
  }

  _showTeaser() {
    const teasers = [
      "\"Your deep dish is an insult to Italy.\" — Bella Roma",
      "Tommy sends his regards.",
      "Health inspection scheduled for Tuesday... unless.",
      "Don Caruso is watching your progress.",
      "Pizza King Corp. is eyeing your neighborhood.",
    ];
    let i = 0;
    const txt = this.add.text(Data.W/2, Data.H - 65, teasers[0], {
      fontSize: '13px', fontFamily: 'Georgia, serif', color: '#444',
    }).setOrigin(0.5);
    this.time.addEvent({
      delay: 3500, loop: true, callback: () => {
        i = (i + 1) % teasers.length;
        this.tweens.add({ targets: txt, alpha: 0, duration: 300, onComplete: () => {
          txt.setText(teasers[i]);
          this.tweens.add({ targets: txt, alpha: 1, duration: 300 });
        }});
      },
    });
  }
}
