"""seed catalogo tipos proceso equipo temporal

Revision ID: c77f109781ab
Revises: b299d7898b32
Create Date: 2026-03-20 14:11:29.509470

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c77f109781ab'
down_revision: Union[str, Sequence[str], None] = 'b299d7898b32'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
