"""seed roles de usuario

Revision ID: 70c03263d8f2
Revises: 4c3539bb083f
Create Date: 2026-03-11 14:35:23.616844

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '70c03263d8f2'
down_revision: Union[str, Sequence[str], None] = '4c3539bb083f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.execute('SET IDENTITY_INSERT "Roles" ON')

    op.bulk_insert(
        sa.table('Roles',
            sa.column('RolId', sa.Integer),
            sa.column('Nombre', sa.String)
        ),
        [
            {
                "RolId": 1,
                "Nombre": "ADMINISTRADOR"
            },
            {
                "RolId": 2,
                "Nombre": "PRESIDENTE_LIGA"
            },
            {
                "RolId": 3,
                "Nombre": "PRESIDENTE_EQUIPO"
            },
            {
                "RolId": 4,
                "Nombre": "ENTRENADOR"
            },
            {
                "RolId": 5,
                "Nombre": "JUGADOR"
            },
            {
                "RolId": 6,
                "Nombre": "TUTOR"
            }
        ]
    )

    op.execute('SET IDENTITY_INSERT "Roles" OFF')


def downgrade() -> None:
    """Downgrade schema."""
    op.execute('DELETE FROM "Roles" WHERE "RolId" IN (1, 2, 3, 4, 5, 6)')
