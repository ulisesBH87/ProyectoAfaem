# Alembic - Migraciones de Base de Datos

# ¿Qué es Alembic?

Alembic es una herramienta de migración de bases de datos para SQLAlchemy. Permite versionar los cambios en el esquema de la base de datos de forma controlada.

# Configuración

Este directorio contiene la configuración genérica para una base de datos única.

# Estructura

```
alembic/
├── README              # Este archivo
├── script.py.mako      # Template para generar migraciones
├── versions/           # Archivos de migración
│   ├── 61de96ad8607_seed_estados_validacion.py
│   ├── 893ffada9ea4_seed_catalogo_sexo.py
│   ├── ceef1ee79e95_solicitudes.py
│   ├── d1a2c0022ed8_initial_migration.py
│   └── ee05824d04cb_crearsolicitudes.py
├── alembic.ini         # Configuración
└── env.py              # Entorno de ejecución
```

# Migraciones Disponibles

1. **d1a2c0022ed8_initial_migration.py** - Migración inicial del esquema
2. **ceef1ee79e95_solicitudes.py** - Tabla de solicitudes
3. **ee05824d04cb_crearsolicitudes.py** - Creación adicional de solicitudes
4. **893ffada9ea4_seed_catalogo_sexo.py** - Datos iniciales de sexo
5. **61de96ad8607_seed_estados_validacion.py** - Datos iniciales de estados

# Cómo Usar

# Crear una Nueva Migración

```bash
alembic revision --autogenerate -m "Descripción del cambio"
```

# Aplicar Migraciones

```bash
alembic upgrade head
```

# Revertir a una Migración Anterior

```bash
alembic downgrade -1
```

# Ver el Historial

```bash
alembic history
```

# Ver la Versión Actual

```bash
alembic current
```

# Configuración de Conexión

La conexión a la base de datos se configura en alembic.ini:

```ini
sqlalchemy.url = driver://user:pass@localhost:port/database
```

# Relación con Models

Las migraciones automáticas se generan a partir de los modelos de SQLAlchemy definidos en app/modelos/

# Más Información

Consulta la documentación oficial de Alembic: https://alembic.sqlalchemy.org/
