from app import curp_coincide_con_nombre

def split_nombre_completo(fullname, curp_code="No detectado"):
    partes = fullname.split()
    n = len(partes)
    if n < 2:
        return fullname, "", ""
    if curp_code and curp_code != "No detectado" and len(curp_code) >= 4:
        for i in range(1, n):
            nombres = " ".join(partes[:i])
            ap1 = partes[i]
            ap2 = partes[i+1] if i+1 < n else ""
            coincide, inv = curp_coincide_con_nombre(curp_code, nombres, ap1, ap2)
            print(f"i={i}: nombres='{nombres}', ap1='{ap1}', ap2='{ap2}', coincide={coincide}")
            if coincide:
                return nombres, ap1, ap2
        if n >= 3:
            for i in range(2, n):
                ap1 = partes[0]
                ap2 = partes[1]
                nombres = " ".join(partes[2:])
                coincide, inv = curp_coincide_con_nombre(curp_code, nombres, ap1, ap2)
                if coincide:
                    return nombres, ap1, ap2
    if n >= 3:
        nombres = " ".join(partes[:-2])
        ap1 = partes[-2]
        ap2 = partes[-1]
        return nombres, ap1, ap2
    else:
        return partes[0], partes[1], ""

print("Test with OEGA:")
print("Result:", split_nombre_completo("ANGEL ELIAN OREA GUEVARA", "OEGA141105HMSRVNA1"))

print("\nTest with OEGO:")
print("Result:", split_nombre_completo("ANGEL ELIAN OREA GUEVARA", "OEGO141105HMSRVNA1"))
