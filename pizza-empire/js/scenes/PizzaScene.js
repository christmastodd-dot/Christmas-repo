class PizzaScene extends Phaser.Scene {
  constructor() { super('PizzaScene'); }

  create() {
    this.W = Data.W; this.H = Data.H;
    this.recipe = { dough: null, sauce: null, toppings: [], name: '', price: 14 };
    this.pizzaG = null;

    this._buildBackground();
    this._buildHeader();
    this._buildPizzaCanvas();
    this._buildIngredientPanels();
    this._buildRecipePanel();
    this._buildSavedRecipes();
    this._drawPizza();
  }

  _buildBackground() {
    this.add.rectangle(this.W/2, this.H/2, this.W, this.H, 0x0d0d15);
    this.add.rectangle(260, this.H/2, 490, this.H, 0x111118).setStrokeStyle(1, 0x1a1a2a);
  }

  _buildHeader() {
    this.add.rectangle(this.W/2, 28, this.W, 56, 0x0a0a12).setStrokeStyle(1, 0x1a1a2a);

    const back = this.add.text(28, 28, '← CITY MAP', {
      fontSize: '14px', fontFamily: 'monospace', color: '#555',
    }).setOrigin(0, 0.5).setInteractive({ useHandCursor: true });
    back.on('pointerover', () => back.setColor('#fff'));
    back.on('pointerout',  () => back.setColor('#555'));
    back.on('pointerdown', () => this.scene.start('CityScene'));

    this.add.text(this.W/2, 28, '🍕 PIZZA LAB', {
      fontSize: '22px', fontFamily: 'monospace', color: '#e74c3c',
    }).setOrigin(0.5);
    this.add.text(this.W/2, 44, 'Craft your signature recipes', {
      fontSize: '11px', fontFamily: 'monospace', color: '#444',
    }).setOrigin(0.5);
  }

  _buildPizzaCanvas() {
    this.add.text(130, 72, 'RECIPE PREVIEW', {
      fontSize: '11px', fontFamily: 'monospace', color: '#444', letterSpacing: 3,
    }).setOrigin(0.5);
    this.pizzaG = this.add.graphics();
    this._drawPizza();

    // Price control
    this.add.text(50, this.H - 100, 'SALE PRICE', {
      fontSize: '11px', fontFamily: 'monospace', color: '#444', letterSpacing: 2,
    });
    const minusBtn = this.add.text(50, this.H - 75, '[ - ]', {
      fontSize: '16px', fontFamily: 'monospace', color: '#888',
    }).setInteractive({ useHandCursor: true });
    this.priceTxt = this.add.text(130, this.H - 75, '$14', {
      fontSize: '22px', fontFamily: 'monospace', color: '#44ff44',
    }).setOrigin(0.5);
    const plusBtn = this.add.text(185, this.H - 75, '[ + ]', {
      fontSize: '16px', fontFamily: 'monospace', color: '#888',
    }).setInteractive({ useHandCursor: true });
    minusBtn.on('pointerdown', () => { this.recipe.price = Math.max(8, (this.recipe.price||14) - 1); this._updateStats(); });
    plusBtn.on('pointerdown',  () => { this.recipe.price = Math.min(45, (this.recipe.price||14) + 1); this._updateStats(); });
  }

  _buildIngredientPanels() {
    // Dough panel
    this._buildSelector(270, 65, 'DOUGH', Data.INGREDIENTS.dough, 'dough', d => d.name, d => d.cost);
    // Sauce panel
    this._buildSelector(270, 240, 'SAUCE', Data.INGREDIENTS.sauce, 'sauce', s => s.name, s => s.cost);
    // Toppings panel
    this._buildToppings(270, 400);
  }

  _buildSelector(x, y, label, items, field, getName, getCost) {
    this.add.text(x, y, label, {
      fontSize: '11px', fontFamily: 'monospace', color: '#555', letterSpacing: 3,
    });
    this[`${field}Btns`] = {};
    items.forEach((item, i) => {
      const bx = x + (i % 2) * 185;
      const by = y + 18 + Math.floor(i / 2) * 36;
      const isSelected = this.recipe[field] === item.id;

      const bg = this.add.rectangle(bx + 80, by + 13, 168, 30, isSelected ? 0x1a1a3a : 0x0d0d1a, 0.9)
        .setStrokeStyle(1, isSelected ? 0x2980b9 : 0x222).setInteractive({ useHandCursor: true });
      const txt = this.add.text(bx + 4, by + 13, getName(item), {
        fontSize: '13px', fontFamily: 'monospace', color: isSelected ? '#2980b9' : '#777',
      }).setOrigin(0, 0.5);
      const cost = this.add.text(bx + 165, by + 13, `$${getCost(item).toFixed(1)}`, {
        fontSize: '11px', fontFamily: 'monospace', color: '#555',
      }).setOrigin(1, 0.5);

      const select = () => {
        this.recipe[field] = item.id;
        this[`_refresh${field.charAt(0).toUpperCase()+field.slice(1)}Btns`]();
        this._drawPizza(); this._updateStats();
      };
      bg.on('pointerdown', select);
      txt.setInteractive({ useHandCursor: true }).on('pointerdown', select);
      this[`${field}Btns`][item.id] = { bg, txt };
    });
  }

  _refreshDoughBtns() {
    Object.entries(this.doughBtns).forEach(([id, {bg, txt}]) => {
      const sel = this.recipe.dough === id;
      bg.setFillStyle(sel ? 0x1a1a3a : 0x0d0d1a, 0.9).setStrokeStyle(1, sel ? 0x2980b9 : 0x222);
      txt.setColor(sel ? '#2980b9' : '#777');
    });
  }
  _refreshSauceBtns() {
    Object.entries(this.sauceBtns).forEach(([id, {bg, txt}]) => {
      const sel = this.recipe.sauce === id;
      bg.setFillStyle(sel ? 0x1a1a3a : 0x0d0d1a, 0.9).setStrokeStyle(1, sel ? 0x2980b9 : 0x222);
      txt.setColor(sel ? '#2980b9' : '#777');
    });
  }

  _buildToppings(x, y) {
    this.add.text(x, y, 'TOPPINGS', {
      fontSize: '11px', fontFamily: 'monospace', color: '#555', letterSpacing: 3,
    });
    this.toppingBtns = {};
    const cols = 3;
    Data.INGREDIENTS.toppings.forEach((top, i) => {
      const bx = x + (i % cols) * 125;
      const by = y + 18 + Math.floor(i / cols) * 30;
      const isSelected = this.recipe.toppings.includes(top.id);

      const catColors = { cheese: 0xf39c12, meat: 0xe74c3c, seafood: 0x2980b9, veggie: 0x27ae60, premium: 0x8e44ad };
      const catColor = catColors[top.category] || 0x888;
      const bg = this.add.rectangle(bx + 55, by + 12, 114, 26, isSelected ? catColor : 0x0d0d1a, isSelected ? 0.3 : 0.8)
        .setStrokeStyle(1, isSelected ? catColor : 0x222).setInteractive({ useHandCursor: true });
      const txt = this.add.text(bx + 3, by + 12, top.name, {
        fontSize: '11px', fontFamily: 'monospace', color: isSelected ? '#' + catColor.toString(16).padStart(6,'0') : '#666',
      }).setOrigin(0, 0.5);

      const toggle = () => {
        const idx = this.recipe.toppings.indexOf(top.id);
        if (idx >= 0) this.recipe.toppings.splice(idx, 1);
        else if (this.recipe.toppings.length < 6) this.recipe.toppings.push(top.id);
        else { GameState.addNotification('Max 6 toppings per recipe.', 'warning'); return; }
        this._refreshToppingBtns();
        this._drawPizza(); this._updateStats();
      };
      bg.on('pointerdown', toggle);
      txt.setInteractive({ useHandCursor: true }).on('pointerdown', toggle);
      this.toppingBtns[top.id] = { bg, txt, catColor };
    });
  }

  _refreshToppingBtns() {
    Object.entries(this.toppingBtns).forEach(([id, {bg, txt, catColor}]) => {
      const sel = this.recipe.toppings.includes(id);
      bg.setFillStyle(sel ? catColor : 0x0d0d1a, sel ? 0.3 : 0.8).setStrokeStyle(1, sel ? catColor : 0x222);
      txt.setColor(sel ? '#' + catColor.toString(16).padStart(6,'0') : '#666');
    });
  }

  _buildRecipePanel() {
    const rx = 900;
    this.add.rectangle(rx, this.H/2, 265, this.H, 0x0a0a12).setStrokeStyle(1, 0x1a1a2a);
    this.add.text(rx, 72, 'RECIPE STATS', {
      fontSize: '11px', fontFamily: 'monospace', color: '#444', letterSpacing: 3,
    }).setOrigin(0.5);

    this.costLabel    = this.add.text(rx, 105, 'Ingredient cost: $0.00', { fontSize: '14px', fontFamily: 'monospace', color: '#886644' }).setOrigin(0.5);
    this.marginLabel  = this.add.text(rx, 125, 'Margin: —', { fontSize: '13px', fontFamily: 'monospace', color: '#444' }).setOrigin(0.5);
    this.add.text(rx, 155, 'Neighborhood Ratings:', { fontSize: '11px', fontFamily: 'monospace', color: '#444' }).setOrigin(0.5);
    this.hoodRatings = {};
    Data.NEIGHBORHOODS.forEach((hood, i) => {
      const y = 172 + i * 34;
      this.add.text(rx - 120, y, hood.name, { fontSize: '11px', fontFamily: 'monospace', color: '#555' }).setOrigin(0, 0.5);
      this.hoodRatings[hood.id] = this.add.text(rx + 120, y, '-----', {
        fontSize: '13px', fontFamily: 'monospace', color: '#333',
      }).setOrigin(1, 0.5);
    });

    // Save button
    const saveBtn = this.add.rectangle(rx, this.H - 90, 220, 42, 0x1a0d0d)
      .setStrokeStyle(2, 0xe74c3c).setInteractive({ useHandCursor: true });
    const saveTxt = this.add.text(rx, this.H - 90, '💾 SAVE RECIPE', {
      fontSize: '16px', fontFamily: 'monospace', color: '#e74c3c',
    }).setOrigin(0.5);
    saveBtn.on('pointerover', () => saveBtn.setFillStyle(0x2a1010));
    saveBtn.on('pointerout',  () => saveBtn.setFillStyle(0x1a0d0d));
    saveBtn.on('pointerdown', () => this._saveRecipe());
    saveTxt.setInteractive({ useHandCursor: true }).on('pointerdown', () => this._saveRecipe());

    this._updateStats();
  }

  _buildSavedRecipes() {
    // Show a mini list on the left panel bottom
  }

  _drawPizza() {
    if (!this.pizzaG) return;
    const g = this.pizzaG;
    g.clear();
    const cx = 130, cy = 310, r = 140;

    const dough = Data.INGREDIENTS.dough.find(d => d.id === this.recipe.dough);
    const sauce = Data.INGREDIENTS.sauce.find(s => s.id === this.recipe.sauce);

    g.fillStyle(this.recipe.dough ? (dough ? dough.color : 0xf5cba7) : 0x333);
    g.fillCircle(cx, cy, r);

    if (this.recipe.sauce) {
      g.fillStyle(sauce ? sauce.color : 0xe74c3c);
      g.fillCircle(cx, cy, r * 0.82);
    }

    if (this.recipe.dough) {
      g.fillStyle(dough ? dough.color : 0xf5cba7, 0.4);
      g.fillCircle(cx, cy, r * 0.9);
      g.lineStyle(3, 0xd4ac0d, 0.6);
      g.strokeCircle(cx, cy, r);
      g.strokeCircle(cx, cy, r * 0.9);
    }

    // Toppings as colored circles
    const positions = [
      [0,-0.55],[0.4,-0.35],[-0.4,-0.35],[0.55,0.1],[-0.55,0.1],
      [0.25,0.5],[-0.25,0.5],[0,0.1],[0.35,0.2],[-0.35,0.2],
      [0.5,-0.5],[-0.5,-0.5],[0.15,-0.2],[-0.15,-0.2],
    ];
    this.recipe.toppings.forEach((topId, i) => {
      const top = Data.INGREDIENTS.toppings.find(t => t.id === topId);
      if (!top) return;
      const pos = positions[i % positions.length];
      const tx = cx + pos[0] * r * 0.75;
      const ty = cy + pos[1] * r * 0.75;
      g.fillStyle(top.color);
      g.fillCircle(tx, ty, 14);
      g.lineStyle(1, 0x000, 0.3);
      g.strokeCircle(tx, ty, 14);
    });

    // Crust texture dots
    if (this.recipe.dough) {
      for (let a = 0; a < Math.PI * 2; a += Math.PI / 8) {
        g.fillStyle(0xd4ac0d, 0.4);
        g.fillCircle(cx + Math.cos(a) * r * 0.95, cy + Math.sin(a) * r * 0.95, 3);
      }
    }

    // Labels
    if (!this.recipe.dough && !this.recipe.sauce) {
      this.add.text(cx, cy, 'Select\ningredients\n→', {
        fontSize: '14px', fontFamily: 'monospace', color: '#444', align: 'center', lineSpacing: 4,
      }).setOrigin(0.5).setDepth(1);
    }
  }

  _updateStats() {
    const cost = GameState.calcRecipeCost(this.recipe);
    this.costLabel.setText(`Ingredient cost: $${cost.toFixed(2)}`);
    const margin = (this.recipe.price || 14) - cost;
    this.marginLabel.setText(`Margin: $${margin.toFixed(2)}/pizza`);
    this.marginLabel.setColor(margin > 0 ? '#44aa44' : '#e74c3c');
    this.priceTxt.setText(`$${this.recipe.price || 14}`);

    Data.NEIGHBORHOODS.forEach(hood => {
      const rating = GameState.rateRecipeForHood(this.recipe, hood.id);
      const stars = '★'.repeat(Math.round(rating)) + '☆'.repeat(5 - Math.round(rating));
      this.hoodRatings[hood.id].setText(stars);
      const c = rating >= 4 ? '#f39c12' : rating >= 3 ? '#888' : '#555';
      this.hoodRatings[hood.id].setColor(c);
    });
  }

  _saveRecipe() {
    if (!this.recipe.dough) { GameState.addNotification('Choose a dough type first!', 'warning'); return; }
    if (!this.recipe.sauce) { GameState.addNotification('Choose a sauce first!', 'warning'); return; }
    if (this.recipe.toppings.length === 0) { GameState.addNotification('Add at least one topping!', 'warning'); return; }
    this._promptName();
  }

  _promptName() {
    const overlay = document.getElementById('name-input-overlay');
    const input   = document.getElementById('recipe-name-input');
    const confirm = document.getElementById('name-confirm-btn');
    const cancel  = document.getElementById('name-cancel-btn');

    input.value = this.recipe.name || '';
    overlay.style.display = 'block';
    input.focus();

    const doSave = () => {
      const name = input.value.trim();
      if (!name) { input.style.borderColor = '#e74c3c'; return; }
      overlay.style.display = 'none';
      this.recipe.name = name;
      GameState.saveRecipe({ ...this.recipe });
      this.recipe = { dough: null, sauce: null, toppings: [], name: '', price: 14 };
      this._refreshDoughBtns();
      this._refreshSauceBtns();
      this._refreshToppingBtns();
      this._drawPizza();
      this._updateStats();
    };

    confirm.onclick = doSave;
    cancel.onclick = () => { overlay.style.display = 'none'; };
    input.onkeydown = e => { if (e.key === 'Enter') doSave(); };
  }
}
