"""seed catalogo de seguros

Revision ID: 958a17e0ca9a
Revises: 6eb31a90d5c0
Create Date: 2026-03-12 13:14:30.587977

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '958a17e0ca9a'
down_revision: Union[str, Sequence[str], None] = '6eb31a90d5c0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.execute('SET IDENTITY_INSERT "CatalogoSeguros" ON')

    op.bulk_insert(
        sa.table('CatalogoSeguros',
            sa.column('SeguroId', sa.Integer),
            sa.column('Nombre', sa.String),
            sa.column('Activo', sa.Boolean),
            sa.column('Precio', sa.DECIMAL)
        ),
        [
            {'SeguroId': 1, 'Nombre': 'BASICO', 'Activo': True, 'Precio': 199.99},
            {'SeguroId': 2, 'Nombre': 'INTERMEDIO', 'Activo': True, 'Precio': 249.99},
            {'SeguroId': 3, 'Nombre': 'COMPLETO', 'Activo': True, 'Precio': 300.00}
        ]
    )

    op.execute('SET IDENTITY_INSERT "CatalogoSeguros" OFF')


def downgrade() -> None:
    """Downgrade schema."""
    op.execute("DELETE FROM CatalogoSeguros WHERE SeguroId IN (1,2,3)")
