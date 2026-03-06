"""seed catalogo roles persona

Revision ID: 20d3ff32db5d
Revises: 761bec61e3b0
Create Date: 2026-03-06 13:04:24.167518

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '20d3ff32db5d'
down_revision: Union[str, Sequence[str], None] = '761bec61e3b0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.execute('SET IDENTITY_INSERT "CatalogoRolesPersonas" ON')

    op.bulk_insert(
        sa.table('CatalogoRolesPersonas',
            sa.column('RolPersonaId', sa.Integer),
            sa.column('Nombre', sa.String)
        ),
        [
            {'RolPersonaId': 1, 'Nombre': 'PRESIDENTE DE LIGA'},
            {'RolPersonaId': 2, 'Nombre': 'PRESIDENTE DE EQUIPO'},
            {'RolPersonaId': 3, 'Nombre': 'ENTRENADOR'},
            {'RolPersonaId': 4, 'Nombre': 'JUGADOR MAYOR'},
            {'RolPersonaId': 5, 'Nombre': 'JUGADOR MENOR'},
            {'RolPersonaId': 6, 'Nombre': 'TUTOR'}
        ]
    )

    op.execute('SET IDENTITY_INSERT "CatalogoRolesPersonas" OFF')


def downgrade() -> None:
    """Downgrade schema."""
    op.execute("DELETE FROM CatalogoRolesPersonas WHERE RolPersonaId IN (1,2,3,4,5,6)")
