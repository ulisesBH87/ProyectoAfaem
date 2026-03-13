"""seed conceptos

Revision ID: 816e3bbc473b
Revises: 958a17e0ca9a
Create Date: 2026-03-12 13:22:50.419349

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '816e3bbc473b'
down_revision: Union[str, Sequence[str], None] = '958a17e0ca9a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.execute('SET IDENTITY_INSERT "CatalogoConceptos" ON')

    op.bulk_insert(
        sa.table('CatalogoConceptos',
            sa.column('ConceptoId', sa.Integer),
            sa.column('Nombre', sa.String)
        ),
        [
            {'ConceptoId': 1, 'Nombre': 'INSCRIPCION'},
            {'ConceptoId': 2, 'Nombre': 'SEGURO'}
        ]
    )

    op.execute('SET IDENTITY_INSERT "CatalogoConceptos" OFF')


def downgrade() -> None:
    """Downgrade schema."""
    op.execute("DELETE FROM CatalogoConceptos WHERE SeguroId IN (1,2)")
