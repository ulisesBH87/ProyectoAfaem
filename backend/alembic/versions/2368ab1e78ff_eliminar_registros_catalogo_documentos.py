"""eliminar registros catalogo documentos

Revision ID: 2368ab1e78ff
Revises: b7c8471c2be5
Create Date: 2026-03-06 11:18:20.907041

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '2368ab1e78ff'
down_revision: Union[str, Sequence[str], None] = 'b7c8471c2be5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.execute("""
        DELETE FROM CatalogoDocumentos
        WHERE DocumentoId IN (1,2,3,4,5,6,7,8)
    """)



def downgrade() -> None:
    """Downgrade schema."""
    op.execute("""
        DELETE FROM CatalogoDocumentos
        WHERE DocumentoId IN (1,2,3,4,5,6,7,8)
    """)

    op.execute("SET IDENTITY_INSERT CatalogoDocumentos ON")

    op.bulk_insert(
        catalogo_documentos,
        [
            {"DocumentoId": 1, "NombreDocumento": "Comprobante de pago", "Descripcion": "Comprobante de pago de afiliación", "TipoArchivoId": 1},
            {"DocumentoId": 2, "NombreDocumento": "INE", "Descripcion": "INE vigente", "TipoArchivoId": 1},
            {"DocumentoId": 3, "NombreDocumento": "CURP", "Descripcion": "CURP vigente", "TipoArchivoId": 1},
            {"DocumentoId": 4, "NombreDocumento": "Acta de nacimiento", "Descripcion": "Acta de nacimiento vigente", "TipoArchivoId": 1},
            {"DocumentoId": 5, "NombreDocumento": "Licencia de conducir", "Descripcion": "Licencia de conducir vigente", "TipoArchivoId": 1},
            {"DocumentoId": 6, "NombreDocumento": "Pasaporte", "Descripcion": "Pasaporte vigente", "TipoArchivoId": 1},
            {"DocumentoId": 7, "NombreDocumento": "Constancia de estudios", "Descripcion": "Constancia de estudios vigente", "TipoArchivoId": 1},
            {"DocumentoId": 8, "NombreDocumento": "Fotografia", "Descripcion": "Fotografía del afiliado", "TipoArchivoId": 1},
        ],
    )

    op.execute("SET IDENTITY_INSERT CatalogoDocumentos OFF")
