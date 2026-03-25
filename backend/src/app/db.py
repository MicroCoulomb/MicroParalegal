"""Database bootstrap helpers."""

from __future__ import annotations

import sqlite3

from app.config import DATA_DIR, DATABASE_PATH
from app.schema import CREATE_USERS_TABLE_SQL, DROP_USERS_TABLE_SQL


def reset_database() -> None:
    """Recreate the temporary SQLite database from scratch."""
    DATA_DIR.mkdir(parents=True, exist_ok=True)

    with sqlite3.connect(DATABASE_PATH) as connection:
        connection.execute(DROP_USERS_TABLE_SQL)
        connection.execute(CREATE_USERS_TABLE_SQL)
        connection.commit()
