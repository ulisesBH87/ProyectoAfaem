def model_to_dict(obj, exclude=None):
    exclude = exclude or []

    data = {}
    for column in obj.__table__.columns:
        if column.name in exclude:
            continue
        data[column.name] = getattr(obj, column.name)

    return data