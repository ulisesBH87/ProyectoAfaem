"""arreglar conflicto con equipo temporal

Revision ID: 8051733fcdcc
Revises: 8f8cbe29684f
Create Date: 2026-03-27 09:19:28.906878

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '8051733fcdcc'
down_revision: Union[str, Sequence[str], None] = '8f8cbe29684f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade():
    op.execute("""
        DECLARE @fk_name NVARCHAR(255)

        SELECT @fk_name = fk.name
        FROM sys.foreign_keys fk
        JOIN sys.foreign_key_columns fkc ON fk.object_id = fkc.constraint_object_id
        JOIN sys.columns c ON fkc.parent_column_id = c.column_id 
            AND fkc.parent_object_id = c.object_id
        JOIN sys.tables t ON fk.parent_object_id = t.object_id
        WHERE t.name = 'EquipoTemporal'
        AND c.name = 'SolicitudId'

        IF @fk_name IS NOT NULL
            EXEC('ALTER TABLE EquipoTemporal DROP CONSTRAINT ' + @fk_name)
    """)

    op.create_foreign_key(
        'fk_equipo_temporal_solicitud',
        'EquipoTemporal',
        'Solicitudes',
        ['SolicitudId'],
        ['SolicitudId']
    )


def downgrade():
    op.drop_constraint(
        'fk_equipo_temporal_solicitud',
        'EquipoTemporal',
        type_='foreignkey'
    )