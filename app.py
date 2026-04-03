import os
import sqlite3
from datetime import datetime
from functools import wraps

from flask import (
    Flask, g, redirect, url_for, render_template,
    request, flash, session
)
from flask_login import (
    LoginManager, UserMixin, login_user, logout_user,
    login_required, current_user
)
from werkzeug.security import generate_password_hash, check_password_hash

SCORING_ACTIONS = [
    ('No vote w/ floor remarks', 25),
    ('Floor speech >5 min', 500),
    ('Absent for session day', 1000),
    ('Passed legislation through house', 100),
    ('Bill dies with floor vote', 5000),
    ('Cause of point of order', 1000),
    ('Bill gets recommitted', 2500),
    ('Bill gets floor amendment', 500),
    ('Failed floor amendment', 1000),
    ('Ruling request on conflict of interest', 500),
]

app = Flask(__name__)
app.secret_key = os.environ.get('SECRET_KEY', 'dev-secret-change-me')

DATABASE_URL = os.environ.get('DATABASE_URL')
DATABASE_PATH = os.environ.get('DATABASE_PATH', 'fantasy_legislature.db')
USE_POSTGRES = DATABASE_URL is not None

# Render provides postgres:// but psycopg2 requires postgresql://
if USE_POSTGRES and DATABASE_URL.startswith('postgres://'):
    DATABASE_URL = DATABASE_URL.replace('postgres://', 'postgresql://', 1)

if USE_POSTGRES:
    import psycopg2
    import psycopg2.extras

login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'login'
login_manager.login_message_category = 'error'


# ── Database helpers ──────────────────────────────────────────────

class PgRowWrapper:
    """Makes psycopg2 DictRow behave like sqlite3.Row for templates."""
    def __init__(self, row):
        self._row = row
    def __getitem__(self, key):
        return self._row[key]
    def __contains__(self, key):
        return key in self._row
    def keys(self):
        return self._row.keys()


class PgCursorWrapper:
    """Wraps a psycopg2 cursor to use ? placeholders and return Row-like objects."""
    def __init__(self, conn):
        self._conn = conn
        self._cursor = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)

    def execute(self, sql, params=None):
        sql = sql.replace('?', '%s')
        self._cursor.execute(sql, params)
        return self

    def fetchone(self):
        row = self._cursor.fetchone()
        return PgRowWrapper(row) if row else None

    def fetchall(self):
        return [PgRowWrapper(r) for r in self._cursor.fetchall()]

    def close(self):
        self._cursor.close()


class PgConnectionWrapper:
    """Wraps psycopg2 connection to provide sqlite-compatible interface."""
    def __init__(self, conn):
        self._conn = conn

    def execute(self, sql, params=None):
        cur = PgCursorWrapper(self._conn)
        cur.execute(sql, params)
        return cur

    def commit(self):
        self._conn.commit()

    def close(self):
        self._conn.close()

    def rollback(self):
        self._conn.rollback()

    def executescript(self, sql):
        cur = self._conn.cursor()
        cur.execute(sql)
        self._conn.commit()
        cur.close()


def get_db():
    if 'db' not in g:
        if USE_POSTGRES:
            conn = psycopg2.connect(DATABASE_URL)
            g.db = PgConnectionWrapper(conn)
        else:
            g.db = sqlite3.connect(DATABASE_PATH)
            g.db.row_factory = sqlite3.Row
            g.db.execute('PRAGMA foreign_keys = ON')
    return g.db


@app.teardown_appcontext
def close_db(exc):
    db = g.pop('db', None)
    if db is not None:
        if exc is not None and USE_POSTGRES:
            db.rollback()
        db.close()


def init_db():
    db = get_db()
    if USE_POSTGRES:
        db.executescript('''
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                username TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                is_admin INTEGER NOT NULL DEFAULT 0,
                team_name TEXT,
                created_at TIMESTAMP NOT NULL DEFAULT NOW()
            );

            CREATE TABLE IF NOT EXISTS legislators (
                id SERIAL PRIMARY KEY,
                name TEXT NOT NULL,
                headshot_url TEXT,
                team_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
                category TEXT,
                created_at TIMESTAMP NOT NULL DEFAULT NOW()
            );

            CREATE TABLE IF NOT EXISTS scoring_events (
                id SERIAL PRIMARY KEY,
                legislator_id INTEGER NOT NULL REFERENCES legislators(id) ON DELETE CASCADE,
                event_type TEXT NOT NULL,
                points INTEGER NOT NULL,
                created_at TIMESTAMP NOT NULL DEFAULT NOW()
            );
        ''')
    else:
        db.executescript('''
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                is_admin INTEGER NOT NULL DEFAULT 0,
                team_name TEXT,
                created_at TEXT NOT NULL DEFAULT (datetime('now'))
            );

            CREATE TABLE IF NOT EXISTS legislators (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                headshot_url TEXT,
                team_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
                category TEXT,
                created_at TEXT NOT NULL DEFAULT (datetime('now'))
            );

            CREATE TABLE IF NOT EXISTS scoring_events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                legislator_id INTEGER NOT NULL REFERENCES legislators(id) ON DELETE CASCADE,
                event_type TEXT NOT NULL,
                points INTEGER NOT NULL,
                created_at TEXT NOT NULL DEFAULT (datetime('now'))
            );
        ''')
    db.commit()


def seed_admin():
    """Create default admin if no users exist."""
    db = get_db()
    count = db.execute('SELECT COUNT(*) FROM users').fetchone()[0]
    if count == 0:
        admin_pass = os.environ.get('ADMIN_PASSWORD', 'admin')
        db.execute(
            'INSERT INTO users (username, password_hash, is_admin) VALUES (?, ?, 1)',
            ('admin', generate_password_hash(admin_pass))
        )
        db.commit()


import time as _time

def startup_init():
    """Initialize DB with retries — Render's DB may not be ready immediately."""
    for attempt in range(5):
        try:
            init_db()
            seed_admin()
            return
        except Exception as e:
            if attempt < 4:
                print(f"DB init attempt {attempt + 1} failed: {e}. Retrying in 2s...")
                _time.sleep(2)
            else:
                print(f"DB init failed after 5 attempts: {e}")
                raise

with app.app_context():
    startup_init()


# ── User model for Flask-Login ────────────────────────────────────

class User(UserMixin):
    def __init__(self, row):
        self.id = row['id']
        self.username = row['username']
        self.password_hash = row['password_hash']
        self.is_admin = bool(row['is_admin'])
        self.team_name = row['team_name']


@login_manager.user_loader
def load_user(user_id):
    db = get_db()
    row = db.execute('SELECT * FROM users WHERE id = ?', (user_id,)).fetchone()
    if row:
        return User(row)
    return None


def admin_required(f):
    @wraps(f)
    @login_required
    def decorated(*args, **kwargs):
        if not current_user.is_admin:
            flash('Admin access required.', 'error')
            return redirect(url_for('dashboard'))
        return f(*args, **kwargs)
    return decorated


# ── Auth routes ───────────────────────────────────────────────────

@app.route('/login', methods=['GET', 'POST'])
def login():
    if current_user.is_authenticated:
        return redirect(url_for('dashboard'))

    if request.method == 'POST':
        username = request.form.get('username', '').strip()
        password = request.form.get('password', '')
        db = get_db()
        row = db.execute(
            'SELECT * FROM users WHERE username = ?', (username,)
        ).fetchone()

        if row and check_password_hash(row['password_hash'], password):
            login_user(User(row))
            flash('Welcome back!', 'success')
            return redirect(url_for('dashboard'))
        else:
            flash('Invalid username or password.', 'error')

    return render_template('login.html')


@app.route('/logout')
@login_required
def logout():
    logout_user()
    flash('Logged out.', 'info')
    return redirect(url_for('login'))


# ── Main pages ────────────────────────────────────────────────────

@app.route('/')
@login_required
def dashboard():
    db = get_db()
    team_count = db.execute(
        'SELECT COUNT(DISTINCT id) FROM users WHERE team_name IS NOT NULL AND team_name != ""'
    ).fetchone()[0]
    legislator_count = db.execute(
        'SELECT COUNT(*) FROM legislators WHERE team_id IS NOT NULL'
    ).fetchone()[0]
    total_events = db.execute(
        'SELECT COUNT(*) FROM scoring_events'
    ).fetchone()[0]

    recent_events = db.execute('''
        SELECT se.event_type, se.points, se.created_at, l.name as legislator_name
        FROM scoring_events se
        JOIN legislators l ON se.legislator_id = l.id
        ORDER BY se.created_at DESC
        LIMIT 10
    ''').fetchall()

    return render_template('dashboard.html',
                           team_count=team_count,
                           legislator_count=legislator_count,
                           total_events=total_events,
                           recent_events=recent_events)


@app.route('/my-team')
@login_required
def my_team():
    db = get_db()
    legislators = []
    total_points = 0

    if current_user.team_name:
        legislators = db.execute('''
            SELECT l.*, COALESCE(SUM(se.points), 0) as points
            FROM legislators l
            LEFT JOIN scoring_events se ON se.legislator_id = l.id
            WHERE l.team_id = ?
            GROUP BY l.id
            ORDER BY l.category, l.name
        ''', (current_user.id,)).fetchall()
        total_points = sum(leg['points'] for leg in legislators)

    return render_template('my_team.html',
                           legislators=legislators,
                           total_points=total_points)


@app.route('/leaderboard')
@login_required
def leaderboard():
    db = get_db()
    teams = db.execute('''
        SELECT u.id, u.team_name, u.username,
               COALESCE(SUM(se.points), 0) as total_points,
               COUNT(DISTINCT l.id) as legislator_count
        FROM users u
        LEFT JOIN legislators l ON l.team_id = u.id
        LEFT JOIN scoring_events se ON se.legislator_id = l.id
        WHERE u.team_name IS NOT NULL AND u.team_name != ''
        GROUP BY u.id
        ORDER BY total_points DESC
    ''').fetchall()

    legislators = db.execute('''
        SELECT l.id, l.name, l.headshot_url, l.category,
               u.team_name,
               COALESCE(SUM(se.points), 0) as total_points
        FROM legislators l
        LEFT JOIN users u ON l.team_id = u.id
        LEFT JOIN scoring_events se ON se.legislator_id = l.id
        GROUP BY l.id
        HAVING total_points > 0
        ORDER BY total_points DESC
    ''').fetchall()

    return render_template('leaderboard.html', teams=teams, legislators=legislators)


@app.route('/feed')
@login_required
def feed():
    db = get_db()
    page = request.args.get('page', 1, type=int)
    per_page = 30
    offset = (page - 1) * per_page

    total = db.execute('SELECT COUNT(*) FROM scoring_events').fetchone()[0]
    events = db.execute('''
        SELECT se.id, se.event_type, se.points, se.created_at,
               l.name as legislator_name, l.headshot_url,
               u.team_name
        FROM scoring_events se
        JOIN legislators l ON se.legislator_id = l.id
        LEFT JOIN users u ON l.team_id = u.id
        ORDER BY se.created_at DESC
        LIMIT ? OFFSET ?
    ''', (per_page, offset)).fetchall()

    has_next = offset + per_page < total
    has_prev = page > 1

    return render_template('feed.html',
                           events=events,
                           page=page,
                           has_next=has_next,
                           has_prev=has_prev)


# ── Admin routes ──────────────────────────────────────────────────

@app.route('/admin/users')
@admin_required
def admin_manage_users():
    db = get_db()
    users = db.execute('SELECT * FROM users ORDER BY created_at').fetchall()
    return render_template('admin/manage_users.html', users=users)


@app.route('/admin/users/create', methods=['POST'])
@admin_required
def admin_create_user():
    username = request.form.get('username', '').strip()
    password = request.form.get('password', '')
    team_name = request.form.get('team_name', '').strip() or None
    is_admin = request.form.get('is_admin') == '1'

    if not username or not password:
        flash('Username and password are required.', 'error')
        return redirect(url_for('admin_manage_users'))

    db = get_db()
    existing = db.execute(
        'SELECT id FROM users WHERE username = ?', (username,)
    ).fetchone()

    if existing:
        flash(f'Username "{username}" already exists.', 'error')
        return redirect(url_for('admin_manage_users'))

    db.execute(
        'INSERT INTO users (username, password_hash, is_admin, team_name) VALUES (?, ?, ?, ?)',
        (username, generate_password_hash(password), int(is_admin), team_name)
    )
    db.commit()
    flash(f'User "{username}" created.', 'success')
    return redirect(url_for('admin_manage_users'))


@app.route('/admin/users/<int:user_id>/delete', methods=['POST'])
@admin_required
def admin_delete_user(user_id):
    if user_id == current_user.id:
        flash('Cannot delete yourself.', 'error')
        return redirect(url_for('admin_manage_users'))

    db = get_db()
    db.execute('UPDATE legislators SET team_id = NULL, category = NULL WHERE team_id = ?', (user_id,))
    db.execute('DELETE FROM users WHERE id = ?', (user_id,))
    db.commit()
    flash('User deleted.', 'success')
    return redirect(url_for('admin_manage_users'))


@app.route('/admin/users/<int:user_id>/edit', methods=['GET', 'POST'])
@admin_required
def admin_edit_user(user_id):
    db = get_db()
    user = db.execute('SELECT * FROM users WHERE id = ?', (user_id,)).fetchone()
    if not user:
        flash('User not found.', 'error')
        return redirect(url_for('admin_manage_users'))

    if request.method == 'POST':
        username = request.form.get('username', '').strip()
        password = request.form.get('password', '').strip()
        team_name = request.form.get('team_name', '').strip() or None
        is_admin = request.form.get('is_admin') == '1'

        if not username:
            flash('Username is required.', 'error')
            return redirect(url_for('admin_edit_user', user_id=user_id))

        # Check for duplicate username (excluding this user)
        existing = db.execute(
            'SELECT id FROM users WHERE username = ? AND id != ?', (username, user_id)
        ).fetchone()
        if existing:
            flash(f'Username "{username}" already taken.', 'error')
            return redirect(url_for('admin_edit_user', user_id=user_id))

        if password:
            db.execute(
                'UPDATE users SET username = ?, password_hash = ?, team_name = ?, is_admin = ? WHERE id = ?',
                (username, generate_password_hash(password), team_name, int(is_admin), user_id)
            )
        else:
            db.execute(
                'UPDATE users SET username = ?, team_name = ?, is_admin = ? WHERE id = ?',
                (username, team_name, int(is_admin), user_id)
            )
        db.commit()
        flash(f'User "{username}" updated.', 'success')
        return redirect(url_for('admin_manage_users'))

    return render_template('admin/edit_user.html', user=user)


# ── Admin legislator routes ───────────────────────────────────────

@app.route('/admin/legislators')
@admin_required
def admin_manage_legislators():
    db = get_db()
    legislators = db.execute('''
        SELECT l.*, u.team_name
        FROM legislators l
        LEFT JOIN users u ON l.team_id = u.id
        ORDER BY l.name
    ''').fetchall()
    unassigned = db.execute(
        'SELECT * FROM legislators WHERE team_id IS NULL ORDER BY name'
    ).fetchall()
    teams = db.execute(
        'SELECT * FROM users WHERE team_name IS NOT NULL AND team_name != "" ORDER BY team_name'
    ).fetchall()
    return render_template('admin/manage_legislators.html',
                           legislators=legislators,
                           unassigned=unassigned,
                           teams=teams)


@app.route('/admin/legislators/create', methods=['POST'])
@admin_required
def admin_create_legislator():
    name = request.form.get('name', '').strip()
    headshot_url = request.form.get('headshot_url', '').strip() or None

    if not name:
        flash('Legislator name is required.', 'error')
        return redirect(url_for('admin_manage_legislators'))

    db = get_db()
    db.execute(
        'INSERT INTO legislators (name, headshot_url) VALUES (?, ?)',
        (name, headshot_url)
    )
    db.commit()
    flash(f'Legislator "{name}" added.', 'success')
    return redirect(url_for('admin_manage_legislators'))


@app.route('/admin/legislators/assign', methods=['POST'])
@admin_required
def admin_assign_legislator():
    legislator_id = request.form.get('legislator_id', type=int)
    team_id = request.form.get('team_id', type=int)
    category = request.form.get('category', '').strip()

    if not legislator_id or not team_id or not category:
        flash('All fields are required for assignment.', 'error')
        return redirect(url_for('admin_manage_legislators'))

    db = get_db()

    # Validate roster limits
    CATEGORY_LIMITS = {
        'A Bracket Committee Chair': 1,
        'B Bracket Committee Chair': 2,
        'Minority Party': 1,
        'Wild Card': 1,
    }
    limit = CATEGORY_LIMITS.get(category, 0)
    current_count = db.execute(
        'SELECT COUNT(*) FROM legislators WHERE team_id = ? AND category = ?',
        (team_id, category)
    ).fetchone()[0]

    if current_count >= limit:
        team = db.execute('SELECT team_name FROM users WHERE id = ?', (team_id,)).fetchone()
        flash(f'{team["team_name"]} already has {limit} {category} slot(s) filled.', 'error')
        return redirect(url_for('admin_manage_legislators'))

    db.execute(
        'UPDATE legislators SET team_id = ?, category = ? WHERE id = ?',
        (team_id, category, legislator_id)
    )
    db.commit()

    leg = db.execute('SELECT name FROM legislators WHERE id = ?', (legislator_id,)).fetchone()
    team = db.execute('SELECT team_name FROM users WHERE id = ?', (team_id,)).fetchone()
    flash(f'{leg["name"]} assigned to {team["team_name"]} as {category}.', 'success')
    return redirect(url_for('admin_manage_legislators'))


@app.route('/admin/legislators/<int:legislator_id>/unassign', methods=['POST'])
@admin_required
def admin_unassign_legislator(legislator_id):
    db = get_db()
    db.execute(
        'UPDATE legislators SET team_id = NULL, category = NULL WHERE id = ?',
        (legislator_id,)
    )
    db.commit()
    flash('Legislator unassigned.', 'success')
    return redirect(url_for('admin_manage_legislators'))


@app.route('/admin/legislators/<int:legislator_id>/delete', methods=['POST'])
@admin_required
def admin_delete_legislator(legislator_id):
    db = get_db()
    db.execute('DELETE FROM legislators WHERE id = ?', (legislator_id,))
    db.commit()
    flash('Legislator deleted.', 'success')
    return redirect(url_for('admin_manage_legislators'))


# ── Admin scoring routes ──────────────────────────────────────────

@app.route('/admin/scoring')
@admin_required
def admin_scoring():
    db = get_db()
    teams = db.execute('''
        SELECT u.id, u.team_name, u.username
        FROM users u
        WHERE u.team_name IS NOT NULL AND u.team_name != ''
        ORDER BY u.team_name
    ''').fetchall()

    team_data = []
    for team in teams:
        legislators = db.execute('''
            SELECT l.*, COALESCE(SUM(se.points), 0) as points
            FROM legislators l
            LEFT JOIN scoring_events se ON se.legislator_id = l.id
            WHERE l.team_id = ?
            GROUP BY l.id
            ORDER BY l.category, l.name
        ''', (team['id'],)).fetchall()
        team_data.append({'team': team, 'legislators': legislators})

    return render_template('admin/scoring.html',
                           team_data=team_data,
                           scoring_actions=SCORING_ACTIONS)


@app.route('/admin/scoring/legislator/<int:legislator_id>')
@admin_required
def admin_score_legislator(legislator_id):
    db = get_db()
    legislator = db.execute('''
        SELECT l.*, u.team_name, COALESCE(SUM(se.points), 0) as total_points
        FROM legislators l
        LEFT JOIN users u ON l.team_id = u.id
        LEFT JOIN scoring_events se ON se.legislator_id = l.id
        WHERE l.id = ?
        GROUP BY l.id
    ''', (legislator_id,)).fetchone()

    if not legislator:
        flash('Legislator not found.', 'error')
        return redirect(url_for('admin_scoring'))

    events = db.execute('''
        SELECT * FROM scoring_events
        WHERE legislator_id = ?
        ORDER BY created_at DESC
    ''', (legislator_id,)).fetchall()

    return render_template('admin/score_legislator.html',
                           legislator=legislator,
                           events=events,
                           scoring_actions=SCORING_ACTIONS)


@app.route('/admin/scoring/legislator/<int:legislator_id>/add', methods=['POST'])
@admin_required
def admin_add_score(legislator_id):
    event_type = request.form.get('event_type', '')
    points = request.form.get('points', type=int)

    if not event_type or points is None:
        flash('Invalid scoring event.', 'error')
        return redirect(url_for('admin_score_legislator', legislator_id=legislator_id))

    db = get_db()
    db.execute(
        'INSERT INTO scoring_events (legislator_id, event_type, points) VALUES (?, ?, ?)',
        (legislator_id, event_type, points)
    )
    db.commit()

    leg = db.execute('SELECT name FROM legislators WHERE id = ?', (legislator_id,)).fetchone()
    flash(f'+{points:,} pts to {leg["name"]} for "{event_type}".', 'success')
    return redirect(url_for('admin_score_legislator', legislator_id=legislator_id))


@app.route('/admin/scoring/event/<int:event_id>/undo', methods=['POST'])
@admin_required
def admin_undo_score(event_id):
    db = get_db()
    event = db.execute('SELECT * FROM scoring_events WHERE id = ?', (event_id,)).fetchone()
    if not event:
        flash('Event not found.', 'error')
        return redirect(url_for('admin_scoring'))

    legislator_id = event['legislator_id']
    db.execute('DELETE FROM scoring_events WHERE id = ?', (event_id,))
    db.commit()
    flash(f'Undid "{event["event_type"]}" ({event["points"]:,} pts).', 'success')
    return redirect(url_for('admin_score_legislator', legislator_id=legislator_id))


# ── Run ───────────────────────────────────────────────────────────

if __name__ == '__main__':
    app.run(debug=True, port=5000)
