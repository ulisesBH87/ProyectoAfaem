# MODELO DE DATOS Y ESTRUCTURA DE BASE DE DATOS

# Base de Datos: SQL Server

El proyecto usa SQL Server para persistencia de datos mediante la conexión ODBC con SQLAlchemy comme ORM.

# Tablas Principales

```
BASE DE DATOS
│
├─ Usuarios              # Información de usuarios
├─ Solicitudes           # Solicitudes de inscripción
├─ CatalogoSexo          # Catálogo de géneros
└─ CatalogoEstadosValidacion  # Estados de solicitudes
```

# 1. TABLA: Usuarios

**Archivo:** [app/modelos/usuario_modelo.py]

# Estructura

```
Usuarios
├─ PK: UsuarioId                  (Integer, Auto-increment)
├─ Nombre                         (String 50, Requerido)
├─ PrimerApellido                 (String 50, Requerido)
├─ SegundoApellido                (String 50, Opcional)
├─ CURP                           (Char 18, Único, Opcional)
├─ RFC                            (Char 13, Único, Opcional)
├─ NUI                            (String 60, Único, Opcional)
├─ FK: SexoId                    → CatalogoSexo (Integer, Opcional)
├─ FechaNacimiento                (Date, Opcional)
├─ Correo                         (String 100, Único, Requerido)
├─ Contrasena                     (String 256, Requerido) [HASH]
└─ Salt                           (String, Requerido)
```

# Relaciones

```
Usuarios
  ├─ 1:N → Solicitudes     (un usuario puede tener muchas solicitudes)
  └─ N:1 → CatalogoSexo   (muchos usuarios de un sexo)
```

# Ejemplos de Registros

```sql
INSERT INTO Usuarios 
(Nombre, PrimerApellido, SegundoApellido, Correo, Contrasena, Salt)
VALUES
('Juan', 'Pérez', 'García', 'juan@example.com', 'a1b2c3d4e5f6...', 'x7y8z9a0')
('María', 'López', 'Martínez', 'maria@example.com', 'f7g8h9i0j1k2...', 'm3n4p5q6')
```

# Contraseñas

Las contraseñas NUNCA se guardan en texto plano:
- Se hashean con SHA256
- Se combina con un SALT único por usuario
- Al verificar, se rehashea y compara

```python
# Cuando no se guarda la contraseña
password_original = "MiPassword123"
salt = "a1b2c3d4e5f6g7h8"

# Lo que se guarda
hash_guardado = SHA256(salt + password_original)
# Resultado: "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0"

# Al verificar
password_ingresada = "MiPassword123"
hash_nuevo = SHA256(salt + password_ingresada)

# Compara
if hash_nuevo == hash_guardado:
    print("Contraseña correcta")
else:
    print("Contraseña incorrecta")
```

# 2. TABLA: Solicitudes

**Archivo:** [app/modelos/solicitud_modelo.py]

# Estructura

```
Solicitudes
├─ PK: SolicitudId                (Integer, Auto-increment)
├─ FK: UsuarioId      → Usuarios (Integer, Requerido)
├─ FechaSolicitud                 (DateTime, Requerido)
├─ ObservacionesSolicitud         (String 500, Opcional)
└─ FK: EstatusValidacion → CatalogoEstadosValidacion (Integer, Requerido)
```

# Relaciones

```
Solicitudes
  ├─ N:1 → Usuarios                (cada solicitud pertenece a un usuario)
  └─ N:1 → CatalogoEstadosValidacion (cada solicitud tiene un estado)
```
# Ejemplos de Registros

```sql
INSERT INTO Solicitudes 
(UsuarioId, FechaSolicitud, EstatusValidacion, ObservacionesSolicitud)
VALUES
(1, '2026-02-20 10:30:00', 2, 'Aprobado'),
(2, '2026-02-21 14:15:00', 1, 'Pendiente revisión')
```

# 3. TABLA: CatalogoSexo

**Archivo:** [app/modelos/sexo_c_modelo.py]

# Estructura (Catálogo)

```
CatalogoSexo
├─ PK: SexoId            (Integer)
└─ SexoDescripcion       (String)
```

# Valores Típicos

```
SexoId | SexoDescripcion
-------|----------------
1      | Masculino
2      | Femenino
3      | Otro
```

# 4. TABLA: CatalogoEstadosValidacion

**Archivo:** [app/modelos/catalogo_estado_validacion.py]

# Estructura (Catálogo)

```
CatalogoEstadosValidacion
├─ PK: EstadoValidacionId    (Integer)
└─ EstadoValidacionDescripcion (String)
```

# Valores Típicos

```
EstadoValidacionId | EstadoValidacionDescripcion
-------------------|---------------------------
1                  | Pendiente
2                  | Aprobado
3                  | Rechazado
4                  | En Revisión
```

## Relaciones Entre Tablas

```
┌──────────────────────────────────────────────────────┐
│                    Usuarios                          │
│  ┌─────────────────────────────────────────────────┐ │
│  │ UsuarioId (PK)                                  │ │
│  │ Nombre                                          │ │
│  │ Correo (Unique)                                 │ │
│  │ SexoId (FK) ────────────┐                       │ │
│  └─────────────────────────┼───────────────────────┘ │
│                            │                         │
└────────────────────────────┼─────────────────────────┘
                             │ 1:N
                             │
                    ┌────────▼────────┐
                    │ CatalogoSexo    │
                    ├─────────────────┤
                    │ SexoId (PK)     │
                    │ Descripción     │
                    └─────────────────┘

┌──────────────────────────────────────────────────────┐
│                  Solicitudes                         │
│  ┌─────────────────────────────────────────────────┐ │
│  │ SolicitudId (PK)                                │ │
│  │ UsuarioId (FK) -──────────────┐                 │ │
│  │ FechaSolicitud                │                 │ │
│  │ EstatusValidacion (FK)   ──┐  │                 │ │
│  └────────────────────────────┼──┼─────────────────┘ │
│                               │  │                   │
└───────────────────────────────┼──┼───────────────────┘
                                │  │ 1:N
                          N:1   │  │
                ┌───────────────▼┐ │
                │  Usuarios      │ │
                │  (referencia)  │ │
                └────────────────┘ │
                                   │
              ┌─────────────────────▼──────────────┐
              │ CatalogoEstadosValidacion          │
              ├────────────────────────────────────┤
              │ EstadoValidacionId (PK)            │
              │ EstadoValidacionDescripcion        │
              └────────────────────────────────────┘
```

# Validaciones en la Base de Datos

# CURP
- Longitud exacta: 18 caracteres
- Constraint: `CHECK(LEN(CURP) = 18)`

# RFC
- Longitud exacta: 13 caracteres
- Constraint: `CHECK(LEN(RFC) = 13)`

# Correo
- Debe ser único en la tabla
- Constraint: `UNIQUE(Correo)`

# UsuarioId (en Solicitudes)
- Debe existir en Usuarios
- Constraint: `FOREIGN KEY(UsuarioId) REFERENCES Usuarios(UsuarioId)`

# Flujo de Datos: Crear Solicitud

```
FRONTEND envia:
{
    CURP: "SAIB000505HDFMNN09",
    RFC: "SAIB000505ABC",
    SexoId: 1,
    FechaNacimiento: "2000-05-05",
    FechaSolicitud: "2026-02-20T10:30:00",
    EstatusValidacion: 2
}

BACKEND recibe:
├─ Valida con Pydantic schema (SolicitudCrear)
│  ├─ Verifica tipos de datos
│  ├─ Verifica que no sean nulos los requeridos
│  └─ Valida formato de fechas
│
├─ Crea objeto Solicitud
│  └─ solicitud = Solicitud(
│         UsuarioId=usuario.UsuarioId,
│         FechaSolicitud=data.FechaSolicitud,
│         EstatusValidacion=2
│     )
│
├─ Actualiza datos del usuario
│  └─ usuario.CURP = data.CURP
│     usuario.RFC = data.RFC
│     usuario.SexoId = data.SexoId
│     usuario.FechaNacimiento = data.FechaNacimiento
│
├─ Valida en la BD
│  ├─ CURP longitud = 18? ✓
│  ├─ RFC longitud = 13? ✓
│  ├─ SexoId existe en CatalogoSexo? ✓
│  ├─ EstatusValidacion existe? ✓
│  └─ UsuarioId existe? ✓ (del JWT)
│
└─ Inserta en BD
   INSERT INTO Solicitudes (UsuarioId, FechaSolicitud, EstatusValidacion)
   VALUES (123, '2026-02-20 10:30:00', 2)
   
   UPDATE Usuarios SET CURP='...', RFC='...', ...
   WHERE UsuarioId = 123
```

# Consultas SQL Útiles

# Obtener usuario con sus solicitudes

```sql
SELECT 
    u.UsuarioId,
    u.Nombre,
    u.Correo,
    s.SolicitudId,
    s.FechaSolicitud,
    csv.EstadoValidacionDescripcion
FROM Usuarios u
LEFT JOIN Solicitudes s ON u.UsuarioId = s.UsuarioId
LEFT JOIN CatalogoEstadosValidacion csv ON s.EstatusValidacion = csv.EstadoValidacionId
WHERE u.UsuarioId = 123
```

# Contar solicitudes por estado

```sql
SELECT 
    csv.EstadoValidacionDescripcion,
    COUNT(*) as cantidad
FROM Solicitudes s
JOIN CatalogoEstadosValidacion csv ON s.EstatusValidacion = csv.EstadoValidacionId
GROUP BY csv.EstadoValidacionDescripcion
```

# Encontrar usuario por correo

```sql
SELECT * FROM Usuarios WHERE Correo = 'juan@example.com'
```

# Esquemas de Validación (Pydantic)

# RegistroUsuario
```python
class RegistroUsuario(BaseModel):
    Nombre: str              # Requerido
    PrimerApellido: str      # Requerido
    SegundoApellido: str     # Opcional
    Correo: EmailStr         # Email válido
    Contrasena: str          # Requerido
```

# SolicitudCrear
```python
class SolicitudCrear(BaseModel):
    UsuarioId: int
    FechaSolicitud: datetime
    EstatusValidacion: int
    CURP: str                # 18 caracteres
    RFC: str                 # 13 caracteres
    SexoId: int
    FechaNacimiento: date
```

# Migraciones

Las migraciones se manejan con **Alembic**:

```
alembic/
├── versions/
│   ├── d1a2c0022ed8_initial_migration.py
│   ├── 61de96ad8607_seed_estados_validacion.py
│   ├── 893ffada9ea4_seed_catalogo_sexo.py
│   ├── ceef1ee79e95_solicitudes.py
│   └── ee05824d04cb_crearsolicitudes.py
└── env.py
```

# Comandos útiles

```bash
# Ver estado de migraciones
alembic current

# Aplicar migraciones
alembic upgrade head

# Revertir última migración
alembic downgrade -1

# Crear nueva migración
alembic revision --autogenerate -m "Descripción del cambio"
```

Para entender cómo se usan los modelos:

- [Backend - Estructura](20_BACKEND_ESTRUCTURA.md)
- [Endpoints de API](24_ENDPOINTS_API.md)
- [Flujo de Autenticación](22_FLUJO_AUTENTICACION.md)
