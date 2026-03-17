"""agregar rol invitado

Revision ID: 1eaf217238bb
Revises: c993b271323d
Create Date: 2026-03-17 16:17:03.333716

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '1eaf217238bb'
down_revision: Union[str, Sequence[str], None] = 'c993b271323d'
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
            {'RolId': 7, 'Nombre': 'INVITADO'}
        ]
    )

    op.execute('SET IDENTITY_INSERT "Roles" OFF')


def downgrade() -> None:
    """Downgrade schema."""
    op.execute(
        "DELETE FROM Roles WHERE RolId = 7"
    )
