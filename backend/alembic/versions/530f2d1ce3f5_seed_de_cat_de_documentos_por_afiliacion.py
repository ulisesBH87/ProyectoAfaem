"""seed de cat de documentos por afiliacion

Revision ID: 530f2d1ce3f5
Revises: 3444ad96bbb5
Create Date: 2026-03-06 13:56:26.442940

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '530f2d1ce3f5'
down_revision: Union[str, Sequence[str], None] = '3444ad96bbb5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.execute('SET IDENTITY_INSERT "DocumentoAfiliacion" ON')

    op.bulk_insert(
        sa.table('DocumentoAfiliacion',
            sa.column('DocumentoAfiliacionId', sa.Integer),
            sa.column('TipoAfiliacionId', sa.Integer),
            sa.column('DocumentoPersonaId', sa.Integer)
        ),
        [
            {
                "DocumentoAfiliacionId": 1,
                "TipoAfiliacionId": 2, #Afiliación para presidente de equipo
                "DocumentoPersonaId": 1 #CURP de presidente
            },
            {
                "DocumentoAfiliacionId": 2,
                "TipoAfiliacionId": 2, #Afiliacion para presidente de equipo
                "DocumentoPersonaId": 2 #INE de presidente de equipo
            }
        ]
    )

    op.execute('SET IDENTITY_INSERT "DocumentoAfiliacion" OFF')


def downgrade() -> None:
    """Downgrade schema."""
    op.execute('DELETE FROM "DocumentoAfiliacion" WHERE "DocumentoAfiliacionId" IN (1, 2)')
