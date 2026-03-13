"""insertar registros catalogo documentos

Revision ID: 761bec61e3b0
Revises: 2368ab1e78ff
Create Date: 2026-03-06 11:20:41.217303

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '761bec61e3b0'
down_revision: Union[str, Sequence[str], None] = '2368ab1e78ff'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.execute('SET IDENTITY_INSERT "CatalogoDocumentos" ON')

    op.bulk_insert(
        sa.table('CatalogoDocumentos',
            sa.column('DocumentoId', sa.Integer),
            sa.column('NombreDocumento', sa.String(100)),
            sa.column('Descripcion', sa.String(200)),
            sa.column('TipoArchivoId', sa.Integer),
            sa.column('TipoDocumentoId', sa.Integer)
        ),
        [
            {
                "DocumentoId": 1,
                "NombreDocumento": "Acta de nacimiento",
                "Descripcion": "Acta de nacimiento vigente",
                "TipoArchivoId": 1,
                "TipoDocumentoId": 3
            },
            {
                "DocumentoId": 2,
                "NombreDocumento": "Comprobante de pago",
                "Descripcion": "Comprobante de pago",
                "TipoArchivoId": 1,
                "TipoDocumentoId": 4
            },
            {
                "DocumentoId": 3,
                "NombreDocumento": "CURP",
                "Descripcion": "CURP vigente",
                "TipoArchivoId": 1,
                "TipoDocumentoId": 3
            },
            {
                "DocumentoId": 4,
                "NombreDocumento": "Fotografía infantil",
                "Descripcion": "Fotografía tamaño infantil",
                "TipoArchivoId": 1,
                "TipoDocumentoId": 1
            },
            {
                "DocumentoId": 5,
                "NombreDocumento": "INE",
                "Descripcion": "INE vigente",
                "TipoArchivoId": 1,
                "TipoDocumentoId": 2
            },
            {
                "DocumentoId": 6,
                "NombreDocumento": "Pasaporte",
                "Descripcion": "Pasaporte vigente",
                "TipoArchivoId": 1,
                "TipoDocumentoId": 2
            },
            {
                "DocumentoId": 7,
                "NombreDocumento": "Registro de directivo",
                "Descripcion": "Registro de directivo actual",
                "TipoArchivoId": 1,
                "TipoDocumentoId": 5
            },
            {
                "DocumentoId": 8,
                "NombreDocumento": "Registro de jugador",
                "Descripcion": "Registro de jugador actual",
                "TipoArchivoId": 1,
                "TipoDocumentoId": 5
            }

        ]
    )

    op.execute('SET IDENTITY_INSERT "CatalogoDocumentos" OFF')

def downgrade() -> None:
    """Downgrade schema."""
    op.execute('DELETE FROM "CatalogoDocumentos" WHERE "DocumentoId" IN (1, 2, 3, 4, 5, 6, 7, 8)')
