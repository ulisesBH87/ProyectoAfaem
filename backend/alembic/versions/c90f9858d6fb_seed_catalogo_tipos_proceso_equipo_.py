"""seed catalogo tipos proceso equipo temporal 2

Revision ID: c90f9858d6fb
Revises: 9403196134cf
Create Date: 2026-03-20 14:22:49.346945

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c90f9858d6fb'
down_revision: Union[str, Sequence[str], None] = '9403196134cf'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.execute('SET IDENTITY_INSERT "CatalogoTipoProceso" ON')

    op.bulk_insert(
        sa.table('CatalogoTipoProceso',
            sa.column('TipoProcesoId', sa.Integer),
            sa.column('Nombre', sa.String(100))
        ),
        [
            {"TipoProcesoId": 1, "Nombre": "REGISTRO INICIAL"},
            {"TipoProcesoId": 2, "Nombre": "AMPLIACION"}
        ]
    )

    op.execute('SET IDENTITY_INSERT "CatalogoTipoProceso" OFF')


def downgrade() -> None:
    """Downgrade schema."""
    op.execute("DELETE FROM CatalogoTipoProceso WHERE TipoProcesoId IN (1, 2)")

