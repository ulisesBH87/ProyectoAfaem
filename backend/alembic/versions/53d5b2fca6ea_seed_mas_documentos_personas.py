"""seed mas documentos personas

Revision ID: 53d5b2fca6ea
Revises: 856f22a82d22
Create Date: 2026-03-11 12:29:05.710336

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '53d5b2fca6ea'
down_revision: Union[str, Sequence[str], None] = '856f22a82d22'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.execute('SET IDENTITY_INSERT "CatalogoDocumentosPersonas" ON')

    op.bulk_insert(
        sa.table(
            'CatalogoDocumentosPersonas',
            sa.column('DocumentosPersonasId', sa.Integer),
            sa.column('DocumentoId', sa.Integer),
            sa.column('RolPersonaId', sa.Integer)
        ),
        [
            {
                "DocumentosPersonasId": 3,
                "DocumentoId": 7,
                "RolPersonaId": 2
            },
            {
                "DocumentosPersonasId": 4,
                "DocumentoId": 8,
                "RolPersonaId": 4
            }
        ]
    )

    op.execute('SET IDENTITY_INSERT "CatalogoDocumentosPersonas" OFF')


def downgrade() -> None:
    """Downgrade schema."""
    op.execute(
        'DELETE FROM "CatalogoDocumentosPersonas" WHERE "DocumentosPersonasId" IN (3,4)'
    )
