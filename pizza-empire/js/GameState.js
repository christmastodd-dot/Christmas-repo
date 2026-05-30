const GameState = {
  cash: 0, day: 1, month: 1, year: 1,
  restaurants: [], recipes: [], crimeContacts: [],
  heat: 0, crimeRep: 0, rivals: {},
  notifications: [], listeners: {},
  paused: false, tickTimer: null,

  reset() {
    this.cash = Data.STARTING_CASH;
    this.day = 1; this.month = 1; this.year = 1;
    this.restaurants = []; this.recipes = [];
    this.crimeContacts = []; this.heat = 0; this.crimeRep = 0;
    this.rivals = {}; this.notifications = []; this.listeners = {};
    this.paused = false;
    Data.RIVALS.forEach(r => { this.rivals[r.startNeighborhood] = r.id; });
    this.addNotification('Welcome to Pizza Empire. Make us proud... or else.', 'info');
  },

  on(event, id, cb) {
    if (!this.listeners[event]) this.listeners[event] = {};
    this.listeners[event][id] = cb;
  },
  off(event, id) {
    if (this.listeners[event]) delete this.listeners[event][id];
  },
  emit(event, data) {
    if (!this.listeners[event]) return;
    Object.values(this.listeners[event]).forEach(cb => { try { cb(data); } catch(e) {} });
  },

  startTick() {
    if (this.tickTimer) clearInterval(this.tickTimer);
    this.tickTimer = setInterval(() => { if (!this.paused) this.tick(); }, Data.TICK_MS);
  },
  stopTick() {
    if (this.tickTimer) { clearInterval(this.tickTimer); this.tickTimer = null; }
  },

  tick() {
    this.day++;
    if (this.day > Data.DAYS_PER_MONTH || !Data.DAYS_PER_MONTH) Data.DAYS_PER_MONTH = 30;
    if (this.day > 30) {
      this.day = 1; this.month++;
      if (this.month > 12) { this.month = 1; this.year++; }
      this._monthlyUpdate();
    }
    this._dailyUpdate();
    this.emit('tick', { day: this.day, month: this.month, year: this.year, cash: this.cash });
  },

  _dailyUpdate() {
    let totalRevenue = 0;
    this.restaurants.forEach((r, idx) => {
      const rev = this._calcRevenue(r);
      this.cash += rev;
      totalRevenue += rev;
      r.dailyRevenue = rev;
      r.totalRevenue = (r.totalRevenue || 0) + rev;
    });

    if (Math.random() < 0.04 && Object.keys(this.rivals).length < 6) this._rivalExpand();
    if (this.heat > 0 && Math.random() < 0.05) this.heat = Math.max(0, this.heat - 2);
    if (this.heat > 75 && Math.random() < 0.015) this._policeEvent();
    if (this.restaurants.length > 0 && Math.random() < 0.02) this._randomEvent();
  },

  _calcRevenue(restaurant) {
    const hood = Data.NEIGHBORHOODS.find(n => n.id === restaurant.neighborhoodId);
    if (!hood) return 0;
    const baseCustomers = { high: 90, medium: 55, low: 28 }[hood.volume] || 55;

    let mult = 1;
    const staffTypes = restaurant.staff.map(s => s.type);
    if (staffTypes.includes('cook'))    mult += 0.15;
    if (staffTypes.includes('waiter'))  mult += 0.20;
    if (staffTypes.includes('manager')) mult += 0.25;
    if (staffTypes.includes('cleaner')) mult += 0.08;

    const seatCap = restaurant.furniture
      .map(f => { const fd = Data.FURNITURE.find(d => d.id === f); return fd && fd.seats ? fd.seats : 0; })
      .reduce((a, b) => a + b, 0);
    if (seatCap === 0) return 0;

    const hasOven = restaurant.furniture.some(f => f === 'oven_basic' || f === 'oven_pro');
    if (!hasOven) return 0;

    if (restaurant.recipes.length === 0) return 0;

    const recipeId = restaurant.activeRecipe || restaurant.recipes[0];
    const recipe = this.recipes.find(r => r.id === recipeId);
    if (!recipe) return 0;

    const price = recipe.price || 14;
    const customers = Math.floor(Math.min(seatCap * 3, baseCustomers * mult) * (0.75 + Math.random() * 0.5));

    const isProtected = this.crimeContacts.find(c => c.id === 'don_caruso' && c.active);
    const rivalInHood = this.rivals[restaurant.neighborhoodId];
    const rivalPenalty = rivalInHood && !isProtected ? 0.80 : 1;

    return Math.floor(customers * price * rivalPenalty);
  },

  _monthlyUpdate() {
    let expenses = 0;
    this.restaurants.forEach(r => {
      const hood = Data.NEIGHBORHOODS.find(n => n.id === r.neighborhoodId);
      expenses += hood ? hood.rent : 0;
      r.staff.forEach(s => {
        const st = Data.STAFF_TYPES.find(t => t.id === s.type);
        if (st) expenses += st.wage;
      });
      r.monthlyRevenue = r.totalRevenue || 0;
      r.totalRevenue = 0;
    });

    this.crimeContacts.forEach(c => {
      if (!c.active) return;
      const def = Data.CRIME_CONTACTS.find(d => d.id === c.id);
      if (def && def.recurring && def.monthlyCost > 0) expenses += def.monthlyCost;
    });

    this.cash -= expenses;
    if (expenses > 0) {
      this.addNotification(`Monthly expenses: -$${expenses.toLocaleString()}`, 'expense');
    }
    if (this.cash < 0) {
      this.addNotification('WARNING: You are in debt! Get earning.', 'danger');
    }
    this.emit('month', {});
  },

  _rivalExpand() {
    const occupied = new Set([
      ...this.restaurants.map(r => r.neighborhoodId),
      ...Object.keys(this.rivals),
    ]);
    const free = Data.NEIGHBORHOODS.filter(n => !occupied.has(n.id));
    if (free.length === 0) return;
    const hood = free[Math.floor(Math.random() * free.length)];
    const rival = Data.RIVALS[Math.floor(Math.random() * Data.RIVALS.length)];
    this.rivals[hood.id] = rival.id;
    this.addNotification(`${rival.name} just opened in ${hood.name}!`, 'warning');
  },

  _policeEvent() {
    const fine = 3000 + Math.floor(Math.random() * 8000);
    this.cash -= fine;
    this.heat = Math.max(0, this.heat - 35);
    this.addNotification(`Police raid! Fined $${fine.toLocaleString()}. Stay quieter.`, 'danger');
  },

  _randomEvent() {
    const events = [
      { msg: 'Food critic visited! Customers +15% this week.', type: 'info' },
      { msg: 'Health inspection. Passed... barely.', type: 'warning' },
      { msg: 'Staff morale high. Great week!', type: 'info' },
      { msg: 'Ingredient prices spiked. Margins tighter.', type: 'warning' },
      { msg: 'Local news feature: "City\'s Best Hidden Gem?"', type: 'info' },
    ];
    const noInspections = this.crimeContacts.find(c => c.id === 'inspector_joe' && c.active);
    const pool = noInspections ? events.filter(e => !e.msg.includes('inspection')) : events;
    const e = pool[Math.floor(Math.random() * pool.length)];
    this.addNotification(e.msg, e.type);
  },

  addNotification(msg, type = 'info') {
    this.notifications.unshift({ msg, type, day: this.day, month: this.month });
    if (this.notifications.length > 30) this.notifications.pop();
    this.emit('notification', { msg, type });
  },

  buyRestaurant(neighborhoodId) {
    const hood = Data.NEIGHBORHOODS.find(n => n.id === neighborhoodId);
    if (!hood || this.cash < hood.cost) return false;
    if (this.restaurants.find(r => r.neighborhoodId === neighborhoodId)) return false;
    this.cash -= hood.cost;
    this.restaurants.push({
      neighborhoodId, furniture: [], staff: [], recipes: [],
      activeRecipe: null, dailyRevenue: 0, totalRevenue: 0,
    });
    this.addNotification(`Opened in ${hood.name}! Now furnish it and get cooking.`, 'success');
    return true;
  },

  getRestaurant(neighborhoodId) {
    return this.restaurants.find(r => r.neighborhoodId === neighborhoodId) || null;
  },

  addFurniture(restaurantIdx, furnitureId) {
    const item = Data.FURNITURE.find(f => f.id === furnitureId);
    if (!item || this.cash < item.cost) return false;
    this.cash -= item.cost;
    this.restaurants[restaurantIdx].furniture.push(furnitureId);
    return true;
  },

  hireStaff(restaurantIdx, staffTypeId) {
    const st = Data.STAFF_TYPES.find(s => s.id === staffTypeId);
    if (!st) return false;
    const r = this.restaurants[restaurantIdx];
    const alreadyHas = r.staff.filter(s => s.type === staffTypeId).length;
    if (alreadyHas >= 3) return false;
    r.staff.push({ type: staffTypeId });
    return true;
  },

  fireStaff(restaurantIdx, staffIdx) {
    this.restaurants[restaurantIdx].staff.splice(staffIdx, 1);
  },

  saveRecipe(recipe) {
    recipe.id = 'r_' + Date.now();
    this.recipes.push(recipe);
    this.addNotification(`New recipe "${recipe.name}" saved to the menu!`, 'success');
    return recipe;
  },

  assignRecipe(restaurantIdx, recipeId) {
    const r = this.restaurants[restaurantIdx];
    if (!r.recipes.includes(recipeId)) r.recipes.push(recipeId);
    if (!r.activeRecipe) r.activeRecipe = recipeId;
  },

  setActiveRecipe(restaurantIdx, recipeId) {
    this.restaurants[restaurantIdx].activeRecipe = recipeId;
  },

  activateCrimeContact(contactId, targetHoodId = null) {
    const def = Data.CRIME_CONTACTS.find(c => c.id === contactId);
    if (!def) return { ok: false, msg: 'Unknown contact.' };
    if (this.crimeRep < def.unlock) return { ok: false, msg: 'Not enough street cred.' };
    if (!def.recurring && this.cash < def.cost) return { ok: false, msg: 'Insufficient funds.' };
    if (def.recurring) {
      const already = this.crimeContacts.find(c => c.id === contactId && c.active);
      if (already) return { ok: false, msg: 'Already on the payroll.' };
    }

    if (!def.recurring) this.cash -= def.cost;

    const entry = { id: contactId, active: true, target: targetHoodId };
    const existing = this.crimeContacts.find(c => c.id === contactId);
    if (existing) { existing.active = true; existing.target = targetHoodId; }
    else this.crimeContacts.push(entry);

    this.heat = Math.min(100, this.heat + def.heatGain);
    this.crimeRep = Math.min(5, this.crimeRep + 0.4);

    if (def.effect === 'sabotage_rival' && targetHoodId) {
      delete this.rivals[targetHoodId];
      const hood = Data.NEIGHBORHOODS.find(n => n.id === targetHoodId);
      this.addNotification(`Tommy had a chat with the competition in ${hood ? hood.name : targetHoodId}...`, 'crime');
      this.heat = Math.min(100, this.heat + 15);
    }
    if (def.effect === 'launder_money') {
      const bonus = Math.floor(this.cash * 0.05);
      this.cash += bonus;
      this.addNotification(`Connie cleaned $${bonus.toLocaleString()} through the books.`, 'crime');
    }

    return { ok: true };
  },

  cutCrimeContact(contactId) {
    const c = this.crimeContacts.find(c => c.id === contactId);
    if (c) c.active = false;
  },

  calcRecipeCost(recipe) {
    const dough   = Data.INGREDIENTS.dough.find(d => d.id === recipe.dough);
    const sauce   = Data.INGREDIENTS.sauce.find(s => s.id === recipe.sauce);
    const tops    = (recipe.toppings || []).map(t => Data.INGREDIENTS.toppings.find(d => d.id === t)).filter(Boolean);
    return (dough ? dough.cost : 0) + (sauce ? sauce.cost : 0) + tops.reduce((a, t) => a + t.cost, 0);
  },

  rateRecipeForHood(recipe, hoodId) {
    const hood = Data.NEIGHBORHOODS.find(n => n.id === hoodId);
    if (!hood) return 3;
    let score = 3;
    const doughPref = hood.prefs[recipe.dough] || 0.1;
    score += (doughPref - 0.25) * 4;
    const favToppings = hood.toppingPrefs || [];
    const hits = (recipe.toppings || []).filter(t => favToppings.includes(t)).length;
    score += hits * 0.4;
    const cost = this.calcRecipeCost(recipe);
    if (hood.type === 'upscale' && cost > 12) score += 0.5;
    if (hood.type === 'worker' && cost < 6) score += 0.5;
    return Math.max(1, Math.min(5, score));
  },
};
