"""seed_rbac_data

Revision ID: d4d06fee09ff
Revises: 590f08aeb259
Create Date: 2026-03-24 11:34:47.122449

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd4d06fee09ff'
down_revision: Union[str, Sequence[str], None] = '590f08aeb259'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. SEED MENUS
    op.execute('SET IDENTITY_INSERT "Menus" ON')
    op.bulk_insert(
        sa.table('Menus',
            sa.column('MenuId', sa.Integer),
            sa.column('Nombre', sa.String),
            sa.column('Ruta', sa.String),
            sa.column('Icono', sa.String),
            sa.column('Orden', sa.Integer),
            sa.column('MenuPadreId', sa.Integer),
            sa.column('Estatus', sa.Boolean)
        ),
        [
            {"MenuId": 1, "Nombre": "Administración", "Ruta": None, "Icono": "FaShieldAlt", "Orden": 1, "MenuPadreId": None, "Estatus": True},
            {"MenuId": 2, "Nombre": "Tablero Principal", "Ruta": "/admin/dashboard", "Icono": "FaHome", "Orden": 1, "MenuPadreId": 1, "Estatus": True},
            {"MenuId": 3, "Nombre": "Validar Solicitudes", "Ruta": "/admin/solicitudes", "Icono": "FaClipboardList", "Orden": 2, "MenuPadreId": 1, "Estatus": True},
            {"MenuId": 4, "Nombre": "Validación de Pagos", "Ruta": "/admin/pagos", "Icono": "FaShieldAlt", "Orden": 3, "MenuPadreId": 1, "Estatus": True},
            
            {"MenuId": 5, "Nombre": "Mi Equipo", "Ruta": None, "Icono": "FaFootballBall", "Orden": 2, "MenuPadreId": None, "Estatus": True},
            {"MenuId": 6, "Nombre": "Inicio", "Ruta": "/presidente-equipo", "Icono": "FaHome", "Orden": 1, "MenuPadreId": 5, "Estatus": True},
            {"MenuId": 7, "Nombre": "Equipos", "Ruta": "/presidente-equipo/equipos", "Icono": "FaFootballBall", "Orden": 2, "MenuPadreId": 5, "Estatus": True},
            {"MenuId": 8, "Nombre": "Jugadores", "Ruta": "/presidente-equipo/mis-jugadores", "Icono": "FaUsers", "Orden": 3, "MenuPadreId": 5, "Estatus": True},
            {"MenuId": 9, "Nombre": "Solicitudes", "Ruta": "/presidente-equipo/solicitudes", "Icono": "FaClipboard", "Orden": 4, "MenuPadreId": 5, "Estatus": True},
        ]
    )
    op.execute('SET IDENTITY_INSERT "Menus" OFF')

    # 2. SEED RELACION MENU-ROL
    op.bulk_insert(
        sa.table('RelMenuRoles',
            sa.column('MenuId', sa.Integer),
            sa.column('RolId', sa.Integer),
            sa.column('Estatus', sa.Boolean)
        ),
        [
            {"MenuId": 1, "RolId": 1, "Estatus": True},
            {"MenuId": 2, "RolId": 1, "Estatus": True},
            {"MenuId": 3, "RolId": 1, "Estatus": True},
            {"MenuId": 4, "RolId": 1, "Estatus": True},
            
            {"MenuId": 5, "RolId": 1, "Estatus": True}, # Admin también tiene acceso a Mi Equipo para pruebas
            {"MenuId": 6, "RolId": 1, "Estatus": True},
            {"MenuId": 7, "RolId": 1, "Estatus": True},
            {"MenuId": 8, "RolId": 1, "Estatus": True},
            {"MenuId": 9, "RolId": 1, "Estatus": True},

            {"MenuId": 5, "RolId": 3, "Estatus": True},
            {"MenuId": 6, "RolId": 3, "Estatus": True},
            {"MenuId": 7, "RolId": 3, "Estatus": True},
            {"MenuId": 8, "RolId": 3, "Estatus": True},
            {"MenuId": 9, "RolId": 3, "Estatus": True},
        ]
    )

    # 3. MIGRAR USUARIOS EXISTENTES A RelUsuarioRoles
    op.execute("""
        INSERT INTO RelUsuarioRoles (UsuarioId, RolId, Estatus)
        SELECT UsuarioId, RolId, 1 FROM Usuarios
    """)


def downgrade() -> None:
    op.execute('DELETE FROM RelUsuarioRoles')
    op.execute('DELETE FROM RelMenuRoles')
    op.execute('DELETE FROM Menus')

