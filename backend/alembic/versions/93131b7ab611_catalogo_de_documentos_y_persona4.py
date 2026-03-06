"""catalogo de documentos y persona4

Revision ID: 93131b7ab611
Revises: 0ce84e421eed
Create Date: 2026-03-06 13:17:31.955746

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '93131b7ab611'
down_revision: Union[str, Sequence[str], None] = '0ce84e421eed'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
