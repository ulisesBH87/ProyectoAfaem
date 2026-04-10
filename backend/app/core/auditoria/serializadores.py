EXCLUIR = {"Contrasena", "Contraseña", "Password", "Pass", "Salt", "Hash"}

def model_to_dict(obj, exclude=None):
    exclude = exclude or set()
    exclude = exclude.union(EXCLUIR)

    data = {}
    for column in obj.__table__.columns:
        if column.name in exclude:
            continue
        data[column.name] = getattr(obj, column.name)

    return data