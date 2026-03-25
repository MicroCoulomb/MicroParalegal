"""SQLite schema for the temporary application database."""

DROP_USERS_TABLE_SQL = "DROP TABLE IF EXISTS users;"

CREATE_USERS_TABLE_SQL = """
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
"""
