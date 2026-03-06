"""insert tipo documento pago

Revision ID: 7721908d8b97
Revises: 82778414099b
Create Date: 2026-03-06 11:08:11.339627

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '7721908d8b97'
down_revision: Union[str, Sequence[str], None] = '82778414099b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.execute('SET IDENTITY_INSERT CatalogoTiposDocumento ON')
    op.execute("""
        INSERT INTO CatalogoTiposDocumento (TipoDocumentoId, Nombre)
        VALUES (4, 'Pago')
    """)

    op.execute('SET IDENTITY_INSERT CatalogoTiposDocumento OFF')

def downgrade() -> None:
    """Downgrade schema."""
    pass
