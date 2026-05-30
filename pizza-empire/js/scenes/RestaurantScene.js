class RestaurantScene extends Phaser.Scene {
  constructor() { super('RestaurantScene'); }

  init(data) {
    this.restaurantIdx = data.restaurantIdx || 0;
    this.neighborhoodId = data.neighborhoodId;
  }

  create() {
    this.W = Data.W; this.H = Data.H;
    this.activeTab = 'furniture';
    this.hood = Data.NEIGHBORHOODS.find(n => n.id === this.neighborhoodId);
    this.restaurant = GameState.restaurants[this.restaurantIdx];

    this._buildBackground();
    this._buildHeader();
    this._buildFloorPlan();
    this._buildTabs();
    this._buildTabContent();
    this._buildStatusBar();
    this._subscribe();
    this._refreshAll();
  }

  _buildBackground() {
    this.add.rectangle(this.W/2, this.H/2, this.W, this.H, 0x0d0d15);
    // Restaurant floor area
    this.add.rectangle(300, this.H/2 + 30, 520, this.H - 160, 0x16161f).setStrokeStyle(1, 0x2a2a3a);
    // Tile pattern
    const tileG = this.add.graphics();
    tileG.lineStyle(1, 0x1e1e2e, 0.5);
    for (let x = 42; x < 556; x += 40) tileG.lineBetween(x, 80, x, this.H - 50);
    for (let y = 80; y < this.H - 50; y += 40) tileG.lineBetween(42, y, 556, y);
  }

  _buildHeader() {
    const hoodColor = this.hood ? this.hood.color : 0x888888;
    const hexColor = '#' + hoodColor.toString(16).padStart(6, '0');
    this.add.rectangle(this.W/2, 28, this.W, 56, 0x0a0a12).setStrokeStyle(1, 0x1a1a2a);

    const backBtn = this.add.text(28, 28, '← CITY MAP', {
      fontSize: '14px', fontFamily: 'monospace', color: '#555',
    }).setOrigin(0, 0.5).setInteractive({ useHandCursor: true });
    backBtn.on('pointerover', () => backBtn.setColor('#fff'));
    backBtn.on('pointerout',  () => backBtn.setColor('#555'));
    backBtn.on('pointerdown', () => {
      GameState.off('tick', 'restaurant');
      this.scene.start('CityScene');
    });

    const name = this.hood ? `${this.hood.name} Location` : 'Restaurant';
    this.add.text(this.W/2, 22, name, {
      fontSize: '20px', fontFamily: 'monospace', color: hexColor,
    }).setOrigin(0.5);
    if (this.hood) {
      this.add.text(this.W/2, 40, this.hood.demographics, {
        fontSize: '11px', fontFamily: 'monospace', color: '#555',
      }).setOrigin(0.5);
    }
  }

  _buildFloorPlan() {
    // Floor plan labels
    this.add.text(300, 70, 'FLOOR PLAN', {
      fontSize: '11px', color: '#333', fontFamily: 'monospace', letterSpacing: 4,
    }).setOrigin(0.5);

    this.floorItems = this.add.container(0, 0);
    this._refreshFloor();
  }

  _buildTabs() {
    const tabs = ['furniture', 'staff', 'recipes', 'stats'];
    const labels = ['FURNISH', 'STAFF', 'RECIPES', 'STATS'];
    this.tabBtns = {};
    tabs.forEach((tab, i) => {
      const x = 650 + i * 155;
      const btn = this.add.rectangle(x, 82, 145, 32, 0x111, 0)
        .setStrokeStyle(1, 0x333).setInteractive({ useHandCursor: true });
      const txt = this.add.text(x, 82, labels[i], {
        fontSize: '12px', fontFamily: 'monospace', color: '#444',
      }).setOrigin(0.5);
      btn.on('pointerdown', () => this._switchTab(tab));
      txt.setInteractive({ useHandCursor: true }).on('pointerdown', () => this._switchTab(tab));
      this.tabBtns[tab] = { btn, txt };
    });
    this._highlightTab('furniture');
  }

  _buildTabContent() {
    this.tabContainer = this.add.container(0, 0);
    this._switchTab('furniture');
  }

  _buildStatusBar() {
    this.add.rectangle(this.W/2, this.H - 25, this.W, 50, 0x0a0a10).setStrokeStyle(1, 0x1a1a2a);
    this.cashText = this.add.text(30, this.H - 25, '', {
      fontSize: '18px', fontFamily: 'monospace', color: '#44ff44',
    }).setOrigin(0, 0.5);
    this.revenueText = this.add.text(this.W/2, this.H - 25, '', {
      fontSize: '14px', fontFamily: 'monospace', color: '#888',
    }).setOrigin(0.5);
    this.ratingText = this.add.text(this.W - 30, this.H - 25, '', {
      fontSize: '16px', fontFamily: 'monospace', color: '#f39c12',
    }).setOrigin(1, 0.5);
  }

  _subscribe() {
    GameState.on('tick', 'restaurant', () => this._refreshStats());
  }

  shutdown() { GameState.off('tick', 'restaurant'); }

  _switchTab(tab) {
    this.activeTab = tab;
    this._highlightTab(tab);
    this.tabContainer.removeAll(true);

    const cx = 950, startY = 118;
    const methods = {
      furniture: () => this._renderFurnitureTab(cx, startY),
      staff:     () => this._renderStaffTab(cx, startY),
      recipes:   () => this._renderRecipesTab(cx, startY),
      stats:     () => this._renderStatsTab(cx, startY),
    };
    if (methods[tab]) methods[tab]();
  }

  _highlightTab(tab) {
    Object.entries(this.tabBtns).forEach(([t, { btn, txt }]) => {
      if (t === tab) {
        btn.setFillStyle(0x1a1a2e, 1).setStrokeStyle(1, 0x2980b9);
        txt.setColor('#2980b9');
      } else {
        btn.setFillStyle(0x111, 0).setStrokeStyle(1, 0x333);
        txt.setColor('#444');
      }
    });
  }

  _renderFurnitureTab(cx, startY) {
    this._addLabel(cx, startY, 'FURNISHINGS & EQUIPMENT', '#555');
    this._addLabel(cx, startY + 16, 'Click to purchase and install', '#333');

    const types = ['kitchen', 'seating', 'decor'];
    const typeLabels = { kitchen: 'KITCHEN', seating: 'SEATING', decor: 'DÉCOR' };
    let y = startY + 40;

    types.forEach(type => {
      const items = Data.FURNITURE.filter(f => f.type === type);
      const label = this._add(this.add.text(cx, y, typeLabels[type], {
        fontSize: '11px', fontFamily: 'monospace', color: '#444', letterSpacing: 3,
      }).setOrigin(0.5));
      y += 18;

      items.forEach(item => {
        const owned = this.restaurant.furniture.filter(f => f === item.id).length;
        const canAfford = GameState.cash >= item.cost;
        const color = canAfford ? '#aaa' : '#555';
        const row = this.add.container(0, 0);

        const bg = this.add.rectangle(cx, y, 340, 28, 0x0d0d1a, 0.8)
          .setStrokeStyle(1, 0x1a1a2e).setInteractive({ useHandCursor: true });
        const nameTxt = this.add.text(cx - 155, y, `${item.name}`, {
          fontSize: '13px', fontFamily: 'monospace', color,
        }).setOrigin(0, 0.5);
        const costTxt = this.add.text(cx + 30, y, `$${item.cost.toLocaleString()}`, {
          fontSize: '12px', fontFamily: 'monospace', color: canAfford ? '#44aa44' : '#553333',
        }).setOrigin(0, 0.5);
        const ownedTxt = this.add.text(cx + 130, y, `[${owned}]`, {
          fontSize: '12px', fontFamily: 'monospace', color: owned > 0 ? '#2980b9' : '#333',
        }).setOrigin(0, 0.5);

        bg.on('pointerover', () => bg.setFillStyle(0x111133, 0.9));
        bg.on('pointerout',  () => bg.setFillStyle(0x0d0d1a, 0.8));
        bg.on('pointerdown', () => {
          if (GameState.addFurniture(this.restaurantIdx, item.id)) {
            this._refreshAll();
            GameState.addNotification(`Installed ${item.name} in ${this.hood.name}.`, 'info');
          } else {
            GameState.addNotification('Not enough cash!', 'warning');
          }
        });

        this._add(bg); this._add(nameTxt); this._add(costTxt); this._add(ownedTxt);
        y += 32;
      });
      y += 8;
    });
  }

  _renderStaffTab(cx, startY) {
    this._addLabel(cx, startY, 'STAFF MANAGEMENT', '#555');
    this._addLabel(cx, startY + 16, 'Wages paid monthly', '#333');
    let y = startY + 50;

    Data.STAFF_TYPES.forEach(type => {
      const current = this.restaurant.staff.filter(s => s.type === type.id).length;
      const canHire = GameState.cash >= type.wage;

      const bg = this.add.rectangle(cx, y, 340, 68, 0x0d0d1a, 0.8)
        .setStrokeStyle(1, 0x1a1a2e);
      const nameTxt = this.add.text(cx - 155, y - 20, type.name, {
        fontSize: '16px', fontFamily: 'monospace', color: '#aaa',
      }).setOrigin(0, 0.5);
      const desc = this.add.text(cx - 155, y - 2, type.desc, {
        fontSize: '11px', fontFamily: 'monospace', color: '#555',
      }).setOrigin(0, 0.5);
      const wage = this.add.text(cx - 155, y + 16, `$${type.wage}/month`, {
        fontSize: '11px', fontFamily: 'monospace', color: '#886644',
      }).setOrigin(0, 0.5);
      const countTxt = this.add.text(cx + 70, y, `${current}/3`, {
        fontSize: '20px', fontFamily: 'monospace', color: current > 0 ? '#2980b9' : '#333',
      }).setOrigin(0.5);

      const hireBtn = this.add.rectangle(cx + 145, y - 12, 56, 22, 0x1a3a1a)
        .setStrokeStyle(1, 0x44ff44).setInteractive({ useHandCursor: true });
      const hireTxt = this.add.text(cx + 145, y - 12, 'HIRE', {
        fontSize: '11px', fontFamily: 'monospace', color: '#44ff44',
      }).setOrigin(0.5);
      const fireBtn = this.add.rectangle(cx + 145, y + 14, 56, 22, 0x2a0a0a)
        .setStrokeStyle(1, current > 0 ? 0xe74c3c : 0x333).setInteractive({ useHandCursor: true });
      const fireTxt = this.add.text(cx + 145, y + 14, 'FIRE', {
        fontSize: '11px', fontFamily: 'monospace', color: current > 0 ? '#e74c3c' : '#444',
      }).setOrigin(0.5);

      hireBtn.on('pointerdown', () => {
        if (GameState.hireStaff(this.restaurantIdx, type.id)) {
          this._switchTab('staff');
        } else {
          GameState.addNotification(`Can't hire another ${type.name} — max 3, or no funds.`, 'warning');
        }
      });
      fireBtn.on('pointerdown', () => {
        const idx = this.restaurant.staff.findIndex(s => s.type === type.id);
        if (idx >= 0) { GameState.fireStaff(this.restaurantIdx, idx); this._switchTab('staff'); }
      });

      [bg, nameTxt, desc, wage, countTxt, hireBtn, hireTxt, fireBtn, fireTxt].forEach(o => this._add(o));
      y += 82;
    });
  }

  _renderRecipesTab(cx, startY) {
    this._addLabel(cx, startY, 'MENU MANAGEMENT', '#555');
    let y = startY + 40;

    if (GameState.recipes.length === 0) {
      this._addLabel(cx, y + 20, 'No recipes created yet.', '#555');
      this._addLabel(cx, y + 40, 'Go to the Pizza Lab to create recipes.', '#444');
      const btn = this.add.rectangle(cx, y + 80, 200, 34, 0x1a0d1a)
        .setStrokeStyle(1, 0xe74c3c).setInteractive({ useHandCursor: true });
      const txt = this.add.text(cx, y + 80, '🍕 OPEN PIZZA LAB', {
        fontSize: '13px', fontFamily: 'monospace', color: '#e74c3c',
      }).setOrigin(0.5);
      btn.on('pointerdown', () => this.scene.start('PizzaScene'));
      txt.setInteractive({ useHandCursor: true }).on('pointerdown', () => this.scene.start('PizzaScene'));
      this._add(btn); this._add(txt);
      return;
    }

    GameState.recipes.forEach(recipe => {
      const onMenu = this.restaurant.recipes.includes(recipe.id);
      const isActive = this.restaurant.activeRecipe === recipe.id;
      const cost = GameState.calcRecipeCost(recipe);
      const rating = this.hood ? GameState.rateRecipeForHood(recipe, this.hood.id) : 3;
      const stars = '★'.repeat(Math.round(rating)) + '☆'.repeat(5 - Math.round(rating));

      const bg = this.add.rectangle(cx, y, 340, 72, onMenu ? 0x0a1a0a : 0x0d0d1a, 0.9)
        .setStrokeStyle(1, onMenu ? 0x44aa44 : 0x1a1a2e);
      const nameTxt = this.add.text(cx - 155, y - 24, recipe.name, {
        fontSize: '15px', fontFamily: 'monospace', color: onMenu ? '#44ff44' : '#888',
      }).setOrigin(0, 0.5);
      const ingredInfo = this.add.text(cx - 155, y - 7, `${recipe.dough} | ${recipe.sauce} | ${(recipe.toppings||[]).length} toppings`, {
        fontSize: '11px', fontFamily: 'monospace', color: '#555',
      }).setOrigin(0, 0.5);
      const ratingTxt = this.add.text(cx - 155, y + 10, stars, {
        fontSize: '13px', color: '#f39c12',
      }).setOrigin(0, 0.5);
      const priceTxt = this.add.text(cx - 155, y + 26, `Cost: $${cost.toFixed(2)}  Price: $${recipe.price || 14}`, {
        fontSize: '11px', fontFamily: 'monospace', color: '#886644',
      }).setOrigin(0, 0.5);

      const addBtn = this.add.rectangle(cx + 130, y - 12, 80, 22, onMenu ? 0x002200 : 0x1a3a1a)
        .setStrokeStyle(1, onMenu ? 0x226622 : 0x44ff44).setInteractive({ useHandCursor: true });
      const addTxt = this.add.text(cx + 130, y - 12, onMenu ? '✓ MENU' : '+ MENU', {
        fontSize: '11px', fontFamily: 'monospace', color: onMenu ? '#226622' : '#44ff44',
      }).setOrigin(0.5);
      const setBtn = this.add.rectangle(cx + 130, y + 14, 80, 22, isActive ? 0x1a1a3a : 0x111)
        .setStrokeStyle(1, isActive ? 0x2980b9 : 0x333).setInteractive({ useHandCursor: true });
      const setTxt = this.add.text(cx + 130, y + 14, isActive ? '★ ACTIVE' : 'SET ACTIVE', {
        fontSize: '10px', fontFamily: 'monospace', color: isActive ? '#2980b9' : '#555',
      }).setOrigin(0.5);

      addBtn.on('pointerdown', () => {
        GameState.assignRecipe(this.restaurantIdx, recipe.id);
        this._switchTab('recipes');
      });
      setBtn.on('pointerdown', () => {
        GameState.setActiveRecipe(this.restaurantIdx, recipe.id);
        this._switchTab('recipes');
      });

      [bg, nameTxt, ingredInfo, ratingTxt, priceTxt, addBtn, addTxt, setBtn, setTxt].forEach(o => this._add(o));
      y += 82;
    });
  }

  _renderStatsTab(cx, startY) {
    this._addLabel(cx, startY, 'RESTAURANT STATS', '#555');
    const r = this.restaurant;
    const hood = this.hood;
    const hasOven = r.furniture.some(f => f === 'oven_basic' || f === 'oven_pro');
    const seatCap = r.furniture.map(f => {
      const fd = Data.FURNITURE.find(d => d.id === f);
      return fd && fd.seats ? fd.seats : 0;
    }).reduce((a, b) => a + b, 0);
    const hasRecipe = r.recipes.length > 0;
    const isOpen = hasOven && seatCap > 0 && hasRecipe;

    const lines = [
      ['Status', isOpen ? '✓ OPEN' : '⚠ NOT OPERATIONAL'],
      ['Location', hood ? hood.name : '-'],
      ['Seating Capacity', seatCap > 0 ? `${seatCap} seats` : 'None (buy tables!)'],
      ['Has Oven', hasOven ? '✓ Yes' : '✗ No (buy one!)'],
      ['Staff Count', `${r.staff.length} employees`],
      ['Recipes on Menu', `${r.recipes.length}`],
      ['Active Recipe', r.activeRecipe ? GameState.recipes.find(rc => rc.id === r.activeRecipe)?.name || '-' : 'None'],
      ['Daily Revenue', r.dailyRevenue > 0 ? `$${r.dailyRevenue.toLocaleString()}` : '$0'],
      ['Monthly Revenue', r.monthlyRevenue > 0 ? `$${r.monthlyRevenue.toLocaleString()}` : 'Pending...'],
      ['Monthly Rent', hood ? `$${hood.rent.toLocaleString()}` : '-'],
      ['Customer Traffic', hood ? hood.volume.toUpperCase() : '-'],
    ];

    let y = startY + 45;
    lines.forEach(([key, val]) => {
      this._add(this.add.text(cx - 155, y, key, {
        fontSize: '13px', fontFamily: 'monospace', color: '#555',
      }).setOrigin(0, 0.5));
      const isPositive = val.startsWith('✓') || val.startsWith('$') && val !== '$0';
      const isNegative = val.startsWith('✗') || val === '$0' || val === 'None';
      const valColor = isPositive ? '#44ff44' : isNegative ? '#e74c3c' : '#aaa';
      this._add(this.add.text(cx + 165, y, val, {
        fontSize: '13px', fontFamily: 'monospace', color: valColor,
      }).setOrigin(1, 0.5));
      y += 34;
    });

    if (!isOpen) {
      this._add(this.add.text(cx, y + 10, '▲ Fix issues above to start earning ▲', {
        fontSize: '12px', fontFamily: 'monospace', color: '#f39c12', align: 'center',
      }).setOrigin(0.5));
    }
  }

  _refreshFloor() {
    this.floorItems.removeAll(true);
    const r = this.restaurant;
    const cx = 300, startY = 95;
    let x = 55, y = startY;
    const cols = 6;

    this.add.text(300, startY - 8, `${r.furniture.length} item(s) installed`, {
      fontSize: '11px', fontFamily: 'monospace', color: '#333',
    }).setOrigin(0.5);

    if (r.furniture.length === 0) {
      this.add.text(300, 300, 'Empty\nBuy furniture →', {
        fontSize: '16px', fontFamily: 'monospace', color: '#333', align: 'center', lineSpacing: 8,
      }).setOrigin(0.5);
      return;
    }

    const counts = {};
    r.furniture.forEach(f => { counts[f] = (counts[f] || 0) + 1; });

    let i = 0;
    Object.entries(counts).forEach(([fid, count]) => {
      const fd = Data.FURNITURE.find(d => d.id === fid);
      if (!fd) return;
      const cellX = 55 + (i % cols) * 85;
      const cellY = startY + 20 + Math.floor(i / cols) * 85;

      const icons = { seating: '🪑', kitchen: '🍳', decor: '🌿' };
      const icon = icons[fd.type] || '📦';
      this.add.text(cellX, cellY, icon, { fontSize: '28px' }).setOrigin(0.5);
      this.add.text(cellX, cellY + 24, fd.name.split(' ')[0], {
        fontSize: '9px', fontFamily: 'monospace', color: '#555',
      }).setOrigin(0.5);
      if (count > 1) {
        this.add.text(cellX + 20, cellY - 20, `x${count}`, {
          fontSize: '11px', fontFamily: 'monospace', color: '#2980b9',
        }).setOrigin(0.5);
      }
      i++;
    });
  }

  _refreshStats() {
    this.restaurant = GameState.restaurants[this.restaurantIdx];
    if (!this.restaurant) return;
    const cash = GameState.cash;
    this.cashText.setText(`$${cash.toLocaleString()}`);
    this.cashText.setColor(cash < 0 ? '#e74c3c' : '#44ff44');
    this.revenueText.setText(
      this.restaurant.dailyRevenue > 0
        ? `Revenue today: $${this.restaurant.dailyRevenue.toLocaleString()}`
        : 'Not yet operational'
    );
  }

  _refreshAll() {
    this.restaurant = GameState.restaurants[this.restaurantIdx];
    this._refreshFloor();
    this._refreshStats();
    if (this.activeTab) this._switchTab(this.activeTab);
  }

  _add(obj) { this.tabContainer.add(obj); return obj; }
  _addLabel(x, y, text, color) {
    return this._add(this.add.text(x, y, text, {
      fontSize: '12px', fontFamily: 'monospace', color,
    }).setOrigin(0.5));
  }
}
