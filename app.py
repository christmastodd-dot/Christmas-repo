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

app = Flask(__name__)
app.secret_key = os.environ.get('SECRET_KEY', 'dev-secret-change-me')

DATABASE = os.environ.get('DATABASE_PATH', 'fantasy_legislature.db')

login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'login'
login_manager.login_message_category = 'error'


# ── Database helpers ──────────────────────────────────────────────

def get_db():
    if 'db' not in g:
        g.db = sqlite3.connect(DATABASE)
        g.db.row_factory = sqlite3.Row
        g.db.execute('PRAGMA foreign_keys = ON')
    return g.db


@app.teardown_appcontext
def close_db(exc):
    db = g.pop('db', None)
    if db is not None:
        db.close()


def init_db():
    db = get_db()
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


with app.app_context():
    init_db()
    seed_admin()


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
    return render_template('my_team.html')


@app.route('/leaderboard')
@login_required
def leaderboard():
    return render_template('leaderboard.html')


@app.route('/feed')
@login_required
def feed():
    return render_template('feed.html')


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


# ── Run ───────────────────────────────────────────────────────────

if __name__ == '__main__':
    app.run(debug=True, port=5000)
