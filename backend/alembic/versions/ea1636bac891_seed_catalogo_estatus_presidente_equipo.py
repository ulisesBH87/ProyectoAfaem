"""seed catalogo estatus presidente equipo

Revision ID: ea1636bac891
Revises: 85e5ff03e6e4
Create Date: 2026-03-18 12:57:45.332613

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'ea1636bac891'
down_revision: Union[str, Sequence[str], None] = '85e5ff03e6e4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    catalogo_estatus_presi = sa.table('CatalogoEstatusPresidenteEquipo',
        sa.column('EstatusPresidenteId', sa.Integer),
        sa.column('Nombre', sa.String(100))
    )
    
    op.execute("SET IDENTITY_INSERT CatalogoEstatusPresidenteEquipo ON")
    
    op.bulk_insert(catalogo_estatus_presi,
        [
            {"EstatusPresidenteId": 1, "Nombre": "PAGO_PENDIENTE"},
            {"EstatusPresidenteId": 2, "Nombre": "PAGO_EN_REVISION"},
            {"EstatusPresidenteId": 3, "Nombre": "DOCUMENTOS_PENDIENTES"},
            {"EstatusPresidenteId": 4, "Nombre": "DOCUMENTOS_EN_REVISION"},
            {"EstatusPresidenteId": 5, "Nombre": "PRE_APROBADO"},
            {"EstatusPresidenteId": 6, "Nombre": "REGISTRO_PENDIENTE"},
            {"EstatusPresidenteId": 7, "Nombre": "ACTIVO"}
        ]
    )
    
    op.execute("SET IDENTITY_INSERT CatalogoEstatusPresidenteEquipo OFF")


def downgrade() -> None:
    """Downgrade schema."""
    op.execute("DELETE FROM CatalogoEstatusPresidenteEquipo WHERE EstatusPresidenteId IN (1, 2, 3, 4, 5, 6, 7)")
