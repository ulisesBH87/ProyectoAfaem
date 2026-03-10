"""seed de cat documentos personas

Revision ID: 3444ad96bbb5
Revises: 2b45b6ee2554
Create Date: 2026-03-06 13:49:00.939239

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '3444ad96bbb5'
down_revision: Union[str, Sequence[str], None] = '2b45b6ee2554'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.execute('SET IDENTITY_INSERT "CatalogoDocumentosPersonas" ON')
    
    op.bulk_insert(
        sa.table('CatalogoDocumentosPersonas',
            sa.column('DocumentosPersonasId', sa.Integer),
            sa.column('DocumentoId', sa.Integer),
            sa.column('RolPersonaId', sa.Integer)
        ),
        [
            {
                "DocumentosPersonasId": 1,
                "DocumentoId": 3, #CURP
                "RolPersonaId": 2 #PRESIDENTE DE EQUPIPO
            },
            {
                "DocumentosPersonasId": 2,
                "DocumentoId": 5, #INE
                "RolPersonaId": 2 #PRESIDENTE DE EQUIPO
            }
        ]
    )

    op.execute('SET IDENTITY_INSERT "CatalogoDocumentosPersonas" OFF')


def downgrade() -> None:
    """Downgrade schema."""
    op.execute('DELETE FROM "CatalogoDocumentosPersonas" WHERE "DocumentosPersonasId" IN (1, 2)')
