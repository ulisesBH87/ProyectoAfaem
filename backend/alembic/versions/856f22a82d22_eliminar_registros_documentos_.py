"""eliminar registros documentos afiliacion2

Revision ID: 856f22a82d22
Revises: 34b328a9f7b0
Create Date: 2026-03-06 15:47:32.068913

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '856f22a82d22'
down_revision: Union[str, Sequence[str], None] = '34b328a9f7b0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.execute('DELETE FROM "DocumentoAfiliacion" WHERE "DocumentoAfiliacionId" IN (1, 2)')


def downgrade() -> None:
    """Downgrade schema."""
    pass
