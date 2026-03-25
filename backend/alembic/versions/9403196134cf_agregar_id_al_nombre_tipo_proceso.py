"""agregar id al nombre tipo proceso

Revision ID: 9403196134cf
Revises: c77f109781ab
Create Date: 2026-03-20 14:15:03.722541

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '9403196134cf'
down_revision: Union[str, Sequence[str], None] = 'c77f109781ab'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        "EXEC sp_rename 'CatalogoTipoProceso.TipoProceso', 'TipoProcesoId', 'COLUMN'"
    )


def downgrade() -> None:
    op.execute(
        "EXEC sp_rename 'CatalogoTipoProceso.TipoProcesoId', 'TipoProceso', 'COLUMN'"
    )
