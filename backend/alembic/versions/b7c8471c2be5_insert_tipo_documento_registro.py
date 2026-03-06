"""insert tipo documento REGISTRO

Revision ID: b7c8471c2be5
Revises: 7721908d8b97
Create Date: 2026-03-06 11:13:53.811155

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b7c8471c2be5'
down_revision: Union[str, Sequence[str], None] = '7721908d8b97'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.execute('SET IDENTITY_INSERT CatalogoTiposDocumento ON')

    op.execute("""
        INSERT INTO CatalogoTiposDocumento (TipoDocumentoId, Nombre)
        VALUES (5, 'Registros')
    """)

    op.execute('SET IDENTITY_INSERT CatalogoTiposDocumento OFF')
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
