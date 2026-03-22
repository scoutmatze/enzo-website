const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

let db;

function getDb() {
  if (!db) {
    const dbPath = process.env.DB_PATH || './data/enzo.db';
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    db = new Database(dbPath);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
  }
  return db;
}

async function initDatabase() {
  const db = getDb();

  // Schema erstellen (idempotent – IF NOT EXISTS)
  db.exec(`
    -- ═══════════════════════════════════════════
    -- BENUTZER & ROLLEN
    -- ═══════════════════════════════════════════

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      display_name TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('admin', 'inhaber', 'leitung', 'team')),
      is_active INTEGER DEFAULT 1,
      phone TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_login DATETIME
    );

    CREATE TABLE IF NOT EXISTS audit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER REFERENCES users(id),
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id INTEGER,
      details TEXT,
      ip_address TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- ═══════════════════════════════════════════
    -- ALLERGENE
    -- ═══════════════════════════════════════════

    CREATE TABLE IF NOT EXISTS allergens (
      id TEXT PRIMARY KEY,
      name_de TEXT NOT NULL,
      name_en TEXT,
      name_it TEXT
    );

    CREATE TABLE IF NOT EXISTS ingredients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS ingredient_allergens (
      ingredient_id INTEGER NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
      allergen_id TEXT NOT NULL REFERENCES allergens(id),
      PRIMARY KEY (ingredient_id, allergen_id)
    );

    -- ═══════════════════════════════════════════
    -- GERICHTE (Kochbuch)
    -- ═══════════════════════════════════════════

    CREATE TABLE IF NOT EXISTS dishes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      name_it TEXT,
      category TEXT NOT NULL,
      base_price REAL,
      is_vegetarian INTEGER DEFAULT 0,
      is_vegan INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS dish_ingredients (
      dish_id INTEGER NOT NULL REFERENCES dishes(id) ON DELETE CASCADE,
      ingredient_id INTEGER NOT NULL REFERENCES ingredients(id),
      PRIMARY KEY (dish_id, ingredient_id)
    );

    -- ═══════════════════════════════════════════
    -- SPEISEKARTE
    -- ═══════════════════════════════════════════

    CREATE TABLE IF NOT EXISTS menu_categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      sort_order INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS menu_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category_id INTEGER NOT NULL REFERENCES menu_categories(id),
      dish_id INTEGER NOT NULL REFERENCES dishes(id),
      price REAL NOT NULL,
      sort_order INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- ═══════════════════════════════════════════
    -- WOCHENKARTE
    -- ═══════════════════════════════════════════

    CREATE TABLE IF NOT EXISTS weekly_menu (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      week_start DATE NOT NULL,
      mode TEXT NOT NULL CHECK(mode IN ('daily', 'weekly')),
      note TEXT,
      is_published INTEGER DEFAULT 0,
      created_by INTEGER REFERENCES users(id),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS weekly_menu_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      weekly_menu_id INTEGER NOT NULL REFERENCES weekly_menu(id) ON DELETE CASCADE,
      dish_id INTEGER NOT NULL REFERENCES dishes(id),
      day_of_week INTEGER,
      price REAL NOT NULL,
      sort_order INTEGER DEFAULT 0
    );

    -- ═══════════════════════════════════════════
    -- EINSTELLUNGEN
    -- ═══════════════════════════════════════════

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_by INTEGER REFERENCES users(id)
    );

    -- ═══════════════════════════════════════════
    -- PHASE 2: KUNDEN
    -- ═══════════════════════════════════════════

    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      company TEXT,
      is_business_customer INTEGER DEFAULT 0,
      notes TEXT,
      gdpr_consent_at DATETIME,
      gdpr_consent_source TEXT,
      gdpr_deleted_at DATETIME,
      gdpr_deletion_requested_at DATETIME,
      gdpr_retention_until DATE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- ═══════════════════════════════════════════
    -- PHASE 2: RESERVIERUNGEN
    -- ═══════════════════════════════════════════

    CREATE TABLE IF NOT EXISTS reservations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER REFERENCES customers(id),
      guest_name TEXT NOT NULL,
      guest_email TEXT,
      guest_phone TEXT,
      date DATE NOT NULL,
      time TEXT NOT NULL,
      party_size INTEGER NOT NULL,
      message TEXT,
      status TEXT NOT NULL DEFAULT 'pending'
        CHECK(status IN ('pending', 'confirmed', 'declined', 'cancelled', 'no_show', 'completed')),
      source TEXT DEFAULT 'website'
        CHECK(source IN ('website', 'phone', 'email', 'walkin', 'whatsapp')),
      internal_notes TEXT,
      confirmed_by INTEGER REFERENCES users(id),
      confirmed_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS blocked_dates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date DATE NOT NULL,
      reason TEXT NOT NULL,
      is_full_day INTEGER DEFAULT 1,
      blocked_from TEXT,
      blocked_until TEXT,
      created_by INTEGER REFERENCES users(id),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- ═══════════════════════════════════════════
    -- PHASE 2: INDIZES
    -- ═══════════════════════════════════════════

    CREATE INDEX IF NOT EXISTS idx_reservations_date ON reservations(date);
    CREATE INDEX IF NOT EXISTS idx_reservations_status ON reservations(status);
    CREATE INDEX IF NOT EXISTS idx_blocked_dates ON blocked_dates(date);
    CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);

    -- ═══════════════════════════════════════════
    -- VIEWS
    -- ═══════════════════════════════════════════

    CREATE VIEW IF NOT EXISTS dish_allergens AS
    SELECT DISTINCT
      di.dish_id,
      ia.allergen_id,
      a.name_de AS allergen_name
    FROM dish_ingredients di
    JOIN ingredient_allergens ia ON di.ingredient_id = ia.ingredient_id
    JOIN allergens a ON ia.allergen_id = a.id
    ORDER BY di.dish_id, ia.allergen_id;

    CREATE VIEW IF NOT EXISTS dish_allergen_string AS
    SELECT
      dish_id,
      GROUP_CONCAT(allergen_id, ', ') AS allergens
    FROM dish_allergens
    GROUP BY dish_id;

    -- ═══════════════════════════════════════════
    -- INDIZES
    -- ═══════════════════════════════════════════

    CREATE INDEX IF NOT EXISTS idx_audit_log_user ON audit_log(user_id);
    CREATE INDEX IF NOT EXISTS idx_audit_log_entity ON audit_log(entity_type, entity_id);
    CREATE INDEX IF NOT EXISTS idx_dishes_category ON dishes(category);
    CREATE INDEX IF NOT EXISTS idx_menu_items_category ON menu_items(category_id);
    CREATE INDEX IF NOT EXISTS idx_weekly_menu_week ON weekly_menu(week_start);
  `);

  // Allergene einfuegen (nur wenn leer)
  const count = db.prepare('SELECT COUNT(*) as c FROM allergens').get().c;
  if (count === 0) {
    const insert = db.prepare('INSERT INTO allergens (id, name_de, name_en, name_it) VALUES (?, ?, ?, ?)');
    const allergens = [
      ['A', 'Glutenhaltiges Getreide', 'Gluten-containing cereals', 'Cereali contenenti glutine'],
      ['B', 'Krebstiere', 'Crustaceans', 'Crostacei'],
      ['C', 'Eier', 'Eggs', 'Uova'],
      ['D', 'Fisch', 'Fish', 'Pesce'],
      ['E', 'Erdnüsse', 'Peanuts', 'Arachidi'],
      ['F', 'Soja', 'Soy', 'Soia'],
      ['G', 'Milch/Laktose', 'Milk/Lactose', 'Latte/Lattosio'],
      ['H', 'Schalenfrüchte', 'Tree nuts', 'Frutta a guscio'],
      ['L', 'Sellerie', 'Celery', 'Sedano'],
      ['M', 'Senf', 'Mustard', 'Senape'],
      ['N', 'Weichtiere', 'Molluscs', 'Molluschi'],
      ['O', 'Sulfite', 'Sulphites', 'Solfiti'],
      ['P', 'Lupinen', 'Lupin', 'Lupini'],
      ['Q', 'Sesam', 'Sesame', 'Sesamo'],
    ];
    const insertMany = db.transaction((items) => {
      for (const a of items) insert.run(...a);
    });
    insertMany(allergens);
    console.log('  ✅ 14 Allergene eingefügt');
  }

  // Standard-Einstellungen (nur wenn leer)
  const settingsCount = db.prepare('SELECT COUNT(*) as c FROM settings').get().c;
  if (settingsCount === 0) {
    const insertSetting = db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)');
    const defaults = [
      ['restaurant_name', 'Da Enzo – Caffé & Ristorante'],
      ['address', 'Zschokkestraße 34, 80686 München'],
      ['phone', '+49 (0)89 9443 2100'],
      ['email', 'info@da-enzo-muenchen.de'],
      ['booking_email', 'booking@da-enzo-muenchen.de'],
      ['opening_hours', '{"mo":"09:00-17:00","di":"09:00-18:00","mi":"09:00-18:00","do":"09:00-18:00","fr":"09:00-18:00","sa":"10:00-14:00","so":null}'],
      ['total_seats', '30'],
      ['max_party_size', '8'],
      ['menu_intro', 'Buon appetito! Unsere Gerichte werden täglich frisch zubereitet.'],
      ['allergen_note', 'Allergene: A Glutenhaltiges Getreide · B Krebstiere · C Eier · D Fisch · E Erdnüsse · F Soja · G Milch/Laktose · H Schalenfrüchte · L Sellerie · M Senf · N Weichtiere · O Sulfite · P Lupinen · Q Sesam. Bitte sprechen Sie uns bei Unverträglichkeiten an.'],
      ['reservation_slot_minutes', '30'],
      ['booking_advance_days', '30'],
      ['booking_start_time', '11:00'],
      ['booking_end_time', '21:00'],
    ];
    const insertSettings = db.transaction((items) => {
      for (const [k, v] of items) insertSetting.run(k, v);
    });
    insertSettings(defaults);
    console.log('  ✅ Standard-Einstellungen eingefügt');
  }

  // Reservierungs-Settings nachrüsten (für bestehende DBs)
  const upsertSetting = db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)');
  upsertSetting.run('reservation_slot_minutes', '30');
  upsertSetting.run('booking_advance_days', '30');
  upsertSetting.run('booking_start_time', '11:00');
  upsertSetting.run('booking_end_time', '21:00');

  // Admin-User erstellen (nur wenn keine User existieren)
  const userCount = db.prepare('SELECT COUNT(*) as c FROM users').get().c;
  if (userCount === 0) {
    const email = process.env.ADMIN_EMAIL || 'admin@da-enzo-muenchen.de';
    const password = process.env.ADMIN_PASSWORD || 'admin123';
    const hash = bcrypt.hashSync(password, 12);
    db.prepare(`
      INSERT INTO users (email, password_hash, display_name, role)
      VALUES (?, ?, ?, ?)
    `).run(email, hash, 'Administrator', 'admin');
    console.log(`  ✅ Admin-User erstellt: ${email}`);
  }

  console.log('  ✅ Datenbank initialisiert');
}

// Audit-Log Helper
function logAudit(userId, action, entityType, entityId, details, ipAddress) {
  const db = getDb();
  db.prepare(`
    INSERT INTO audit_log (user_id, action, entity_type, entity_id, details, ip_address)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(userId, action, entityType, entityId, JSON.stringify(details), ipAddress);
}

module.exports = { getDb, initDatabase, logAudit };
