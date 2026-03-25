"""agregar borrador a estados de validacion

Revision ID: f29bb17d6900
Revises: 9430dc58adbb
Create Date: 2026-03-24 11:16:39.602421

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f29bb17d6900'
down_revision: Union[str, Sequence[str], None] = '9430dc58adbb'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.execute('SET IDENTITY_INSERT CatalogoEstadosValidacion ON')
    op.execute("""
        INSERT INTO CatalogoEstadosValidacion (EstadoValidacionId, Nombre)
        VALUES (4, 'BORRADOR')
    """)

    op.execute('SET IDENTITY_INSERT "CatalogoEstadosValidacion" OFF')


def downgrade() -> None:
    """Downgrade schema."""
    op.execute("DELETE FROM CatalogoEstadosValidacion WHERE EstadoValidacionId = 4")
