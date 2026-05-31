const S = {
  cash: 0, day: 1, month: 1, year: 1,
  restaurants: [],  // { hoodId, equipment[], staff[], recipes[], activeRecipe, dailyRev, totalRev }
  recipes: [],      // { id, name, dough, sauce, toppings[], price }
  contracts: [],    // { id, active }
  heat: 0,
  crimeRep: 0,
  rivals: {},       // { hoodId: rivalId }
  log: [],          // { msg, type, day, month }
  _listeners: [],

  init() {
    this.cash = D.START_CASH;
    this.day = 1; this.month = 1; this.year = 1;
    this.restaurants = []; this.recipes = [];
    this.contracts = []; this.heat = 0; this.crimeRep = 0;
    this.rivals = {}; this.log = [];
    D.RIVALS.forEach(r => { this.rivals[r.start] = r.id; });
    this._addLog('Welcome to Pizza Empire. Make your mark — by any means necessary.', 'info');
  },

  on(cb) { this._listeners.push(cb); },
  _emit() { this._listeners.forEach(cb => cb()); },

  tick() {
    this.day++;
    if (this.day > D.DAYS_IN_MONTH) { this.day = 1; this.month++; this._monthEnd(); }
    if (this.month > 12) { this.month = 1; this.year++; }
    this._dailyTick();
    this._emit();
  },

  _dailyTick() {
    let earned = 0;
    this.restaurants.forEach(r => {
      const rev = this._calcRev(r);
      r.dailyRev = rev;
      r.totalRev = (r.totalRev || 0) + rev;
      this.cash += rev;
      earned += rev;
    });

    // Heat decay
    const hasCleaners = this.restaurants.some(r => r.staff.includes('cleaner'));
    const decay = hasCleaners ? 3 : 1;
    if (this.heat > 0) this.heat = Math.max(0, this.heat - decay);

    // Police event
    if (this.heat > 75 && Math.random() < 0.018) this._policeRaid();

    // Random events
    if (this.restaurants.length > 0 && Math.random() < 0.025) this._randomEvent();

    // Rival expansion
    if (Math.random() < 0.04) this._rivalExpand();

    // Launder bonus
    const isLaundering = this.contracts.find(c => c.id === 'connie' && c.active);
    if (isLaundering && earned > 0) {
      const bonus = Math.floor(earned * 0.05);
      this.cash += bonus;
    }
  },

  _calcRev(r) {
    const hood = D.HOODS.find(h => h.id === r.hoodId);
    if (!hood) return 0;

    const hasOven  = r.equipment.some(e => e === 'oven_basic' || e === 'oven_pro');
    const seats    = r.equipment.reduce((n, e) => {
      const eq = D.EQUIPMENT.find(d => d.id === e);
      return n + (eq && eq.seats ? eq.seats : 0);
    }, 0);
    const hasRecipe = r.activeRecipe && this.recipes.find(rc => rc.id === r.activeRecipe);
    if (!hasOven || seats === 0 || !hasRecipe) return 0;

    const baseCustomers = { 3: 85, 2: 50, 1: 25 }[hood.vol] || 50;
    let mult = 1;
    if (r.staff.includes('cook'))    mult += 0.15;
    if (r.staff.includes('waiter'))  mult += 0.25;
    if (r.staff.includes('manager')) mult += 0.30;

    const recipe = this.recipes.find(rc => rc.id === r.activeRecipe);
    const price  = recipe ? (recipe.price || 14) : 14;

    const customers = Math.floor(
      Math.min(seats * 3.5, baseCustomers * mult) * (0.7 + Math.random() * 0.6)
    );

    const isProtected  = this.contracts.find(c => c.id === 'don' && c.active);
    const rivalInHood  = this.rivals[r.hoodId];
    const rivalPenalty = (rivalInHood && !isProtected) ? 0.78 : 1;

    return Math.floor(customers * price * rivalPenalty);
  },

  _monthEnd() {
    let expenses = 0;
    this.restaurants.forEach(r => {
      const hood = D.HOODS.find(h => h.id === r.hoodId);
      if (hood) expenses += hood.rent;
      const staffTypes = [...new Set(r.staff)];
      staffTypes.forEach(sid => {
        const st = D.STAFF.find(s => s.id === sid);
        const count = r.staff.filter(s => s === sid).length;
        if (st) expenses += st.wage * count;
      });
    });

    // Crime recurring costs
    this.contracts.forEach(c => {
      if (!c.active) return;
      const def = D.CRIME.find(d => d.id === c.id);
      if (def && def.recurring && def.monthly > 0) expenses += def.monthly;
    });

    if (expenses > 0) {
      this.cash -= expenses;
      this._addLog(`Monthly outgoings: -$${expenses.toLocaleString()} (rent + wages + contracts)`, 'expense');
    }
    if (this.cash < 0) {
      this._addLog('⚠️ You\'re in the red. Earn more or cut costs.', 'danger');
    }
  },

  _policeRaid() {
    const fine = 4000 + Math.floor(Math.random() * 9000);
    this.cash -= fine;
    this.heat  = Math.max(0, this.heat - 40);
    this._addLog(`Police raid! Fined $${fine.toLocaleString()}. Keep a lower profile.`, 'danger');
  },

  _randomEvent() {
    const noInspection = this.contracts.find(c => c.id === 'inspector' && c.active);
    const pool = [
      { msg: 'Food critic visited one of your locations. Buzz on social media!', type: 'success' },
      { msg: 'Staff morale is high. Great week of service.', type: 'info' },
      { msg: 'Ingredient prices spiked this week. Margins squeezed.', type: 'warning' },
      { msg: 'Local paper ran a feature: "Hidden Gem or Hidden Menace?"', type: 'info' },
      !noInspection && { msg: 'Surprise health inspection. You passed... barely. Get a cleaner.', type: 'warning' },
    ].filter(Boolean);
    const e = pool[Math.floor(Math.random() * pool.length)];
    this._addLog(e.msg, e.type);
  },

  _rivalExpand() {
    const taken = new Set([
      ...this.restaurants.map(r => r.hoodId),
      ...Object.keys(this.rivals),
    ]);
    const free = D.HOODS.filter(h => !taken.has(h.id));
    if (free.length === 0) return;
    const hood = free[Math.floor(Math.random() * free.length)];
    const rival = D.RIVALS[Math.floor(Math.random() * D.RIVALS.length)];
    this.rivals[hood.id] = rival.id;
    this._addLog(`${rival.name} just opened in ${hood.name}. Competition heats up.`, 'warning');
  },

  _addLog(msg, type = 'info') {
    this.log.unshift({ msg, type, day: this.day, month: this.month });
    if (this.log.length > 40) this.log.pop();
  },

  // ── ACTIONS ──────────────────────────────────────────

  buyRestaurant(hoodId) {
    const hood = D.HOODS.find(h => h.id === hoodId);
    if (!hood || this.cash < hood.cost) return false;
    if (this.restaurants.find(r => r.hoodId === hoodId)) return false;
    this.cash -= hood.cost;
    this.restaurants.push({ hoodId, equipment: [], staff: [], recipes: [], activeRecipe: null, dailyRev: 0, totalRev: 0 });
    this._addLog(`Opened in ${hood.name}. Furnish it and get cooking.`, 'success');
    this._emit();
    return true;
  },

  getRestaurant(hoodId) {
    return this.restaurants.find(r => r.hoodId === hoodId) || null;
  },

  getRestIdx(hoodId) {
    return this.restaurants.findIndex(r => r.hoodId === hoodId);
  },

  buyEquipment(restIdx, eqId) {
    const eq = D.EQUIPMENT.find(e => e.id === eqId);
    if (!eq || this.cash < eq.cost) return false;
    this.cash -= eq.cost;
    this.restaurants[restIdx].equipment.push(eqId);
    this._emit();
    return true;
  },

  hireStaff(restIdx, staffId) {
    const st = D.STAFF.find(s => s.id === staffId);
    if (!st) return false;
    const r = this.restaurants[restIdx];
    const count = r.staff.filter(s => s === staffId).length;
    if (count >= st.max) return false;
    r.staff.push(staffId);
    this._emit();
    return true;
  },

  fireStaff(restIdx, staffId) {
    const r = this.restaurants[restIdx];
    const i = r.staff.lastIndexOf(staffId);
    if (i >= 0) { r.staff.splice(i, 1); this._emit(); }
  },

  saveRecipe(recipe) {
    recipe.id = 'r' + Date.now();
    this.recipes.push(recipe);
    this._addLog(`Recipe "${recipe.name}" saved to the lab.`, 'success');
    this._emit();
    return recipe;
  },

  assignRecipe(restIdx, recipeId) {
    const r = this.restaurants[restIdx];
    if (!r.recipes.includes(recipeId)) r.recipes.push(recipeId);
    if (!r.activeRecipe) r.activeRecipe = recipeId;
    this._emit();
  },

  setActiveRecipe(restIdx, recipeId) {
    this.restaurants[restIdx].activeRecipe = recipeId;
    this._emit();
  },

  calcRecipeCost(recipe) {
    const d = D.DOUGH.find(x => x.id === recipe.dough);
    const s = D.SAUCE.find(x => x.id === recipe.sauce);
    const tops = (recipe.toppings || []).map(t => D.TOPPINGS.find(x => x.id === t)).filter(Boolean);
    return (d ? d.cost : 0) + (s ? s.cost : 0) + tops.reduce((a, t) => a + t.cost, 0);
  },

  rateRecipe(recipe, hoodId) {
    const hood = D.HOODS.find(h => h.id === hoodId);
    if (!hood || !recipe.dough) return 0;
    let score = 2.5;
    if (hood.favDough.includes(recipe.dough)) score += 0.8;
    const favHits = (recipe.toppings || []).filter(t => hood.favTops.includes(t)).length;
    score += favHits * 0.5;
    const cost = this.calcRecipeCost(recipe);
    if (hood.type === 'Upscale' && cost > 10) score += 0.5;
    if (hood.type === 'Worker'  && cost < 7)  score += 0.5;
    return Math.max(1, Math.min(5, score));
  },

  engageCrime(contactId, targetHoodId = null) {
    const def = D.CRIME.find(c => c.id === contactId);
    if (!def) return { ok: false, msg: 'Unknown contact.' };
    if (this.crimeRep < def.unlock) return { ok: false, msg: `Requires ${def.unlock}★ street cred.` };
    const already = this.contracts.find(c => c.id === contactId && c.active);
    if (already) return { ok: false, msg: 'Already active.' };
    if (!def.recurring && this.cash < def.cost) return { ok: false, msg: 'Insufficient funds.' };
    if (!def.recurring) this.cash -= def.cost;

    const entry = this.contracts.find(c => c.id === contactId);
    if (entry) entry.active = true;
    else this.contracts.push({ id: contactId, active: true });

    this.heat = Math.min(100, this.heat + def.heatGain);
    this.crimeRep = Math.min(5, this.crimeRep + 0.5);

    if (def.type === 'sabotage' && targetHoodId) {
      delete this.rivals[targetHoodId];
      const hood = D.HOODS.find(h => h.id === targetHoodId);
      this.heat = Math.min(100, this.heat + 15);
      this._addLog(`Tommy handled the situation in ${hood ? hood.name : targetHoodId}. Quietly.`, 'crime');
    }
    if (def.type === 'launder') {
      const bonus = Math.floor(this.cash * 0.05);
      this.cash += bonus;
      this._addLog(`Connie cleaned $${bonus.toLocaleString()} on her first pass.`, 'crime');
    }

    this._emit();
    return { ok: true };
  },

  cutContract(contactId) {
    const c = this.contracts.find(c => c.id === contactId);
    if (c) { c.active = false; this._emit(); }
  },
};
