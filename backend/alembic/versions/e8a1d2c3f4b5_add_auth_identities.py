"""add auth identities for verified login providers

Revision ID: e8a1d2c3f4b5
Revises: c7d3f8a1b2e4
Create Date: 2026-07-10
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "e8a1d2c3f4b5"
down_revision: Union[str, None] = "c7d3f8a1b2e4"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column("users", "email", existing_type=sa.String(255), nullable=True)
    op.alter_column("users", "hashed_password", existing_type=sa.String(255), nullable=True)
    op.create_table(
        "auth_identities",
        sa.Column("user_id", sa.UUID(), nullable=False),
        sa.Column("provider", sa.String(length=32), nullable=False),
        sa.Column("subject", sa.String(length=255), nullable=False),
        sa.Column("id", sa.UUID(), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("provider", "subject", name="uq_auth_identities_provider_subject"),
    )
    op.create_index(op.f("ix_auth_identities_user_id"), "auth_identities", ["user_id"], unique=False)
    op.execute(
        """
        INSERT INTO auth_identities (user_id, provider, subject)
        SELECT id, 'email', lower(email)
        FROM users
        WHERE email IS NOT NULL
        """
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_auth_identities_user_id"), table_name="auth_identities")
    op.drop_table("auth_identities")
    op.alter_column("users", "hashed_password", existing_type=sa.String(255), nullable=False)
    op.alter_column("users", "email", existing_type=sa.String(255), nullable=False)
