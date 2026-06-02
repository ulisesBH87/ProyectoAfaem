import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.conexion import engine
from sqlalchemy import text

def migrate():
    print("=" * 60)
    print("Iniciando migración de Base de Datos (SQL Server)...")
    print("=" * 60)

    # Definir sentencias SQL
    sql_ligas = """
    -- 1. Agregar columnas a la tabla Ligas si no existen
    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[Ligas]') AND name = 'ModalidadId')
    BEGIN
        ALTER TABLE [dbo].[Ligas] ADD [ModalidadId] INT NULL;
        ALTER TABLE [dbo].[Ligas] ADD CONSTRAINT [FK_Ligas_CatalogoModalidad] FOREIGN KEY ([ModalidadId]) REFERENCES [dbo].[CatalogoModalidad] ([ModalidadId]);
        PRINT 'Columna ModalidadId y FK agregadas a Ligas.';
    END
    ELSE
        PRINT 'Columna ModalidadId ya existe en Ligas.';

    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[Ligas]') AND name = 'CategoriaId')
    BEGIN
        ALTER TABLE [dbo].[Ligas] ADD [CategoriaId] INT NULL;
        ALTER TABLE [dbo].[Ligas] ADD CONSTRAINT [FK_Ligas_CatalogoCategorias] FOREIGN KEY ([CategoriaId]) REFERENCES [dbo].[CatalogoCategorias] ([CategoriaId]);
        PRINT 'Columna CategoriaId y FK agregadas a Ligas.';
    END
    ELSE
        PRINT 'Columna CategoriaId ya existe en Ligas.';

    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[Ligas]') AND name = 'RamaId')
    BEGIN
        ALTER TABLE [dbo].[Ligas] ADD [RamaId] INT NULL;
        ALTER TABLE [dbo].[Ligas] ADD CONSTRAINT [FK_Ligas_CatalogoRamas] FOREIGN KEY ([RamaId]) REFERENCES [dbo].[CatalogoRamas] ([RamaId]);
        PRINT 'Columna RamaId y FK agregadas a Ligas.';
    END
    ELSE
        PRINT 'Columna RamaId ya existe en Ligas.';
    """

    sql_equipos_jugando = """
    -- 2. Eliminar llaves foráneas y columnas obsoletas en EquiposJugando
    DECLARE @sql NVARCHAR(MAX) = N'';
    SELECT @sql += N'ALTER TABLE [dbo].[EquiposJugando] DROP CONSTRAINT [' + name + N'];' + CHAR(13)
    FROM sys.foreign_keys
    WHERE parent_object_id = OBJECT_ID(N'[dbo].[EquiposJugando]')
      AND referenced_object_id IN (
        OBJECT_ID(N'[dbo].[CatalogoCategorias]'),
        OBJECT_ID(N'[dbo].[CatalogoModalidad]'),
        OBJECT_ID(N'[dbo].[CatalogoRamas]')
      );
    
    IF @sql <> ''
    BEGIN
        EXEC sp_executesql @sql;
        PRINT 'Llaves foráneas eliminadas de EquiposJugando.';
    END
    ELSE
        PRINT 'No se encontraron llaves foráneas antiguas en EquiposJugando.';

    IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[EquiposJugando]') AND name = 'CategoriaId')
    BEGIN
        ALTER TABLE [dbo].[EquiposJugando] DROP COLUMN [CategoriaId];
        PRINT 'Columna CategoriaId eliminada de EquiposJugando.';
    END
    IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[EquiposJugando]') AND name = 'ModalidadId')
    BEGIN
        ALTER TABLE [dbo].[EquiposJugando] DROP COLUMN [ModalidadId];
        PRINT 'Columna ModalidadId eliminada de EquiposJugando.';
    END
    IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[EquiposJugando]') AND name = 'RamaId')
    BEGIN
        ALTER TABLE [dbo].[EquiposJugando] DROP COLUMN [RamaId];
        PRINT 'Columna RamaId eliminada de EquiposJugando.';
    END
    """

    sql_equipo_temporal = """
    -- 3. Agregar NombreEquipo y LigaId a EquipoTemporal si no existen
    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[EquipoTemporal]') AND name = 'NombreEquipo')
    BEGIN
        ALTER TABLE [dbo].[EquipoTemporal] ADD [NombreEquipo] NVARCHAR(150) NULL;
        PRINT 'Columna NombreEquipo agregada a EquipoTemporal.';
    END
    ELSE
        PRINT 'Columna NombreEquipo ya existe en EquipoTemporal.';

    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[EquipoTemporal]') AND name = 'LigaId')
    BEGIN
        ALTER TABLE [dbo].[EquipoTemporal] ADD [LigaId] INT NULL;
        ALTER TABLE [dbo].[EquipoTemporal] ADD CONSTRAINT [FK_EquipoTemporal_Ligas] FOREIGN KEY ([LigaId]) REFERENCES [dbo].[Ligas] ([LigaId]);
        PRINT 'Columna LigaId y FK agregadas a EquipoTemporal.';
    END
    ELSE
        PRINT 'Columna LigaId ya existe en EquipoTemporal.';
    """

    try:
        with engine.begin() as conn:
            print("Ejecutando cambios en la tabla Ligas...")
            conn.execute(text(sql_ligas))
            print("Ejecutando cambios en la tabla EquiposJugando...")
            conn.execute(text(sql_equipos_jugando))
            print("Ejecutando cambios en la tabla EquipoTemporal...")
            conn.execute(text(sql_equipo_temporal))
        print("=" * 60)
        print("Migración completada exitosamente.")
        print("=" * 60)
    except Exception as e:
        print(f"ERROR durante la migración: {str(e)}")
        raise e

if __name__ == "__main__":
    migrate()
