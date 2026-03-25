"""mezclar migraciones head

Revision ID: 4ce415f513a2
Revises: 5ca4987a6207, d4d06fee09ff
Create Date: 2026-03-25 13:26:25.708008

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '4ce415f513a2'
down_revision: Union[str, Sequence[str], None] = ('5ca4987a6207', 'd4d06fee09ff')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
