"""eliminar registros documentos afiliacion

Revision ID: 34b328a9f7b0
Revises: 530f2d1ce3f5
Create Date: 2026-03-06 15:14:55.918598

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '34b328a9f7b0'
down_revision: Union[str, Sequence[str], None] = '530f2d1ce3f5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    op.execute('DELETE FROM "DocumentoAfiliacion" WHERE "DocumentoAfiliacionId" IN (1, 2)')
