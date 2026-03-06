"""catalogo de documentos y persona3

Revision ID: 0ce84e421eed
Revises: e84eed6651a8
Create Date: 2026-03-06 13:16:24.825022

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0ce84e421eed'
down_revision: Union[str, Sequence[str], None] = 'e84eed6651a8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
