class CrimeScene extends Phaser.Scene {
  constructor() { super('CrimeScene'); }

  create() {
    this.W = Data.W; this.H = Data.H;
    this._pendingContact = null;
    this._buildBackground();
    this._buildHeader();
    this._buildContactCards();
    this._buildSidePanel();
    this._subscribe();
    this._refresh();
  }

  _buildBackground() {
    this.add.rectangle(this.W/2, this.H/2, this.W, this.H, 0x080810);
    // Atmospheric overlay
    const g = this.add.graphics();
    g.fillGradientStyle(0x0d0010, 0x0d0010, 0x100008, 0x100008, 0.6);
    g.fillRect(0, 0, this.W, this.H);
    // Vertical bars
    for (let i = 0; i < 8; i++) {
      g.fillStyle(0x0a0015, 0.3);
      g.fillRect(i * 160, 0, 80, this.H);
    }
    this.add.text(this.W/2, this.H - 18, '"In this city, everybody\'s for sale." — Don Caruso', {
      fontSize: '12px', fontFamily: 'Georgia, serif', color: '#222',
    }).setOrigin(0.5);
  }

  _buildHeader() {
    this.add.rectangle(this.W/2, 28, this.W, 56, 0x080810).setStrokeStyle(1, 0x200020);

    const back = this.add.text(28, 28, '← CITY MAP', {
      fontSize: '14px', fontFamily: 'monospace', color: '#444',
    }).setOrigin(0, 0.5).setInteractive({ useHandCursor: true });
    back.on('pointerover', () => back.setColor('#aaa'));
    back.on('pointerout',  () => back.setColor('#444'));
    back.on('pointerdown', () => { GameState.off('tick', 'crime'); this.scene.start('CityScene'); });

    this.add.text(this.W/2, 22, '🔪 CRIME NETWORK', {
      fontSize: '22px', fontFamily: 'monospace', color: '#8e44ad',
    }).setOrigin(0.5);
    this.add.text(this.W/2, 42, 'Discreet. Loyal. Expensive.', {
      fontSize: '11px', fontFamily: 'Georgia, serif', color: '#3d1a4d',
    }).setOrigin(0.5);
  }

  _buildContactCards() {
    this.cards = {};
    const contacts = Data.CRIME_CONTACTS;
    const cols = 3;
    const cardW = 360, cardH = 195;
    const startX = 60, startY = 75;

    contacts.forEach((contact, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const cx = startX + col * (cardW + 16) + cardW/2;
      const cy = startY + row * (cardH + 14) + cardH/2;

      const card = this._buildCard(cx, cy, cardW, cardH, contact);
      this.cards[contact.id] = { cx, cy, card };
    });
  }

  _buildCard(cx, cy, w, h, contact) {
    const isUnlocked = GameState.crimeRep >= contact.unlock;
    const isActive = GameState.crimeContacts.find(c => c.id === contact.id && c.active);
    const typeColors = {
      bribe:      0x2980b9,
      sabotage:   0xe74c3c,
      permit:     0xf39c12,
      launder:    0x27ae60,
      protection: 0x8e44ad,
    };
    const col = typeColors[contact.type] || 0x888;
    const locked = !isUnlocked;

    const bg = this.add.rectangle(cx, cy, w, h, 0x0d0010, locked ? 0.4 : 0.9)
      .setStrokeStyle(2, locked ? 0x1a1a1a : col, locked ? 0.3 : 0.6)
      .setInteractive({ useHandCursor: !locked });

    // Icon
    this.add.text(cx - w/2 + 42, cy - 50, contact.icon, { fontSize: '40px' }).setOrigin(0.5);

    // Name
    this.add.text(cx - w/2 + 90, cy - 52, contact.name, {
      fontSize: '16px', fontFamily: 'monospace',
      color: locked ? '#222' : '#' + col.toString(16).padStart(6,'0'),
    }).setOrigin(0, 0.5);

    // Type badge
    const typeLabel = contact.type.toUpperCase();
    this.add.text(cx - w/2 + 90, cy - 33, `[${typeLabel}]`, {
      fontSize: '10px', fontFamily: 'monospace', color: locked ? '#1a1a1a' : '#444',
    }).setOrigin(0, 0.5);

    // Description
    this.add.text(cx, cy - 10, locked ? `Requires ${contact.unlock} ★ street cred` : contact.description, {
      fontSize: '12px', fontFamily: locked ? 'monospace' : 'Georgia, serif',
      color: locked ? '#1a1a1a' : '#666',
      wordWrap: { width: w - 28 }, align: 'center',
    }).setOrigin(0.5);

    // Cost
    if (!locked) {
      const costLine = contact.recurring
        ? `$${contact.monthlyCost.toLocaleString()}/month`
        : `One-time: $${contact.cost.toLocaleString()}`;
      this.add.text(cx, cy + 48, costLine, {
        fontSize: '13px', fontFamily: 'monospace', color: '#886644',
      }).setOrigin(0.5);
    }

    // Heat indicator
    if (!locked) {
      const heatTxt = contact.heatGain === 0 ? 'No heat' : `+${contact.heatGain}% heat`;
      this.add.text(cx, cy + 65, heatTxt, {
        fontSize: '11px', fontFamily: 'monospace',
        color: contact.heatGain === 0 ? '#226622' : contact.heatGain > 15 ? '#cc2200' : '#aa6600',
      }).setOrigin(0.5);
    }

    // Action button
    if (!locked) {
      const btnLabel = isActive ? (contact.recurring ? '✓ ON PAYROLL' : '✓ DEPLOYED') : 'ENGAGE';
      const btnColor = isActive ? 0x1a2a1a : 0x1a0a2a;
      const btnStroke = isActive ? 0x226622 : col;
      const btnTxtCol = isActive ? '#226622' : '#' + col.toString(16).padStart(6,'0');

      const btn = this.add.rectangle(cx, cy + 88, 150, 28, btnColor)
        .setStrokeStyle(1, btnStroke).setInteractive({ useHandCursor: !isActive });
      const btnTxt = this.add.text(cx, cy + 88, btnLabel, {
        fontSize: '13px', fontFamily: 'monospace', color: btnTxtCol,
      }).setOrigin(0.5);

      if (!isActive) {
        btn.on('pointerover', () => btn.setFillStyle(0x2a1040));
        btn.on('pointerout',  () => btn.setFillStyle(btnColor));
        btn.on('pointerdown', () => this._engageContact(contact));
        btnTxt.setInteractive({ useHandCursor: true }).on('pointerdown', () => this._engageContact(contact));
      }
      if (isActive && contact.recurring) {
        const cutBtn = this.add.text(cx + 100, cy + 88, '[cut]', {
          fontSize: '11px', fontFamily: 'monospace', color: '#333',
        }).setOrigin(0, 0.5).setInteractive({ useHandCursor: true });
        cutBtn.on('pointerdown', () => {
          GameState.cutCrimeContact(contact.id);
          this._rebuildCards();
        });
      }
    }

    if (locked) {
      this.add.text(cx, cy + 75, '🔒 LOCKED', {
        fontSize: '14px', fontFamily: 'monospace', color: '#1a1a1a',
      }).setOrigin(0.5);
    }

    bg.on('pointerover', () => { if (!locked && !isActive) bg.setStrokeStyle(2, col, 0.9); });
    bg.on('pointerout',  () => { if (!locked && !isActive) bg.setStrokeStyle(2, col, 0.6); });
    return bg;
  }

  _engageContact(contact) {
    if (contact.type === 'sabotage') {
      this._showTargetSelector(contact);
      return;
    }
    const result = GameState.activateCrimeContact(contact.id);
    if (result.ok) {
      this._rebuildCards();
      this._refresh();
    } else {
      GameState.addNotification(`Can't engage ${contact.name}: ${result.msg}`, 'danger');
    }
  }

  _showTargetSelector(contact) {
    if (this._targetOverlay) this._targetOverlay.destroy();
    const rivalHoods = Object.entries(GameState.rivals);
    if (rivalHoods.length === 0) {
      GameState.addNotification('No rival locations to target.', 'info');
      return;
    }

    const cx = this.W/2, cy = this.H/2;
    const dlg = this.add.container(0, 0).setDepth(50);
    const bg = this.add.rectangle(cx, cy, 400, 80 + rivalHoods.length * 46, 0x080810, 0.97)
      .setStrokeStyle(2, 0xe74c3c);
    const title = this.add.text(cx, cy - 80 - rivalHoods.length * 23 + 30, 'SELECT TARGET', {
      fontSize: '16px', fontFamily: 'monospace', color: '#e74c3c',
    }).setOrigin(0.5);
    const sub = this.add.text(cx, cy - 80 - rivalHoods.length * 23 + 52, 'Tommy will pay them a visit tonight.', {
      fontSize: '12px', fontFamily: 'Georgia, serif', color: '#555',
    }).setOrigin(0.5);
    dlg.add([bg, title, sub]);

    rivalHoods.forEach(([hoodId, rivalId], i) => {
      const hood = Data.NEIGHBORHOODS.find(n => n.id === hoodId);
      const rival = Data.RIVALS.find(r => r.id === rivalId);
      const ty = cy - 80 - rivalHoods.length * 23 + 80 + i * 46;

      const rowBg = this.add.rectangle(cx, ty, 360, 40, 0x1a0808)
        .setStrokeStyle(1, 0x440000).setInteractive({ useHandCursor: true });
      const rowTxt = this.add.text(cx, ty,
        `${rival ? rival.shortName : rivalId} — ${hood ? hood.name : hoodId}`, {
          fontSize: '14px', fontFamily: 'monospace', color: '#cc4444',
        }).setOrigin(0.5);
      rowBg.on('pointerover', () => rowBg.setFillStyle(0x2a0808));
      rowBg.on('pointerout',  () => rowBg.setFillStyle(0x1a0808));
      rowBg.on('pointerdown', () => {
        dlg.destroy(); this._targetOverlay = null;
        const result = GameState.activateCrimeContact(contact.id, hoodId);
        if (result.ok) { this._rebuildCards(); this._refresh(); }
        else GameState.addNotification(`Failed: ${result.msg}`, 'danger');
      });
      rowTxt.setInteractive({ useHandCursor: true }).on('pointerdown', () => rowBg.emit('pointerdown'));
      dlg.add([rowBg, rowTxt]);
    });

    const cancelTy = cy - 80 - rivalHoods.length * 23 + 80 + rivalHoods.length * 46 + 5;
    const cancelBtn = this.add.rectangle(cx, cancelTy, 120, 30, 0x111)
      .setStrokeStyle(1, 0x333).setInteractive({ useHandCursor: true });
    const cancelTxt = this.add.text(cx, cancelTy, 'CANCEL', {
      fontSize: '12px', fontFamily: 'monospace', color: '#444',
    }).setOrigin(0.5);
    cancelBtn.on('pointerdown', () => { dlg.destroy(); this._targetOverlay = null; });
    cancelTxt.setInteractive({ useHandCursor: true }).on('pointerdown', () => cancelBtn.emit('pointerdown'));
    dlg.add([cancelBtn, cancelTxt]);

    this._targetOverlay = dlg;
  }

  _buildSidePanel() {
    const px = this.W - 145;
    this.add.rectangle(px, this.H/2, 285, this.H, 0x060608).setStrokeStyle(1, 0x180018);

    this.add.text(px, 72, 'STATUS', {
      fontSize: '11px', fontFamily: 'monospace', color: '#2a002a', letterSpacing: 4,
    }).setOrigin(0.5);

    this.add.text(px, 98, 'HEAT LEVEL', { fontSize: '11px', fontFamily: 'monospace', color: '#440000' }).setOrigin(0.5);
    this.add.rectangle(px, 118, 220, 16, 0x100005).setStrokeStyle(1, 0x220000);
    this.heatBar = this.add.rectangle(px - 110, 118, 0, 14, 0xe74c3c).setOrigin(0, 0.5);
    this.heatPct = this.add.text(px, 118, '0%', { fontSize: '10px', fontFamily: 'monospace', color: '#e74c3c' }).setOrigin(0.5);

    this.add.text(px, 142, 'STREET CRED', { fontSize: '11px', fontFamily: 'monospace', color: '#2a002a' }).setOrigin(0.5);
    this.credStars = [];
    for (let i = 0; i < 5; i++) {
      this.credStars.push(this.add.text(px - 44 + i * 22, 160, '★', { fontSize: '18px', color: '#1a001a' }).setOrigin(0.5));
    }

    this.add.text(px, 188, 'ACTIVE OPERATIONS', { fontSize: '11px', fontFamily: 'monospace', color: '#2a002a' }).setOrigin(0.5);
    this.activeOpsContainer = this.add.container(0, 0);

    this.cashText = this.add.text(px, this.H - 60, '$0', { fontSize: '20px', fontFamily: 'monospace', color: '#226622' }).setOrigin(0.5);
    this.add.text(px, this.H - 40, 'available funds', { fontSize: '10px', fontFamily: 'monospace', color: '#1a2a1a' }).setOrigin(0.5);

    const warnTxt = this.add.text(px, 590, '', {
      fontSize: '11px', fontFamily: 'Georgia, serif', color: '#440000', wordWrap: { width: 250 }, align: 'center',
    }).setOrigin(0.5);
    this.warnTxt = warnTxt;
  }

  _subscribe() {
    GameState.on('tick', 'crime', () => this._refresh());
  }

  _refresh() {
    const gs = GameState;
    const heatW = Math.floor(gs.heat / 100 * 220);
    this.heatBar.setSize(heatW, 14);
    this.heatPct.setText(gs.heat + '%');
    const heatColor = gs.heat > 70 ? 0xff2200 : gs.heat > 40 ? 0xff8800 : 0xe74c3c;
    this.heatBar.setFillStyle(heatColor);

    this.credStars.forEach((s, i) => {
      s.setColor(i < Math.floor(gs.crimeRep) ? '#8e44ad' : '#1a001a');
    });

    this.cashText.setText('$' + gs.cash.toLocaleString());
    this.cashText.setColor(gs.cash < 0 ? '#cc0000' : '#226622');

    // Active ops
    this.activeOpsContainer.removeAll(true);
    const active = gs.crimeContacts.filter(c => c.active);
    if (active.length === 0) {
      const t = this.add.text(this.W - 145, 215, 'None', { fontSize: '12px', fontFamily: 'monospace', color: '#1a001a' }).setOrigin(0.5);
      this.activeOpsContainer.add(t);
    } else {
      active.forEach((c, i) => {
        const def = Data.CRIME_CONTACTS.find(d => d.id === c.id);
        const t = this.add.text(this.W - 145, 210 + i * 26,
          `${def ? def.icon : '•'} ${def ? def.name : c.id}`, {
            fontSize: '12px', fontFamily: 'monospace', color: '#4a1a4a',
          }).setOrigin(0.5);
        this.activeOpsContainer.add(t);
      });
    }

    if (gs.heat > 70) {
      this.warnTxt.setText('⚠ HIGH HEAT — Lay low or face a raid!');
    } else if (gs.heat > 40) {
      this.warnTxt.setText('Police are watching. Stay careful.');
    } else {
      this.warnTxt.setText('');
    }
  }

  _rebuildCards() {
    // Destroy all existing card graphics and rebuild
    // Since we can't easily track them all, restart the scene
    this.scene.restart();
  }
}
