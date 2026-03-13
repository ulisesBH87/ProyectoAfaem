"""documentos de personas

Revision ID: b06f9acbff6e
Revises: 93131b7ab611
Create Date: 2026-03-06 13:23:09.213644

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b06f9acbff6e'
down_revision: Union[str, Sequence[str], None] = '93131b7ab611'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
