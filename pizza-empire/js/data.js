const D = {
  START_CASH: 100000,
  TICK_MS:    3000,   // 1 tick = 1 game day

  HOODS: [
    { id: 'industrial', name: 'Industrial',   icon: '🏭', type: 'Worker',   vol: 3, cost: 18000, rent: 900,  desc: 'Blue-collar workers. Big, cheap, filling.',          favDough: ['thick','stuffed'], favTops: ['sausage','pepperoni','ham'] },
    { id: 'university', name: 'University',   icon: '🎓', type: 'Student',  vol: 3, cost: 28000, rent: 1400, desc: 'Students. Value deals, late-night crowds.',           favDough: ['stuffed','thick'], favTops: ['pepperoni','sausage','mozzarella'] },
    { id: 'suburbs',    name: 'Suburbs',      icon: '🏡', type: 'Family',   vol: 2, cost: 22000, rent: 1100, desc: 'Families. Large portions, kid-friendly.',             favDough: ['thick','stuffed'], favTops: ['ham','pepper','mozzarella'] },
    { id: 'harbor',     name: 'Harbor',       icon: '⚓', type: 'Tourist',  vol: 2, cost: 38000, rent: 1900, desc: 'Tourists and fishermen. Love seafood combos.',        favDough: ['thin','stuffed'],  favTops: ['anchovies','shrimp','olive'] },
    { id: 'old_quarter',name: 'Old Quarter',  icon: '🕌', type: 'Diverse',  vol: 2, cost: 33000, rent: 1650, desc: 'Diverse community. Spicy, exotic flavors.',           favDough: ['thin','wholegrain'],favTops: ['chicken','pepper','onion'] },
    { id: 'downtown',   name: 'Downtown',     icon: '🏢', type: 'Business', vol: 3, cost: 50000, rent: 2500, desc: 'Busy professionals. Thin crust, fast service.',       favDough: ['thin','wholegrain'],favTops: ['anchovies','truffle','gorgonzola'] },
    { id: 'uptown',     name: 'Uptown',       icon: '💎', type: 'Upscale',  vol: 2, cost: 75000, rent: 3750, desc: 'Wealthy clientele. Premium ingredients, ambiance.',   favDough: ['thin','wholegrain'],favTops: ['truffle','lobster','gorgonzola'] },
  ],

  EQUIPMENT: [
    { id: 'oven_basic',  name: 'Basic Oven',       icon: '🔥', cost: 3200, type: 'kitchen', desc: 'Required to cook. Handles 2 orders/hr.' },
    { id: 'oven_pro',    name: 'Pro Oven',          icon: '🔥', cost: 8500, type: 'kitchen', desc: 'High capacity. Handles 5 orders/hr.' },
    { id: 'fridge',      name: 'Walk-in Fridge',    icon: '🧊', cost: 4000, type: 'kitchen', desc: 'Better ingredient freshness. +15% quality.' },
    { id: 'table_basic', name: 'Basic Tables',      icon: '🪑', cost: 500,  type: 'seating', seats: 4, desc: '4 customer seats.' },
    { id: 'table_nice',  name: 'Nice Tables',       icon: '🍽️', cost: 1300, type: 'seating', seats: 4, quality: 1, desc: '4 seats + quality boost.' },
    { id: 'booth',       name: 'Booths',            icon: '🛋️', cost: 2200, type: 'seating', seats: 6, quality: 1, desc: '6 seats + cozy atmosphere.' },
    { id: 'vip_table',   name: 'VIP Section',       icon: '🥂', cost: 5500, type: 'seating', seats: 4, quality: 2, desc: '4 premium seats. Big upscale boost.' },
    { id: 'plant',       name: 'Plants',            icon: '🌿', cost: 220,  type: 'decor',  amb: 1, desc: 'A little life in the room.' },
    { id: 'art',         name: 'Wall Art',          icon: '🖼️', cost: 900,  type: 'decor',  amb: 2, desc: 'Sets the mood.' },
    { id: 'neon',        name: 'Neon Sign',         icon: '💡', cost: 1500, type: 'decor',  amb: 2, desc: 'Visible from outside. More foot traffic.' },
    { id: 'fountain',    name: 'Fountain',          icon: '⛲', cost: 3500, type: 'decor',  amb: 3, desc: 'Statement piece. Big ambiance.' },
  ],

  STAFF: [
    { id: 'cook',    name: 'Cook',    icon: '👨‍🍳', wage: 900,  max: 3, bonus: 'quality',    desc: 'Improves recipe quality ratings.' },
    { id: 'waiter',  name: 'Waiter',  icon: '🧑‍🍽️', wage: 650,  max: 3, bonus: 'speed',     desc: '+25% customers served per day.' },
    { id: 'manager', name: 'Manager', icon: '👔',   wage: 1600, max: 1, bonus: 'efficiency', desc: '+30% overall revenue.' },
    { id: 'cleaner', name: 'Cleaner', icon: '🧹',   wage: 520,  max: 2, bonus: 'hygiene',    desc: 'Lowers inspection risk + heat.' },
  ],

  DOUGH: [
    { id: 'thin',       name: 'Thin Crust',    cost: 1.5, color: '#e59866' },
    { id: 'thick',      name: 'Thick Crust',   cost: 2.2, color: '#c8742a' },
    { id: 'stuffed',    name: 'Stuffed Crust', cost: 3.2, color: '#c8a000' },
    { id: 'wholegrain', name: 'Whole Grain',   cost: 2.8, color: '#9a6a3a' },
  ],

  SAUCE: [
    { id: 'tomato', name: 'Classic Tomato',  cost: 0.8, color: '#c0392b' },
    { id: 'bbq',    name: 'BBQ',             cost: 1.3, color: '#7d4a1a' },
    { id: 'white',  name: 'White Garlic',    cost: 1.6, color: '#f0ece0' },
    { id: 'spicy',  name: 'Spicy Arrabiata', cost: 1.1, color: '#e74c3c' },
    { id: 'pesto',  name: 'Pesto',           cost: 2.1, color: '#1e8449' },
  ],

  TOPPINGS: [
    { id: 'mozzarella', name: 'Mozzarella',   cost: 1.5, color: '#f5f0e0', cat: 'cheese'  },
    { id: 'cheddar',    name: 'Cheddar',      cost: 1.2, color: '#e67e22', cat: 'cheese'  },
    { id: 'gorgonzola', name: 'Gorgonzola',   cost: 2.6, color: '#7d6000', cat: 'cheese'  },
    { id: 'pepperoni',  name: 'Pepperoni',    cost: 2.0, color: '#922b21', cat: 'meat'    },
    { id: 'sausage',    name: 'Sausage',      cost: 2.3, color: '#6e3a0a', cat: 'meat'    },
    { id: 'ham',        name: 'Ham',          cost: 1.8, color: '#e8a0a0', cat: 'meat'    },
    { id: 'chicken',    name: 'Chicken',      cost: 2.5, color: '#f5d0a0', cat: 'meat'    },
    { id: 'anchovies',  name: 'Anchovies',    cost: 1.6, color: '#1a4060', cat: 'seafood' },
    { id: 'shrimp',     name: 'Shrimp',       cost: 3.6, color: '#f4a0a0', cat: 'seafood' },
    { id: 'lobster',    name: 'Lobster',       cost: 8.5, color: '#e74c3c', cat: 'premium' },
    { id: 'mushroom',   name: 'Mushrooms',    cost: 0.9, color: '#8a6030', cat: 'veggie'  },
    { id: 'pepper',     name: 'Bell Peppers', cost: 0.7, color: '#1e8449', cat: 'veggie'  },
    { id: 'olive',      name: 'Black Olives', cost: 0.9, color: '#1a1a2a', cat: 'veggie'  },
    { id: 'onion',      name: 'Red Onion',    cost: 0.5, color: '#8e44ad', cat: 'veggie'  },
    { id: 'truffle',    name: 'Truffle Oil',  cost: 5.2, color: '#3a1a5a', cat: 'premium' },
  ],

  RIVALS: [
    { id: 'mafia_mike', name: "Mafia Mike's",    color: '#e74c3c', start: 'industrial', desc: 'Connected to the Falcone family. Persuasive tactics.',    taunt: "Nice place. Shame if something happened to it." },
    { id: 'bella_roma', name: 'Bella Roma',       color: '#2ecc71', start: 'uptown',    desc: 'Established 30-year family institution. High quality.',   taunt: "Your pizza couldn't fool a tourist." },
    { id: 'pizza_king', name: 'Pizza King Corp.', color: '#f39c12', start: 'suburbs',   desc: 'Soulless corporate chain. Cheap prices, relentless.',     taunt: "Our lawyers look forward to hearing from you." },
  ],

  CRIME: [
    { id: 'inspector', name: 'Inspector Joe',     icon: '👮', type: 'bribe',      cost: 600,   monthly: 600,   heatGain: 8,  unlock: 0, recurring: true,  desc: '$600/month. Your kitchens are always "immaculate."' },
    { id: 'tommy',     name: 'Tommy Two-Fingers', icon: '🔨', type: 'sabotage',   cost: 2500,  monthly: 0,     heatGain: 25, unlock: 0, recurring: false, desc: 'Pick a rival location. Tommy arranges an... accident.' },
    { id: 'reed',      name: 'Councilman Reed',   icon: '🏛️', type: 'permit',     cost: 4000,  monthly: 0,     heatGain: 12, unlock: 1, recurring: false, desc: 'Fast-tracks your next permit. Blocks a rival expansion.' },
    { id: 'connie',    name: 'Connie "Clean"',    icon: '💼', type: 'launder',    cost: 1200,  monthly: 1200,  heatGain: 5,  unlock: 1, recurring: true,  desc: '$1200/month. Launders an extra 5% of your revenue.' },
    { id: 'don',       name: 'Don Caruso',        icon: '🕴️', type: 'protection', cost: 12000, monthly: 12000, heatGain: 0,  unlock: 3, recurring: true,  desc: 'Full protection. No rival, inspector or cop touches you.' },
  ],

  DAYS_IN_MONTH: 30,
};
