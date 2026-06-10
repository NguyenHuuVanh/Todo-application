"""add_email_and_todo_indexes

Revision ID: b4f3c2d1e9a0
Revises: a0790c76a129
Create Date: 2026-06-10 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = "b4f3c2d1e9a0"
down_revision: Union[str, None] = "a0790c76a129"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_unique_constraint("uq_users_email", "users", ["email"])
    op.create_index("ix_users_email", "users", ["email"])
    op.create_index("ix_todos_user_created_id", "todos", ["user_id", "created_at", "id"])


def downgrade() -> None:
    op.drop_index("ix_todos_user_created_id", table_name="todos")
    op.drop_index("ix_users_email", table_name="users")
    op.drop_constraint("uq_users_email", "users", type_="unique")
