"""merge heads

Revision ID: 0d34a161686b
Revises: 2d50971265ec, 4ce415f513a2
Create Date: 2026-03-26 15:14:30.397029

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0d34a161686b'
down_revision: Union[str, Sequence[str], None] = ('2d50971265ec', '4ce415f513a2')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
