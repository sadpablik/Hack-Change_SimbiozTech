"""make pred_label and confidence nullable

Revision ID: 002
Revises: 001
Create Date: 2025-11-29 16:55:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "002"
down_revision: Union[str, None] = "001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Make pred_label and confidence nullable
    op.alter_column('text_analyses', 'pred_label',
                    existing_type=sa.Integer(),
                    nullable=True)
    op.alter_column('text_analyses', 'confidence',
                    existing_type=sa.Float(),
                    nullable=True)


def downgrade() -> None:
    # Revert to not nullable (but this will fail if there are NULL values)
    op.alter_column('text_analyses', 'pred_label',
                    existing_type=sa.Integer(),
                    nullable=False)
    op.alter_column('text_analyses', 'confidence',
                    existing_type=sa.Float(),
                    nullable=False)



