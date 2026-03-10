"""seed catalogo sexo

Revision ID: 893ffada9ea4
Revises: d1a2c0022ed8
Create Date: 2026-02-23 10:53:03.592306

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.sql import table, column


# revision identifiers, used by Alembic.
revision: str = '893ffada9ea4'
down_revision: Union[str, Sequence[str], None] = 'd1a2c0022ed8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    catalogo_sexo = table('CatalogoSexo',
        column('SexoId', sa.Integer),
        column('Nombre', sa.String(40))
    )
    op.bulk_insert(catalogo_sexo,
        [
            {'SexoId': 1, 'Nombre': 'Masculino'},
            {'SexoId': 2, 'Nombre': 'Femenino'},
            {'SexoId': 3, 'Nombre': 'No binario'}
        ]
    )


def downgrade():
    op.execute("DELETE FROM CatalogoSexo WHERE SexoId IN (1,2,3)")