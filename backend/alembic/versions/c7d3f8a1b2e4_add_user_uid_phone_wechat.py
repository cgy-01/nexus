"""add user uid, phone, wechat fields

Revision ID: c7d3f8a1b2e4
Revises: 604b2cea5d51
Create Date: 2026-06-30
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "c7d3f8a1b2e4"
down_revision: Union[str, None] = "604b2cea5d51"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("uid", sa.String(20), nullable=True))
    op.add_column("users", sa.Column("phone", sa.String(20), nullable=True))
    op.add_column("users", sa.Column("wechat", sa.String(100), nullable=True))
    op.create_index(op.f("ix_users_uid"), "users", ["uid"], unique=True)


def downgrade() -> None:
    op.drop_index(op.f("ix_users_uid"), table_name="users")
    op.drop_column("users", "wechat")
    op.drop_column("users", "phone")
    op.drop_column("users", "uid")
