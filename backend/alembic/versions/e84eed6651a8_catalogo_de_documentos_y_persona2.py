"""catalogo de documentos y persona2

Revision ID: e84eed6651a8
Revises: 1e59543ff6ca
Create Date: 2026-03-06 13:13:21.669349

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e84eed6651a8'
down_revision: Union[str, Sequence[str], None] = '1e59543ff6ca'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
