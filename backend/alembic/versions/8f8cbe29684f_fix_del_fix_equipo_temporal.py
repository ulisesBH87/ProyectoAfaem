"""fix del fix equipo temporal

Revision ID: 8f8cbe29684f
Revises: 0d34a161686b
Create Date: 2026-03-26 15:41:38.344489

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '8f8cbe29684f'
down_revision: Union[str, Sequence[str], None] = '0d34a161686b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade():
    conn = op.get_bind()

    # eliminar posibles constraints viejos
    for fk_name in [
        'FK__EquipoTem__Solit__2BFE89A6',
        'FK__EquipoTem__Solit__09A971A2'
    ]:
        try:
            op.drop_constraint(fk_name, 'EquipoTemporal', type_='foreignkey')
        except Exception:
            pass

    # verificar si ya existe la FK nueva antes de crearla
    result = conn.execute(sa.text("""
        SELECT fk.name
        FROM sys.foreign_keys fk
        JOIN sys.tables t ON fk.parent_object_id = t.object_id
        WHERE fk.name = 'fk_equipo_temporal_solicitud'
        AND t.name = 'EquipoTemporal'
    """)).fetchone()

    if not result:
        op.create_foreign_key(
            'fk_equipo_temporal_solicitud',
            'EquipoTemporal',
            'Solicitudes',
            ['SolicitudId'],
            ['SolicitudId']
        )


def downgrade() -> None:
    """Downgrade schema."""
    try:
        op.drop_constraint('fk_equipo_temporal_solicitud', 'EquipoTemporal', type_='foreignkey')
    except Exception:
        pass