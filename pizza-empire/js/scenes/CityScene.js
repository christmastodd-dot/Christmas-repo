class CityScene extends Phaser.Scene {
  constructor() { super('CityScene'); }

  create() {
    this.W = Data.W; this.H = Data.H;
    this._buildUI();
    this._buildMap();
    this._buildHUD();
    this._buildNotifications();
    this._buildNavBar();
    this._subscribe();
    this._refresh();
  }

  _buildUI() {
    // Background
    this.add.rectangle(this.W/2, this.H/2, this.W, this.H, 0x111118);
    // City ground
    this.add.rectangle(this.W/2 - 80, this.H/2 + 30, this.W - 340, this.H - 100, 0x1a1a22);
    // Roads — horizontal
    [180, 310, 450, 580, 650].forEach(y => {
      this.add.rectangle(this.W/2 - 80, y, this.W - 340, 12, 0x1f1f2e);
    });
    // Roads — vertical
    [250, 420, 640, 870].forEach(x => {
      this.add.rectangle(x, this.H/2 + 10, 12, this.H - 100, 0x1f1f2e);
    });

    this.add.text(16, this.H - 22, 'PIZZA EMPIRE', {
      fontSize: '11px', color: '#333', fontFamily: 'monospace',
    });
  }

  _buildMap() {
    this.hoodObjects = {};
    Data.NEIGHBORHOODS.forEach(hood => {
      const grp = this.add.container(0, 0);
      const bg = this.add.rectangle(hood.x + hood.w/2, hood.y + hood.h/2, hood.w, hood.h, hood.color, 0.18)
        .setStrokeStyle(1, hood.color, 0.4).setInteractive({ useHandCursor: true });
      const label = this.add.text(hood.x + hood.w/2, hood.y + 14, hood.name, {
        fontSize: '13px', fontFamily: 'monospace', color: '#' + hood.color.toString(16).padStart(6,'0'),
        stroke: '#000', strokeThickness: 3,
      }).setOrigin(0.5, 0);
      const statusIcon = this.add.text(hood.x + hood.w/2, hood.y + hood.h/2, '', {
        fontSize: '28px',
      }).setOrigin(0.5);
      const revenueLabel = this.add.text(hood.x + hood.w/2, hood.y + hood.h - 18, '', {
        fontSize: '11px', fontFamily: 'monospace', color: '#44ff44',
        stroke: '#000', strokeThickness: 2,
      }).setOrigin(0.5);

      bg.on('pointerover', () => bg.setFillStyle(hood.color, 0.35));
      bg.on('pointerout',  () => bg.setFillStyle(hood.color, 0.18));
      bg.on('pointerdown', () => this._onHoodClick(hood.id));

      this.hoodObjects[hood.id] = { bg, label, statusIcon, revenueLabel };
    });
  }

  _buildHUD() {
    const panelX = this.W - 155;
    this.add.rectangle(panelX, this.H/2, 295, this.H, 0x0a0a12).setStrokeStyle(1, 0x222233);

    this.add.text(panelX, 18, 'FINANCES', {
      fontSize: '11px', color: '#444', fontFamily: 'monospace', letterSpacing: 4,
    }).setOrigin(0.5);

    this.cashText = this.add.text(panelX, 42, '$0', {
      fontSize: '26px', fontFamily: 'monospace', color: '#44ff44',
    }).setOrigin(0.5);

    this.dateText = this.add.text(panelX, 72, 'Day 1, Month 1', {
      fontSize: '13px', fontFamily: 'monospace', color: '#888',
    }).setOrigin(0.5);

    this.add.text(panelX, 100, 'HEAT', {
      fontSize: '11px', color: '#e74c3c', fontFamily: 'monospace', letterSpacing: 4,
    }).setOrigin(0.5);
    this.heatBg = this.add.rectangle(panelX, 118, 200, 14, 0x1a0a0a).setStrokeStyle(1, 0x333);
    this.heatBar = this.add.rectangle(panelX - 100, 118, 0, 12, 0xe74c3c).setOrigin(0, 0.5);
    this.heatLabel = this.add.text(panelX, 118, '0%', {
      fontSize: '10px', fontFamily: 'monospace', color: '#e74c3c',
    }).setOrigin(0.5);

    this.add.text(panelX, 138, 'STREET CRED', {
      fontSize: '11px', color: '#888', fontFamily: 'monospace', letterSpacing: 2,
    }).setOrigin(0.5);
    this.credStars = [];
    for (let i = 0; i < 5; i++) {
      this.credStars.push(this.add.text(panelX - 44 + i * 22, 155, '★', {
        fontSize: '18px', color: '#333',
      }).setOrigin(0.5));
    }

    this.add.text(panelX, 180, 'RESTAURANTS', {
      fontSize: '11px', color: '#444', fontFamily: 'monospace', letterSpacing: 2,
    }).setOrigin(0.5);
    this.restCountText = this.add.text(panelX, 198, '0', {
      fontSize: '32px', fontFamily: 'monospace', color: '#2980b9',
    }).setOrigin(0.5);
    this.recipesCountText = this.add.text(panelX, 228, '0 recipes on menu', {
      fontSize: '12px', fontFamily: 'monospace', color: '#555',
    }).setOrigin(0.5);
  }

  _buildNotifications() {
    const panelX = this.W - 155;
    this.add.text(panelX, 258, 'INTEL', {
      fontSize: '11px', color: '#444', fontFamily: 'monospace', letterSpacing: 4,
    }).setOrigin(0.5);
    this.add.rectangle(panelX, 258 + 12, 270, 1, 0x222).setOrigin(0.5);

    this.notifTexts = [];
    for (let i = 0; i < 12; i++) {
      this.notifTexts.push(this.add.text(panelX - 130, 278 + i * 42, '', {
        fontSize: '11px', fontFamily: 'monospace', color: '#666',
        wordWrap: { width: 260 }, lineSpacing: 2,
      }));
    }
  }

  _buildNavBar() {
    const btns = [
      { label: '🍕 Pizza Lab',     color: 0xe74c3c, action: () => this.scene.start('PizzaScene') },
      { label: '🏠 My Restaurants',color: 0x2980b9, action: () => this._showMyRestaurants() },
      { label: '🔪 Crime Network', color: 0x8e44ad, action: () => this.scene.start('CrimeScene') },
    ];
    btns.forEach((b, i) => {
      const y = this.H - 115 + i * 35;
      const panelX = this.W - 155;
      const bg = this.add.rectangle(panelX, y, 260, 30, b.color, 0.15)
        .setStrokeStyle(1, b.color, 0.6).setInteractive({ useHandCursor: true });
      const txt = this.add.text(panelX, y, b.label, {
        fontSize: '14px', fontFamily: 'monospace', color: '#' + b.color.toString(16).padStart(6,'0'),
      }).setOrigin(0.5);
      bg.on('pointerover', () => bg.setFillStyle(b.color, 0.3));
      bg.on('pointerout',  () => bg.setFillStyle(b.color, 0.15));
      bg.on('pointerdown', b.action);
      txt.setInteractive({ useHandCursor: true }).on('pointerdown', b.action);
    });
  }

  _subscribe() {
    GameState.on('tick', 'city', () => this._refresh());
    GameState.on('notification', 'city', () => this._refreshNotifs());
  }

  shutdown() {
    GameState.off('tick', 'city');
    GameState.off('notification', 'city');
  }

  _refresh() {
    const gs = GameState;
    this.cashText.setText('$' + gs.cash.toLocaleString());
    this.cashText.setColor(gs.cash < 0 ? '#e74c3c' : '#44ff44');
    this.dateText.setText(`Day ${gs.day}  •  Month ${gs.month}  •  Year ${gs.year}`);

    const heatW = Math.floor(gs.heat / 100 * 200);
    this.heatBar.setSize(heatW, 12);
    this.heatLabel.setText(gs.heat + '%');

    this.credStars.forEach((s, i) => {
      s.setColor(i < Math.floor(gs.crimeRep) ? '#f39c12' : '#333');
    });

    this.restCountText.setText(gs.restaurants.length.toString());
    const totalRecipes = new Set(gs.restaurants.flatMap(r => r.recipes)).size;
    this.recipesCountText.setText(`${totalRecipes} recipe${totalRecipes !== 1 ? 's' : ''} on menus`);

    this._refreshHoods();
    this._refreshNotifs();
  }

  _refreshHoods() {
    Data.NEIGHBORHOODS.forEach(hood => {
      const obj = this.hoodObjects[hood.id];
      if (!obj) return;
      const myRest = GameState.getRestaurant(hood.id);
      const rivalId = GameState.rivals[hood.id];

      if (myRest) {
        obj.bg.setFillStyle(hood.color, 0.4);
        obj.bg.setStrokeStyle(2, hood.color, 0.9);
        const hasOven = myRest.furniture.some(f => f === 'oven_basic' || f === 'oven_pro');
        const hasSeats = myRest.furniture.some(f => {
          const fd = Data.FURNITURE.find(d => d.id === f);
          return fd && fd.seats;
        });
        const hasRecipe = myRest.recipes.length > 0;
        if (hasOven && hasSeats && hasRecipe) {
          obj.statusIcon.setText('🍕');
          obj.revenueLabel.setText(myRest.dailyRevenue > 0 ? `+$${myRest.dailyRevenue.toLocaleString()}/day` : 'Opening...');
        } else {
          obj.statusIcon.setText('🏗️');
          const missing = [];
          if (!hasOven)   missing.push('oven');
          if (!hasSeats)  missing.push('tables');
          if (!hasRecipe) missing.push('recipe');
          obj.revenueLabel.setText('Needs: ' + missing.join(', '));
          obj.revenueLabel.setColor('#f39c12');
        }
      } else if (rivalId) {
        const rival = Data.RIVALS.find(r => r.id === rivalId);
        obj.bg.setFillStyle(0x330000, 0.4);
        obj.bg.setStrokeStyle(2, rival ? rival.color : 0xff0000, 0.7);
        obj.statusIcon.setText('⚔️');
        obj.revenueLabel.setText(rival ? rival.shortName : 'Rival');
        obj.revenueLabel.setColor('#e74c3c');
      } else {
        obj.bg.setFillStyle(hood.color, 0.18);
        obj.bg.setStrokeStyle(1, hood.color, 0.3);
        obj.statusIcon.setText('');
        const canAfford = GameState.cash >= hood.cost;
        obj.revenueLabel.setText(`Buy: $${hood.cost.toLocaleString()}`);
        obj.revenueLabel.setColor(canAfford ? '#888' : '#e74c3c');
      }
    });
  }

  _refreshNotifs() {
    const notes = GameState.notifications.slice(0, 12);
    const colors = {
      info: '#666', warning: '#c07000', danger: '#cc2200',
      success: '#007700', expense: '#664400', crime: '#8e44ad',
    };
    this.notifTexts.forEach((t, i) => {
      if (i < notes.length) {
        const n = notes[i];
        t.setText(`[M${n.month}D${n.day}] ${n.msg}`);
        t.setColor(colors[n.type] || '#555');
        t.setAlpha(1 - i * 0.07);
      } else {
        t.setText('');
      }
    });
  }

  _onHoodClick(hoodId) {
    const hood = Data.NEIGHBORHOODS.find(n => n.id === hoodId);
    const myRest = GameState.getRestaurant(hoodId);
    const rivalId = GameState.rivals[hoodId];

    if (myRest) {
      const idx = GameState.restaurants.indexOf(myRest);
      this.scene.start('RestaurantScene', { restaurantIdx: idx, neighborhoodId: hoodId });
      return;
    }

    if (rivalId) {
      this._showRivalInfo(rivalId, hood);
      return;
    }

    this._showBuyDialog(hood);
  }

  _showBuyDialog(hood) {
    this._clearDialog();
    const W = this.W, H = this.H;
    const cx = hood.x + hood.w/2;
    const cy = Math.min(hood.y + hood.h + 10, H - 230);

    const dlg = this.add.container(0, 0).setDepth(20);
    const bg = this.add.rectangle(cx, cy + 95, 310, 200, 0x0d0d1a, 0.97)
      .setStrokeStyle(2, hood.color);
    const title = this.add.text(cx, cy + 20, hood.name, {
      fontSize: '18px', fontFamily: 'monospace', color: '#' + hood.color.toString(16).padStart(6,'0'),
    }).setOrigin(0.5);
    const desc = this.add.text(cx, cy + 50, hood.demographics, {
      fontSize: '12px', fontFamily: 'monospace', color: '#888', wordWrap: { width: 280 }, align: 'center',
    }).setOrigin(0.5);
    const cost = this.add.text(cx, cy + 95, `Purchase: $${hood.cost.toLocaleString()}`, {
      fontSize: '15px', fontFamily: 'monospace',
      color: GameState.cash >= hood.cost ? '#44ff44' : '#e74c3c',
    }).setOrigin(0.5);
    const rent = this.add.text(cx, cy + 115, `Monthly Rent: $${hood.rent.toLocaleString()}`, {
      fontSize: '12px', fontFamily: 'monospace', color: '#666',
    }).setOrigin(0.5);

    const buyBtn = this.add.rectangle(cx - 65, cy + 152, 110, 32, 0x1a3a1a)
      .setStrokeStyle(1, 0x44ff44).setInteractive({ useHandCursor: true });
    const buyTxt = this.add.text(cx - 65, cy + 152, 'PURCHASE', {
      fontSize: '13px', fontFamily: 'monospace', color: '#44ff44',
    }).setOrigin(0.5);
    const cancelBtn = this.add.rectangle(cx + 65, cy + 152, 110, 32, 0x1a0a0a)
      .setStrokeStyle(1, 0x555).setInteractive({ useHandCursor: true });
    const cancelTxt = this.add.text(cx + 65, cy + 152, 'CANCEL', {
      fontSize: '13px', fontFamily: 'monospace', color: '#555',
    }).setOrigin(0.5);

    dlg.add([bg, title, desc, cost, rent, buyBtn, buyTxt, cancelBtn, cancelTxt]);
    this._currentDialog = dlg;

    buyBtn.on('pointerdown', () => {
      if (GameState.buyRestaurant(hood.id)) {
        this._clearDialog();
        this._refresh();
      } else {
        cost.setColor('#e74c3c');
        cost.setText('Not enough cash!');
      }
    });
    buyTxt.setInteractive({ useHandCursor: true }).on('pointerdown', () => buyBtn.emit('pointerdown'));
    cancelBtn.on('pointerdown', () => this._clearDialog());
    cancelTxt.setInteractive({ useHandCursor: true }).on('pointerdown', () => this._clearDialog());
  }

  _showRivalInfo(rivalId, hood) {
    this._clearDialog();
    const rival = Data.RIVALS.find(r => r.id === rivalId);
    if (!rival) return;
    const cx = hood.x + hood.w/2;
    const cy = Math.min(hood.y + hood.h + 10, this.H - 200);

    const dlg = this.add.container(0, 0).setDepth(20);
    const bg = this.add.rectangle(cx, cy + 80, 310, 175, 0x0d0d1a, 0.97)
      .setStrokeStyle(2, rival.color);
    const title = this.add.text(cx, cy + 15, rival.name, {
      fontSize: '16px', fontFamily: 'monospace', color: '#' + rival.color.toString(16).padStart(6,'0'),
    }).setOrigin(0.5);
    const desc = this.add.text(cx, cy + 48, rival.description, {
      fontSize: '12px', fontFamily: 'monospace', color: '#888', wordWrap: { width: 280 }, align: 'center',
    }).setOrigin(0.5);
    const taunt = this.add.text(cx, cy + 100, `"${rival.taunt}"`, {
      fontSize: '11px', fontFamily: 'Georgia, serif', color: '#555', wordWrap: { width: 280 }, align: 'center',
    }).setOrigin(0.5);
    const hint = this.add.text(cx, cy + 130, 'Hire Tommy Two-Fingers to remove them...', {
      fontSize: '11px', fontFamily: 'monospace', color: '#8e44ad',
    }).setOrigin(0.5);

    const closeBtn = this.add.rectangle(cx, cy + 158, 110, 28, 0x111)
      .setStrokeStyle(1, 0x444).setInteractive({ useHandCursor: true });
    const closeTxt = this.add.text(cx, cy + 158, 'CLOSE', {
      fontSize: '12px', fontFamily: 'monospace', color: '#555',
    }).setOrigin(0.5);

    dlg.add([bg, title, desc, taunt, hint, closeBtn, closeTxt]);
    this._currentDialog = dlg;
    closeBtn.on('pointerdown', () => this._clearDialog());
    closeTxt.setInteractive({ useHandCursor: true }).on('pointerdown', () => this._clearDialog());
  }

  _showMyRestaurants() {
    if (GameState.restaurants.length === 0) {
      GameState.addNotification('You have no restaurants yet. Buy a location on the map.', 'info');
      return;
    }
    GameState.restaurants.forEach((r, i) => {
      const hood = Data.NEIGHBORHOODS.find(n => n.id === r.neighborhoodId);
      if (hood) this.scene.start('RestaurantScene', { restaurantIdx: i, neighborhoodId: hood.id });
    });
  }

  _clearDialog() {
    if (this._currentDialog) { this._currentDialog.destroy(); this._currentDialog = null; }
  }
}
