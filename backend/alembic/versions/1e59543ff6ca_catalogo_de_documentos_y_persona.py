"""catalogo de documentos y persona

Revision ID: 1e59543ff6ca
Revises: 20d3ff32db5d
Create Date: 2026-03-06 13:12:57.716217

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '1e59543ff6ca'
down_revision: Union[str, Sequence[str], None] = '20d3ff32db5d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
