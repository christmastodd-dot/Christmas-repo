const UI = {
  screen: 'city',
  kitchenTab: 'equipment',
  kitchenHood: null,  // which restaurant we're viewing
  recipe: { dough: null, sauce: null, toppings: [], price: 14 },

  // ── BOOTSTRAP ────────────────────────────────────────

  init() {
    document.getElementById('start-btn').addEventListener('click', () => {
      S.init();
      document.getElementById('splash').style.display = 'none';
      const g = document.getElementById('game');
      g.style.display = 'flex';
      this.render();
      setInterval(() => { S.tick(); }, D.TICK_MS);
    });

    S.on(() => this.render());
    document.getElementById('nav').addEventListener('click', e => {
      const btn = e.target.closest('.nav-btn');
      if (btn) this.switchScreen(btn.dataset.screen);
    });
    document.getElementById('main').addEventListener('click', e => this._handleClick(e));
    document.getElementById('main').addEventListener('change', e => this._handleChange(e));
  },

  switchScreen(s) {
    this.screen = s;
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.screen === s));
    this.render();
  },

  // ── TOP-LEVEL RENDER ──────────────────────────────────

  render() {
    this._renderHeader();
    const main = document.getElementById('main');
    const screens = { city: () => this._city(), kitchen: () => this._kitchen(), lab: () => this._lab(), crime: () => this._crime() };
    main.innerHTML = (screens[this.screen] || screens.city)();
    this._postRender();
  },

  _renderHeader() {
    const el = document.getElementById('hdr-cash');
    el.textContent = '$' + S.cash.toLocaleString();
    el.style.color = S.cash < 0 ? 'var(--red)' : 'var(--green)';
    document.getElementById('hdr-date').textContent = `Day ${S.day} · Month ${S.month} · Year ${S.year}`;
    const heatEl = document.getElementById('hdr-heat');
    heatEl.textContent = `🌡 ${S.heat}%`;
    heatEl.className = 'heat-pill' + (S.heat > 60 ? ' hot' : '');

    // Nav dots
    const kitchenDot = document.getElementById('dot-kitchen');
    const crimeDot   = document.getElementById('dot-crime');
    if (kitchenDot) {
      const hasIssue = S.restaurants.some(r => {
        const hasOven  = r.equipment.some(e => e === 'oven_basic' || e === 'oven_pro');
        const hasSeats = r.equipment.some(e => { const eq = D.EQUIPMENT.find(d => d.id === e); return eq && eq.seats; });
        return !hasOven || !hasSeats || !r.activeRecipe;
      });
      kitchenDot.style.display = (S.restaurants.length > 0 && hasIssue) ? 'block' : 'none';
    }
    if (crimeDot) crimeDot.style.display = S.heat > 65 ? 'block' : 'none';
  },

  // ── CITY SCREEN ───────────────────────────────────────

  _city() {
    let cards = D.HOODS.map(h => {
      const mine  = S.getRestaurant(h.id);
      const rival = S.rivals[h.id] ? D.RIVALS.find(r => r.id === S.rivals[h.id]) : null;
      if (mine) return this._cityCardMine(h, mine);
      if (rival) return this._cityCardRival(h, rival);
      return this._cityCardAvailable(h);
    }).join('');

    const logEntries = S.log.slice(0, 8).map(e =>
      `<div class="event-item ${e.type}">${e.msg}<div class="ev-time">Day ${e.day}, Month ${e.month}</div></div>`
    ).join('');

    return `
      ${cards}
      ${S.log.length > 0 ? `<div class="sec-label">Intel</div>${logEntries}` : ''}
    `;
  },

  _cityCardMine(h, r) {
    const hasOven  = r.equipment.some(e => e === 'oven_basic' || e === 'oven_pro');
    const hasSeats = r.equipment.some(e => { const eq = D.EQUIPMENT.find(d => d.id === e); return eq && eq.seats; });
    const isOpen   = hasOven && hasSeats && r.activeRecipe;
    const issues   = [];
    if (!hasOven)       issues.push('needs oven');
    if (!hasSeats)      issues.push('needs tables');
    if (!r.activeRecipe) issues.push('needs recipe');

    return `
      <div class="card mine">
        <div class="card-row">
          <div>
            <div class="card-title">${h.icon} ${h.name}</div>
            <div class="card-sub">${h.type} · ${['','Low','Medium','High'][h.vol]} traffic</div>
          </div>
          <span class="badge badge-green">MINE</span>
        </div>
        ${isOpen ? `
          <div class="rev-counter">+$${r.dailyRev > 0 ? r.dailyRev.toLocaleString() : '—'}/day</div>
          <div class="rev-day">Running smoothly</div>
        ` : `
          <div style="color:var(--gold);font-size:13px;margin:8px 0;">⚠ Not operational · ${issues.join(', ')}</div>
        `}
        <div style="margin-top:10px">
          <button class="btn btn-green btn-sm" data-action="manage" data-hood="${h.id}">Manage →</button>
        </div>
      </div>
    `;
  },

  _cityCardRival(h, rival) {
    return `
      <div class="card rival">
        <div class="card-row">
          <div>
            <div class="card-title">${h.icon} ${h.name}</div>
            <div class="card-sub">${h.type} · ${['','Low','Medium','High'][h.vol]} traffic</div>
          </div>
          <span class="badge badge-red" style="color:${rival.color}">${rival.name}</span>
        </div>
        <div class="card-meta">${rival.desc}</div>
        <div style="font-size:12px;color:var(--muted);margin-top:6px;font-style:italic">"${rival.taunt}"</div>
        <div style="margin-top:10px;font-size:12px;color:var(--purple)">→ Hire Tommy Two-Fingers to remove them</div>
      </div>
    `;
  },

  _cityCardAvailable(h) {
    const canAfford = S.cash >= h.cost;
    return `
      <div class="card available">
        <div class="card-row">
          <div>
            <div class="card-title">${h.icon} ${h.name}</div>
            <div class="card-sub">${h.type} · ${['','Low','Medium','High'][h.vol]} traffic</div>
          </div>
          <span class="badge ${canAfford ? 'badge-dim' : 'badge-red'}">$${h.cost.toLocaleString()}</span>
        </div>
        <div class="card-meta">${h.desc}</div>
        <div style="font-size:12px;color:var(--dim);margin-top:4px">Rent: $${h.rent.toLocaleString()}/month</div>
        <div style="margin-top:10px">
          <button class="btn btn-primary btn-sm" data-action="buy" data-hood="${h.id}" ${canAfford ? '' : 'disabled'}>
            ${canAfford ? 'Open Here' : 'Not enough cash'}
          </button>
        </div>
      </div>
    `;
  },

  // ── KITCHEN SCREEN ────────────────────────────────────

  _kitchen() {
    if (S.restaurants.length === 0) {
      return `<div class="empty-state"><div class="empty-icon">🏗️</div>No restaurants yet.<br>Go to City and open a location first.</div>`;
    }

    // Picker if multiple restaurants
    const hood = this.kitchenHood && S.restaurants.find(r => r.hoodId === this.kitchenHood)
      ? this.kitchenHood
      : S.restaurants[0].hoodId;
    this.kitchenHood = hood;

    const picker = S.restaurants.length > 1 ? `
      <div class="tab-bar" style="margin-bottom:14px">
        ${S.restaurants.map(r => {
          const h = D.HOODS.find(x => x.id === r.hoodId);
          return `<button class="tab-btn ${r.hoodId === hood ? 'active' : ''}" data-action="kit-pick" data-hood="${r.hoodId}">${h ? h.icon + ' ' + h.name : r.hoodId}</button>`;
        }).join('')}
      </div>
    ` : '';

    const r   = S.getRestaurant(hood);
    const idx = S.getRestIdx(hood);
    const tabs = `
      <div class="tab-bar">
        ${['equipment','staff','menu','stats'].map(t =>
          `<button class="tab-btn ${this.kitchenTab === t ? 'active' : ''}" data-action="kit-tab" data-tab="${t}">${t.charAt(0).toUpperCase()+t.slice(1)}</button>`
        ).join('')}
      </div>
    `;

    const content = {
      equipment: () => this._kitEquipment(r, idx),
      staff:     () => this._kitStaff(r, idx),
      menu:      () => this._kitMenu(r, idx, hood),
      stats:     () => this._kitStats(r, hood),
    }[this.kitchenTab]();

    return picker + tabs + content;
  },

  _kitEquipment(r, idx) {
    const types = [
      { key: 'kitchen', label: 'Kitchen' },
      { key: 'seating',  label: 'Seating' },
      { key: 'decor',    label: 'Décor' },
    ];
    return types.map(({ key, label }) => {
      const items = D.EQUIPMENT.filter(e => e.type === key);
      return `
        <div class="sec-label">${label}</div>
        ${items.map(eq => {
          const owned   = r.equipment.filter(e => e === eq.id).length;
          const canBuy  = S.cash >= eq.cost;
          return `
            <div class="card" style="margin-bottom:8px">
              <div class="card-row">
                <div>
                  <div style="font-size:15px;font-weight:700">${eq.icon} ${eq.name}</div>
                  <div class="card-sub">${eq.desc}</div>
                </div>
                <div style="text-align:right">
                  ${owned > 0 ? `<span class="badge badge-green" style="margin-bottom:6px;display:inline-block">×${owned}</span><br>` : ''}
                  <button class="btn btn-sm ${canBuy ? 'btn-gold' : 'btn-ghost'}"
                    data-action="buy-eq" data-idx="${idx}" data-eq="${eq.id}" ${canBuy ? '' : 'disabled'}>
                    $${eq.cost.toLocaleString()}
                  </button>
                </div>
              </div>
            </div>
          `;
        }).join('')}
      `;
    }).join('');
  },

  _kitStaff(r, idx) {
    return D.STAFF.map(st => {
      const count   = r.staff.filter(s => s === st.id).length;
      const maxed   = count >= st.max;
      return `
        <div class="card" style="margin-bottom:8px">
          <div class="card-row">
            <div>
              <div style="font-size:15px;font-weight:700">${st.icon} ${st.name}</div>
              <div class="card-sub">${st.desc}</div>
              <div style="font-size:12px;color:var(--gold);margin-top:4px">$${st.wage.toLocaleString()}/month each · max ${st.max}</div>
            </div>
            <div style="text-align:right;display:flex;flex-direction:column;gap:7px;align-items:flex-end">
              <span style="font-size:22px;font-weight:900;color:${count > 0 ? 'var(--green)' : 'var(--muted)'}">${count}</span>
              <button class="btn btn-sm btn-green" data-action="hire" data-idx="${idx}" data-staff="${st.id}" ${maxed ? 'disabled' : ''}>+ Hire</button>
              ${count > 0 ? `<button class="btn btn-sm btn-ghost" data-action="fire" data-idx="${idx}" data-staff="${st.id}">− Fire</button>` : ''}
            </div>
          </div>
        </div>
      `;
    }).join('');
  },

  _kitMenu(r, idx, hoodId) {
    if (S.recipes.length === 0) {
      return `
        <div class="empty-state">
          <div class="empty-icon">🍕</div>
          No recipes yet.<br>Head to the Lab to craft your first pizza.
        </div>
        <button class="btn btn-primary btn-block" data-action="go-lab">Open Pizza Lab</button>
      `;
    }

    return S.recipes.map(rc => {
      const onMenu  = r.recipes.includes(rc.id);
      const active  = r.activeRecipe === rc.id;
      const cost    = S.calcRecipeCost(rc);
      const rating  = S.rateRecipe(rc, hoodId);
      const stars   = this._stars(rating);
      const margin  = rc.price - cost;
      return `
        <div class="card ${active ? 'mine' : ''}">
          <div class="card-row">
            <div>
              <div style="font-size:16px;font-weight:700">${rc.name}</div>
              <div class="card-sub">${rc.dough} · ${rc.sauce} · ${rc.toppings.length} toppings</div>
              <div style="margin-top:5px">${stars}</div>
            </div>
            <div style="text-align:right">
              <div style="font-size:13px;color:var(--gold)">$${rc.price} each</div>
              <div style="font-size:11px;color:var(--dim)">margin $${margin.toFixed(2)}</div>
              ${active ? '<div style="margin-top:6px"><span class="badge badge-green">★ Active</span></div>' : ''}
            </div>
          </div>
          <div style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap">
            ${!onMenu ? `<button class="btn btn-sm btn-gold" data-action="add-menu" data-idx="${idx}" data-rcid="${rc.id}">+ Add to Menu</button>` : ''}
            ${onMenu && !active ? `<button class="btn btn-sm btn-green" data-action="set-active" data-idx="${idx}" data-rcid="${rc.id}">Set Active</button>` : ''}
            ${onMenu ? `<span class="badge badge-dim">On menu</span>` : ''}
          </div>
        </div>
      `;
    }).join('');
  },

  _kitStats(r, hoodId) {
    const hood = D.HOODS.find(h => h.id === hoodId);
    const hasOven  = r.equipment.some(e => e === 'oven_basic' || e === 'oven_pro');
    const seats    = r.equipment.reduce((n, e) => {
      const eq = D.EQUIPMENT.find(d => d.id === e); return n + (eq && eq.seats ? eq.seats : 0);
    }, 0);
    const isOpen   = hasOven && seats > 0 && r.activeRecipe;
    const monthly  = r.totalRev || 0;
    const recipe   = r.activeRecipe ? S.recipes.find(rc => rc.id === r.activeRecipe) : null;

    const rows = [
      ['Status',          isOpen ? '<span class="stat-val g">Open & Serving</span>' : '<span class="stat-val r">Not Operational</span>'],
      ['Location',        `<span class="stat-val">${hood ? hood.name : hoodId}</span>`],
      ['Seating',         `<span class="stat-val ${seats > 0 ? 'g' : 'r'}">${seats > 0 ? seats + ' seats' : 'None — buy tables'}</span>`],
      ['Oven',            `<span class="stat-val ${hasOven ? 'g' : 'r'}">${hasOven ? '✓ Installed' : '✗ Needed'}</span>`],
      ['Staff',           `<span class="stat-val">${r.staff.length} employees</span>`],
      ['Active Recipe',   `<span class="stat-val ${recipe ? 'g' : 'r'}">${recipe ? recipe.name : 'None set'}</span>`],
      ['Revenue Today',   `<span class="stat-val g">$${(r.dailyRev || 0).toLocaleString()}</span>`],
      ['Revenue This Month', `<span class="stat-val g">$${monthly.toLocaleString()}</span>`],
      ['Monthly Rent',    `<span class="stat-val o">$${hood ? hood.rent.toLocaleString() : '—'}</span>`],
      ['Neighborhood',    `<span class="stat-val">${hood ? hood.type : '—'}</span>`],
    ];
    return `
      <div class="card">
        ${rows.map(([k, v]) => `<div class="stat-row"><span class="stat-key">${k}</span>${v}</div>`).join('')}
      </div>
      ${!isOpen ? `<div class="card" style="border-color:rgba(243,156,18,0.3);background:rgba(243,156,18,0.04);color:var(--gold);font-size:13px;text-align:center">
        ⚠️ To start earning: install an oven, add seating, and assign an active recipe.
      </div>` : ''}
    `;
  },

  // ── LAB SCREEN ────────────────────────────────────────

  _lab() {
    const rc = this.recipe;
    const dough = D.DOUGH.find(d => d.id === rc.dough);
    const sauce = D.SAUCE.find(s => s.id === rc.sauce);
    const cost  = S.calcRecipeCost(rc);
    const margin = rc.price - cost;

    const pizzaHtml = (dough || sauce) ? `
      <div class="pizza">
        <div class="p-crust" style="background:${dough ? dough.color : '#e59866'}"></div>
        ${sauce ? `<div class="p-sauce" style="background:${sauce.color}"></div>` : ''}
        ${sauce ? `<div class="p-cheese"></div>` : ''}
        ${rc.toppings.map((tid, i) => {
          const t = D.TOPPINGS.find(x => x.id === tid);
          const positions = [
            [50,35],[30,55],[70,55],[25,35],[75,35],
            [50,65],[40,45],[60,45],[35,65],[65,65]
          ];
          const [lx, ly] = positions[i % positions.length];
          return t ? `<div class="p-top" style="background:${t.color};left:${lx}%;top:${ly}%"></div>` : '';
        }).join('')}
      </div>
    ` : `<div class="pizza"><div class="p-empty">Pick dough<br>& sauce</div></div>`;

    const hoodRatings = S.restaurants.length > 0 ? `
      <div class="sec-label">Ratings by location</div>
      ${S.restaurants.map(r => {
        const h = D.HOODS.find(x => x.id === r.hoodId);
        const rating = S.rateRecipe(rc, r.hoodId);
        return h ? `<div class="stat-row"><span class="stat-key">${h.icon} ${h.name}</span>${this._stars(rating)}</div>` : '';
      }).join('')}
    ` : '';

    const savedRecipes = S.recipes.length > 0 ? `
      <div class="sec-label">Saved Recipes</div>
      ${S.recipes.map(r => {
        const rcost = S.calcRecipeCost(r);
        return `
          <div class="card" style="margin-bottom:8px">
            <div class="card-row">
              <div>
                <div style="font-weight:700">${r.name}</div>
                <div class="card-sub">${r.dough} · ${r.sauce} · ${r.toppings.length} toppings</div>
              </div>
              <div style="text-align:right;font-size:13px">
                <div style="color:var(--gold)">$${r.price}</div>
                <div style="color:var(--dim)">cost $${rcost.toFixed(1)}</div>
              </div>
            </div>
          </div>
        `;
      }).join('')}
    ` : '';

    return `
      <div class="pizza-wrap">${pizzaHtml}</div>

      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
        <span style="font-size:12px;color:var(--dim)">Cost: $${cost.toFixed(2)}</span>
        <span style="font-size:13px;font-weight:700;color:${margin > 0 ? 'var(--green)' : 'var(--red)'}">Margin: $${margin.toFixed(2)}</span>
      </div>

      <div class="sec-label">Dough</div>
      <div class="ingr-grid">
        ${D.DOUGH.map(d => `
          <button class="ingr-btn ${rc.dough === d.id ? 'sel' : ''}" data-action="sel-dough" data-id="${d.id}">
            <span>${d.name}</span><span class="ingr-cost">$${d.cost}</span>
          </button>
        `).join('')}
      </div>

      <div class="sec-label">Sauce</div>
      <div class="ingr-grid">
        ${D.SAUCE.map(s => `
          <button class="ingr-btn ${rc.sauce === s.id ? 'sel' : ''}" data-action="sel-sauce" data-id="${s.id}">
            <span>${s.name}</span><span class="ingr-cost">$${s.cost}</span>
          </button>
        `).join('')}
      </div>

      <div class="sec-label">Toppings <span style="font-weight:400;color:var(--dim)">(max 6, tap to toggle)</span></div>
      <div class="top-grid">
        ${D.TOPPINGS.map(t => {
          const sel = rc.toppings.includes(t.id);
          const catColors = { cheese:'#f39c12', meat:'#e74c3c', seafood:'#3498db', veggie:'#2ecc71', premium:'#9b59b6' };
          const col = catColors[t.cat] || '#888';
          return `
            <button class="top-btn ${sel ? 'sel' : ''}" data-action="sel-top" data-id="${t.id}"
              style="${sel ? `background:${col}22;border-color:${col};color:${col}` : ''}">
              ${t.name}<br><span style="font-weight:400;font-size:10px">$${t.cost}</span>
            </button>
          `;
        }).join('')}
      </div>

      <div class="sec-label">Sale Price</div>
      <div class="stepper">
        <button class="step-btn" data-action="price-down">−</button>
        <div class="step-val" id="price-val">$${rc.price}</div>
        <button class="step-btn" data-action="price-up">+</button>
      </div>

      <div class="sec-label">Recipe Name</div>
      <input class="text-input" id="recipe-name" type="text" placeholder="e.g. The Godfather" maxlength="28" value="">

      <button class="btn btn-primary btn-block" data-action="save-recipe" style="margin-bottom:16px">
        💾 Save Recipe
      </button>

      ${hoodRatings}

      <div class="sec-label">House Recipes</div>
      <div style="font-size:12px;color:var(--dim);margin-bottom:10px">Ready-made classics — tap to add to your lab.</div>
      ${D.DEFAULT_RECIPES.map((dr, i) => {
        const alreadySaved = S.recipes.some(r => r.name === dr.name);
        const cost = S.calcRecipeCost(dr);
        const margin = dr.price - cost;
        return `
          <div class="card" style="margin-bottom:8px">
            <div class="card-row">
              <div>
                <div style="font-size:15px;font-weight:700">${dr.name}</div>
                <div class="card-sub">${dr.desc}</div>
                <div style="font-size:11px;color:var(--muted);margin-top:4px">${dr.dough} · ${dr.sauce} · ${dr.toppings.join(', ')}</div>
              </div>
              <div style="text-align:right;flex-shrink:0;margin-left:12px">
                <div style="font-size:14px;font-weight:700;color:var(--gold)">$${dr.price}</div>
                <div style="font-size:11px;color:${margin > 0 ? 'var(--green)' : 'var(--red)'}">$${margin.toFixed(1)} margin</div>
              </div>
            </div>
            <div style="margin-top:10px">
              ${alreadySaved
                ? `<span class="badge badge-green">✓ In your lab</span>`
                : `<button class="btn btn-sm btn-gold" data-action="add-default" data-idx="${i}">+ Add to Lab</button>`
              }
            </div>
          </div>
        `;
      }).join('')}

      ${savedRecipes}
    `;
  },

  // ── CRIME SCREEN ──────────────────────────────────────

  _crime() {
    const heatColor = S.heat > 70 ? 'var(--red)' : S.heat > 40 ? 'var(--gold)' : 'var(--green)';
    const credStars = this._stars(S.crimeRep);
    const rivalHoods = Object.entries(S.rivals);
    const activeContracts = S.contracts.filter(c => c.active).map(c => D.CRIME.find(d => d.id === c.id)).filter(Boolean);

    return `
      <div class="crime-quote">"In this city, everybody's for sale." — Don Caruso</div>

      <div class="card">
        <div class="bar-wrap">
          <div class="bar-label"><span>Heat Level</span><span style="color:${heatColor}">${S.heat}%</span></div>
          <div class="bar-track"><div class="bar-fill" style="width:${S.heat}%;background:${heatColor}"></div></div>
        </div>
        <div style="margin-top:10px;display:flex;justify-content:space-between;align-items:center">
          <span style="font-size:12px;color:var(--dim)">Street Cred</span>
          ${credStars}
        </div>
        ${S.heat > 70 ? `<div style="margin-top:10px;font-size:13px;color:var(--red);text-align:center">⚠️ Lay low — a raid is coming</div>` : ''}
      </div>

      ${activeContracts.length > 0 ? `
        <div class="sec-label">Active Operations</div>
        ${activeContracts.map(def => `
          <div class="card active-op" style="margin-bottom:8px">
            <div class="card-row">
              <span style="font-size:15px">${def.icon} ${def.name}</span>
              <div style="display:flex;gap:8px;align-items:center">
                <span style="font-size:12px;color:var(--gold)">${def.recurring ? '$'+def.monthly.toLocaleString()+'/mo' : 'One-time'}</span>
                ${def.recurring ? `<button class="btn btn-xs btn-ghost" data-action="cut" data-cid="${def.id}">Cut</button>` : ''}
              </div>
            </div>
          </div>
        `).join('')}
      ` : ''}

      <div class="sec-label">Contacts</div>
      ${D.CRIME.map(def => {
        const isActive  = S.contracts.find(c => c.id === def.id && c.active);
        const locked    = S.crimeRep < def.unlock;
        const canAfford = S.cash >= def.cost;

        return `
          <div class="card crime ${locked ? 'locked' : ''} ${isActive ? 'active-op' : ''}">
            <div class="card-row">
              <div>
                <div style="font-size:16px;font-weight:700">${def.icon} ${def.name}</div>
                <div class="card-sub" style="text-transform:uppercase;letter-spacing:0.05em;font-size:10px;margin-top:2px">${def.type}</div>
              </div>
              ${locked
                ? `<span class="badge badge-dim">🔒 ${def.unlock}★ needed</span>`
                : isActive
                  ? `<span class="badge badge-purple">Active</span>`
                  : `<span class="badge ${canAfford ? 'badge-dim' : 'badge-red'}">$${def.cost.toLocaleString()}</span>`
              }
            </div>
            ${!locked ? `<div class="card-meta" style="margin-top:8px">${def.desc}</div>` : ''}
            ${!locked ? `
              <div style="margin-top:6px;display:flex;justify-content:space-between;align-items:center">
                <span style="font-size:11px;color:var(--dim)">+${def.heatGain}% heat ${def.recurring ? '· $'+def.monthly.toLocaleString()+'/month' : '· one-time'}</span>
                ${isActive
                  ? (def.recurring ? `<button class="btn btn-xs btn-ghost" data-action="cut" data-cid="${def.id}">Cut loose</button>` : '')
                  : `<button class="btn btn-sm btn-purple" data-action="engage" data-cid="${def.id}" ${canAfford ? '' : 'disabled'}>Engage</button>`
                }
              </div>
            ` : ''}
          </div>
        `;
      }).join('')}
    `;
  },

  // ── POST-RENDER (attach dynamic listeners) ────────────

  _postRender() {
    if (this.screen === 'lab') {
      const nameInput = document.getElementById('recipe-name');
      if (nameInput) nameInput.focus();
    }
  },

  // ── EVENT HANDLING ────────────────────────────────────

  _handleClick(e) {
    const el = e.target.closest('[data-action]');
    if (!el) return;
    const { action } = el.dataset;

    if (action === 'buy') {
      const ok = S.buyRestaurant(el.dataset.hood);
      if (!ok) this._toast('Not enough cash!', 'danger');
    }

    if (action === 'manage') {
      this.kitchenHood = el.dataset.hood;
      this.kitchenTab  = 'equipment';
      this.switchScreen('kitchen');
    }

    if (action === 'kit-tab')  { this.kitchenTab = el.dataset.tab; this.render(); }
    if (action === 'kit-pick') { this.kitchenHood = el.dataset.hood; this.render(); }

    if (action === 'buy-eq') {
      const ok = S.buyEquipment(+el.dataset.idx, el.dataset.eq);
      const eq = D.EQUIPMENT.find(e => e.id === el.dataset.eq);
      if (!ok) this._toast('Not enough cash!', 'danger');
      else this._toast(`${eq ? eq.name : 'Equipment'} installed!`, 'success');
    }

    if (action === 'hire') {
      const ok = S.hireStaff(+el.dataset.idx, el.dataset.staff);
      const st = D.STAFF.find(s => s.id === el.dataset.staff);
      if (!ok) this._toast(st ? `${st.name} — max ${st.max} or already at limit.` : 'Cannot hire.', 'warning');
      else this._toast(`${st ? st.name : 'Staff'} hired!`, 'success');
    }

    if (action === 'fire') { S.fireStaff(+el.dataset.idx, el.dataset.staff); }

    if (action === 'add-menu')   { S.assignRecipe(+el.dataset.idx, el.dataset.rcid); }
    if (action === 'set-active') { S.setActiveRecipe(+el.dataset.idx, el.dataset.rcid); }
    if (action === 'go-lab')     { this.switchScreen('lab'); }

    if (action === 'sel-dough') { this.recipe.dough = el.dataset.id; this.render(); }
    if (action === 'sel-sauce') { this.recipe.sauce = el.dataset.id; this.render(); }
    if (action === 'sel-top') {
      const id = el.dataset.id;
      const i  = this.recipe.toppings.indexOf(id);
      if (i >= 0) this.recipe.toppings.splice(i, 1);
      else if (this.recipe.toppings.length < 6) this.recipe.toppings.push(id);
      else this._toast('Max 6 toppings per recipe.', 'warning');
      this.render();
    }

    if (action === 'price-down') { this.recipe.price = Math.max(8, this.recipe.price - 1); this.render(); }
    if (action === 'price-up')   { this.recipe.price = Math.min(50, this.recipe.price + 1); this.render(); }

    if (action === 'add-default') {
      const dr = D.DEFAULT_RECIPES[+el.dataset.idx];
      if (dr) {
        S.saveRecipe({ ...dr, toppings: [...dr.toppings] });
        this._toast(`"${dr.name}" added to your lab!`, 'success');
      }
    }

    if (action === 'save-recipe') {
      const nameEl = document.getElementById('recipe-name');
      const name   = nameEl ? nameEl.value.trim() : '';
      if (!this.recipe.dough) { this._toast('Choose a dough type first.', 'warning'); return; }
      if (!this.recipe.sauce) { this._toast('Choose a sauce first.', 'warning'); return; }
      if (this.recipe.toppings.length === 0) { this._toast('Add at least one topping.', 'warning'); return; }
      if (!name) { this._toast('Give your pizza a name!', 'warning'); if (nameEl) nameEl.focus(); return; }
      S.saveRecipe({ ...this.recipe, toppings: [...this.recipe.toppings], name });
      this.recipe = { dough: null, sauce: null, toppings: [], price: 14 };
      this._toast(`"${name}" saved to the lab!`, 'success');
      this.render();
    }

    if (action === 'engage') {
      const cid = el.dataset.cid;
      const def = D.CRIME.find(c => c.id === cid);
      if (def && def.type === 'sabotage') {
        this._showTargetPicker(cid);
      } else {
        const result = S.engageCrime(cid);
        if (result.ok) this._toast(`${def ? def.name : 'Contact'} engaged.`, 'crime');
        else this._toast(result.msg, 'danger');
      }
    }

    if (action === 'cut') {
      S.cutContract(el.dataset.cid);
      this._toast('Contract cut.', 'warning');
    }

    if (action === 'sabotage-target') {
      const result = S.engageCrime('tommy', el.dataset.hood);
      if (result.ok) this._toast("Tommy's on it.", 'crime');
      else this._toast(result.msg, 'danger');
      this._closeModal();
    }

    if (action === 'close-modal') this._closeModal();
  },

  _handleChange(e) {},

  // ── TARGET PICKER MODAL ───────────────────────────────

  _showTargetPicker(cid) {
    const rivals = Object.entries(S.rivals);
    if (rivals.length === 0) { this._toast('No rival locations to target.', 'warning'); return; }
    const modal = document.createElement('div');
    modal.id = 'modal-overlay';
    modal.style.cssText = `
      position:fixed;inset:0;background:rgba(0,0,0,0.8);z-index:300;
      display:flex;align-items:center;justify-content:center;padding:24px;
    `;
    modal.innerHTML = `
      <div style="background:var(--surf);border:1px solid var(--border);border-radius:16px;padding:20px;width:100%;max-width:360px">
        <div style="font-size:17px;font-weight:800;margin-bottom:6px;color:var(--red)">🔨 Pick a Target</div>
        <div style="font-size:13px;color:var(--dim);margin-bottom:16px">Tommy will pay them a visit tonight.</div>
        ${rivals.map(([hoodId, rivalId]) => {
          const hood  = D.HOODS.find(h => h.id === hoodId);
          const rival = D.RIVALS.find(r => r.id === rivalId);
          return `
            <button class="btn btn-ghost btn-block" style="margin-bottom:8px;justify-content:space-between"
              data-action="sabotage-target" data-hood="${hoodId}">
              <span>${hood ? hood.icon + ' ' + hood.name : hoodId}</span>
              <span style="font-size:12px;color:var(--red)">${rival ? rival.name : rivalId}</span>
            </button>
          `;
        }).join('')}
        <button class="btn btn-ghost btn-block" style="margin-top:8px" data-action="close-modal">Cancel</button>
      </div>
    `;
    document.body.appendChild(modal);
    modal.addEventListener('click', e => this._handleClick(e));
  },

  _closeModal() {
    const m = document.getElementById('modal-overlay');
    if (m) m.remove();
  },

  // ── HELPERS ───────────────────────────────────────────

  _stars(rating) {
    const full = Math.round(Math.max(0, Math.min(5, rating)));
    return `<span class="stars">${'<span class="s-on">★</span>'.repeat(full)}${'<span class="s-off">★</span>'.repeat(5 - full)}</span>`;
  },

  _toast(msg, type = 'info') {
    const area = document.getElementById('toast-area');
    const el   = document.createElement('div');
    el.className = `toast ${type}`;
    el.textContent = msg;
    area.appendChild(el);
    setTimeout(() => el.remove(), 3300);
  },
};
