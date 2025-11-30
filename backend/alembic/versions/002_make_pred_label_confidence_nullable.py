from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "002"
down_revision: Union[str, None] = "001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column('text_analyses', 'pred_label',
                    existing_type=sa.Integer(),
                    nullable=True)
    op.alter_column('text_analyses', 'confidence',
                    existing_type=sa.Float(),
                    nullable=True)


def downgrade() -> None:
    op.alter_column('text_analyses', 'pred_label',
                    existing_type=sa.Integer(),
                    nullable=False)
    op.alter_column('text_analyses', 'confidence',
                    existing_type=sa.Float(),
                    nullable=False)




