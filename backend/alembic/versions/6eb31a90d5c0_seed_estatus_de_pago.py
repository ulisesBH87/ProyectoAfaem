"""seed estatus de pago

Revision ID: 6eb31a90d5c0
Revises: 059e57ad67f6
Create Date: 2026-03-12 13:08:50.218154

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '6eb31a90d5c0'
down_revision: Union[str, Sequence[str], None] = '059e57ad67f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.execute('SET IDENTITY_INSERT "CatalogoEstatusPago" ON')

    op.bulk_insert(
        sa.table('CatalogoEstatusPago',
            sa.column('EstatusPagoId', sa.Integer),
            sa.column('Nombre', sa.String)
        ),
        [
            {'EstatusPagoId': 1, 'Nombre': 'EN ESPERA'},
            {'EstatusPagoId': 2, 'Nombre': 'RECHAZADO'},
            {'EstatusPagoId': 3, 'Nombre': 'APROBADO'}
        ]
    )

    op.execute('SET IDENTITY_INSERT "CatalogoEstatusPago" OFF')


def downgrade() -> None:
    """Downgrade schema."""
    op.execute("DELETE FROM CatalogoEstatusPago WHERE EstatusPagoId IN (1,2,3)")
