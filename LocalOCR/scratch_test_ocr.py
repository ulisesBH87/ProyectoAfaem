import sys
sys.path.append("OCR")
from app import curp_coincide_con_nombre

curp = "OEGA141105HMSRVNA1"
nombres = "ANGEL"
ap1 = "ELIAN"
ap2 = "OREA"

print("Test OCR 1 (ANGEL, ELIAN, OREA):", curp_coincide_con_nombre(curp, nombres, ap1, ap2))

nombres_2 = "ANGEL ELIAN"
ap1_2 = "OREA"
ap2_2 = "GUEVARA"

print("Test OCR 2 (ANGEL ELIAN, OREA, GUEVARA):", curp_coincide_con_nombre(curp, nombres_2, ap1_2, ap2_2))
