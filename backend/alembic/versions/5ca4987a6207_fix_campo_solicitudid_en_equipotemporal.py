from alembic import op
import sqlalchemy as sa


def upgrade():
    conn = op.get_bind()

    # 1. agregar nueva columna
    op.add_column('EquipoTemporal', sa.Column('SolicitudId', sa.Integer(), nullable=True))

    # 2. eliminar FK vieja (solo la que apunta a Solicitudes)
    result = conn.execute(sa.text("""
        SELECT fk.name
        FROM sys.foreign_keys fk
        JOIN sys.tables t ON fk.parent_object_id = t.object_id
        WHERE t.name = 'EquipoTemporal'
          AND fk.referenced_object_id = OBJECT_ID('Solicitudes')
    """)).fetchall()

    for row in result:
        try:
            op.drop_constraint(row[0], 'EquipoTemporal', type_='foreignkey')
        except Exception:
            pass

    # 3. crear FK nueva
    op.create_foreign_key(
        'fk_equipo_temporal_solicitud',
        'EquipoTemporal',
        'Solicitudes',
        ['SolicitudId'],
        ['SolicitudId']
    )

    # 4. eliminar columna vieja
    op.drop_column('EquipoTemporal', 'SolititudId')


def downgrade():
    try:
        op.drop_constraint('fk_equipo_temporal_solicitud', 'EquipoTemporal', type_='foreignkey')
    except Exception:
        pass

    op.add_column('EquipoTemporal', sa.Column('SolititudId', sa.Integer(), nullable=True))