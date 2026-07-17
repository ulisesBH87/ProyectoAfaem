import io
from datetime import datetime
import openpyxl
from openpyxl.styles import Font, Alignment, PatternFill, Border, Side
from openpyxl.utils import get_column_letter

class ReporteExcelServicio:
    @staticmethod
    def sort_report_rows(rows):
        """
        Ordena las filas consistentemente con la lógica del frontend:
        1. costo_total_mxn descendente
        2. costo_total_usd descendente
        3. operaciones totales (ocr + foto + vm) descendente
        """
        def sort_key(x):
            costo_mxn = float(x.get("costo_total_mxn") or x.get("costo_mxn") or 0.0)
            costo_usd = float(x.get("costo_total_usd") or x.get("costo_usd") or 0.0)
            ocr = int(x.get("ocr_count") or x.get("ocr") or 0)
            foto = int(x.get("foto_count") or x.get("foto") or 0)
            vm = int(x.get("verificamex_count") or x.get("vm") or 0)
            total_ops = ocr + foto + vm
            return (-costo_mxn, -costo_usd, -total_ops)
            
        return sorted(rows, key=sort_key)

    @staticmethod
    def normalizar_tipo_servicio(tipo_raw: str) -> str:
        if not tipo_raw:
            return ""
        t = str(tipo_raw).strip().upper()
        if t in ("PHOTO SCAN", "PHOTO_SCAN", "ESCANEO FOTOGRAFÍA", "ESCANEO FOTOGRAFIA", "FOTOGRAFÍA", "FOTOGRAFIA"):
            return "PHOTO_SCAN"
        if t in ("VERIFICAMEX", "VERIFICA MEX", "VERIFICACIÓN CURP", "VERIFICACION CURP", "VERIFICACIÓN CURP/CIUDADANO", "VERIFICACION CURP/CIUDADANO"):
            return "VERIFICAMEX"
        if t in ("OCR", "ESCANEO OCR"):
            return "OCR"
        return tipo_raw

    @classmethod
    def generar_reporte_consumos(cls, resumen: dict, auditoria: dict, fecha_inicio: str, fecha_fin: str) -> bytes:
        # Crear libro de Excel
        wb = openpyxl.Workbook()
        # Eliminar hoja default
        default_sheet = wb.active
        wb.remove(default_sheet)
        
        # Estilos Generales
        title_font = Font(name="Segoe UI", size=16, bold=True, color="000000")
        sheet_title_font = Font(name="Segoe UI", size=14, bold=True, color="000000")
        subtitle_font = Font(name="Segoe UI", size=10, italic=True, color="475569")
        section_font = Font(name="Segoe UI", size=12, bold=True, color="1E293B")
        
        header_fill = PatternFill(start_color="0F172A", end_color="0F172A", fill_type="solid")
        header_font = Font(name="Segoe UI", size=10, bold=True, color="FFFFFF")
        
        zebra_fill = PatternFill(start_color="F8FAFC", end_color="F8FAFC", fill_type="solid")
        cell_font = Font(name="Segoe UI", size=10, color="0F172A")
        
        thin_border_side = Side(style='thin', color='E2E8F0')
        border_all = Border(left=thin_border_side, right=thin_border_side, top=thin_border_side, bottom=thin_border_side)
        
        # Formatos de número de Excel
        MXN_FORMAT = '"$"#,##0.00'
        USD_FORMAT = '"$"#,##0.0000'  # 4 decimales por los costos de OCR de USD
        INT_FORMAT = '#,##0'
        
        def style_header_row(ws, row_idx, max_col):
            for col_idx in range(1, max_col + 1):
                cell = ws.cell(row=row_idx, column=col_idx)
                cell.fill = header_fill
                cell.font = header_font
                cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
            ws.row_dimensions[row_idx].height = 28

        def finalize_sheet(ws, start_row, end_row, max_col):
            ws.views.sheetView[0].showGridLines = True
            
            # Ajustar anchos automáticamente
            for col in ws.columns:
                max_len = 0
                for cell in col:
                    val_str = str(cell.value or '')
                    # Si tiene formato de número, estimar un tamaño razonable
                    if cell.number_format and ('$' in cell.number_format or '#' in cell.number_format):
                        val_str = "$999,999.00"
                    if len(val_str) > max_len:
                        max_len = len(val_str)
                col_letter = get_column_letter(col[0].column)
                ws.column_dimensions[col_letter].width = max(max_len + 3, 13)
            
            # Filtro automático si hay datos en la tabla
            if end_row > start_row:
                last_col_letter = get_column_letter(max_col)
                ws.auto_filter.ref = f"A{start_row}:{last_col_letter}{end_row}"

        # =====================================================================
        # 1. HOJA: Resumen
        # =====================================================================
        ws_res = wb.create_sheet(title="Resumen")
        ws_res.sheet_properties.tabColor = "000000"
        
        ws_res["A1"] = "REPORTE DE CONSUMO DE SERVICIOS"
        ws_res["A1"].font = title_font
        ws_res["A2"] = f"Periodo: {fecha_inicio} al {fecha_fin}"
        ws_res["A2"].font = subtitle_font
        ws_res["A3"] = f"Generado el: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}"
        ws_res["A3"].font = subtitle_font
        
        # KPIs
        ws_res["A5"] = "Métricas Generales"
        ws_res["A5"].font = section_font
        
        ws_res["A6"] = "Total de Operaciones"
        ws_res["B6"] = resumen.get("total_operaciones", 0)
        ws_res["B6"].number_format = INT_FORMAT
        
        ws_res["A7"] = "Costo Total USD"
        ws_res["B7"] = resumen.get("costo_total_usd", 0.0)
        ws_res["B7"].number_format = USD_FORMAT
        
        ws_res["A8"] = "Costo Total MXN"
        ws_res["B8"] = resumen.get("costo_total_mxn", 0.0)
        ws_res["B8"].number_format = MXN_FORMAT
        
        for r in range(6, 9):
            ws_res.cell(row=r, column=1).font = Font(name="Segoe UI", size=10, bold=True, color="475569")
            ws_res.cell(row=r, column=2).font = Font(name="Segoe UI", size=11, bold=True, color="0F172A")
            ws_res.cell(row=r, column=1).border = border_all
            ws_res.cell(row=r, column=2).border = border_all
            ws_res.cell(row=r, column=1).fill = zebra_fill
            ws_res.cell(row=r, column=2).alignment = Alignment(horizontal="right")
            ws_res.cell(row=r, column=2).border = border_all
            ws_res.row_dimensions[r].height = 20
            
        # Tabla resumen de servicios
        ws_res["A11"] = "Costo por Servicio"
        ws_res["A11"].font = section_font
        
        headers_res = ["Servicio", "Proveedor", "Operaciones", "Costo Acumulado", "Divisa", "Descripción"]
        for col_idx, h in enumerate(headers_res, 1):
            ws_res.cell(row=12, column=col_idx, value=h)
        style_header_row(ws_res, 12, len(headers_res))
        
        # Agrupar datos de servicios para evitar duplicados por casing/espacios
        tarifas_raw = resumen.get("tarifas", [])
        operaciones_raw = resumen.get("operaciones_por_servicio", {})
        costos_raw = resumen.get("costo_por_operacion", {})
        
        grouped_services = {}
        
        # 1. Agrupar tarifas
        for t in tarifas_raw:
            tipo_raw = t.get("tipo_consumo") or t.get("TipoConsumo")
            norm = cls.normalizar_tipo_servicio(tipo_raw)
            if not norm:
                continue
            if norm not in grouped_services:
                grouped_services[norm] = {
                    "tipo": norm,
                    "proveedor": t.get("proveedor") or t.get("Proveedor") or "DEFAULT",
                    "cantidad": 0,
                    "costo": 0.0,
                    "divisa": t.get("divisa") or t.get("Divisa") or "MXN",
                    "descripcion": t.get("descripcion") or t.get("Descripcion") or ""
                }
            else:
                if t.get("descripcion") or t.get("Descripcion"):
                    grouped_services[norm]["descripcion"] = t.get("descripcion") or t.get("Descripcion")
                prov = t.get("proveedor") or t.get("Proveedor")
                if prov and str(prov).upper() != "DEFAULT":
                    grouped_services[norm]["proveedor"] = prov
                div = t.get("divisa") or t.get("Divisa")
                if div:
                    grouped_services[norm]["divisa"] = div

        # 2. Agrupar conteo de operaciones
        for tipo_raw, cant in operaciones_raw.items():
            norm = cls.normalizar_tipo_servicio(tipo_raw)
            if not norm:
                continue
            if norm not in grouped_services:
                grouped_services[norm] = {
                    "tipo": norm,
                    "proveedor": "DEFAULT",
                    "cantidad": cant,
                    "costo": 0.0,
                    "divisa": "MXN",
                    "descripcion": ""
                }
            else:
                grouped_services[norm]["cantidad"] += cant

        # 3. Agrupar costos
        for tipo_raw, cost in costos_raw.items():
            norm = cls.normalizar_tipo_servicio(tipo_raw)
            if not norm:
                continue
            if norm not in grouped_services:
                grouped_services[norm] = {
                    "tipo": norm,
                    "proveedor": "DEFAULT",
                    "cantidad": 0,
                    "costo": float(cost or 0.0),
                    "divisa": "MXN",
                    "descripcion": ""
                }
            else:
                grouped_services[norm]["costo"] += float(cost or 0.0)
        
        # Generar lista ordenada homologada
        known_services = list(grouped_services.values())
        service_order = ['OCR', 'PHOTO_SCAN', 'VERIFICAMEX']
        known_services.sort(key=lambda x: service_order.index(x["tipo"]) if x["tipo"] in service_order else 999)
        
        current_row = 13
        for s in known_services:
            tipo = s["tipo"]
            proveedor = s["proveedor"]
            # Lógica homologada del proveedor de PHOTO_SCAN
            if tipo == "PHOTO_SCAN" and str(proveedor).upper() == "DEFAULT":
                proveedor = "PHOTO SCAN"
            else:
                proveedor = proveedor
                
            display_name = "Escaneo OCR" if tipo == "OCR" else ("Escaneo Fotografía" if tipo == "PHOTO_SCAN" else ("Verificación CURP" if tipo == "VERIFICAMEX" else tipo))
            
            ws_res.cell(row=current_row, column=1, value=display_name)
            ws_res.cell(row=current_row, column=2, value=proveedor)
            
            c_cant = ws_res.cell(row=current_row, column=3, value=s["cantidad"])
            c_cant.number_format = INT_FORMAT
            c_cant.alignment = Alignment(horizontal="right")
            
            divisa = s["divisa"]
            c_cost = ws_res.cell(row=current_row, column=4, value=s["costo"])
            c_cost.number_format = USD_FORMAT if divisa == "USD" else MXN_FORMAT
            c_cost.alignment = Alignment(horizontal="right")
            
            ws_res.cell(row=current_row, column=5, value=divisa)
            ws_res.cell(row=current_row, column=6, value=s["descripcion"])
            
            for c_idx in range(1, 7):
                cell = ws_res.cell(row=current_row, column=c_idx)
                cell.font = cell_font
                cell.border = border_all
                if current_row % 2 == 0:
                    cell.fill = zebra_fill
            ws_res.row_dimensions[current_row].height = 20
            current_row += 1
            
        finalize_sheet(ws_res, start_row=12, end_row=current_row-1, max_col=6)
        
        # =====================================================================
        # 2. HOJA: Liga
        # =====================================================================
        ws_liga = wb.create_sheet(title="Liga")
        ws_liga.sheet_properties.tabColor = "000000"
        
        ws_liga["A1"] = "CONSUMOS POR LIGA"
        ws_liga["A1"].font = sheet_title_font
        ws_liga["A2"] = f"Periodo: {fecha_inicio} al {fecha_fin}"
        ws_liga["A2"].font = subtitle_font
        
        headers_liga = ["Liga", "Conteo OCR", "Conteo Foto", "Conteo VerificaMEX", "Costo Total USD", "Costo Total MXN"]
        for col_idx, h in enumerate(headers_liga, 1):
            ws_liga.cell(row=4, column=col_idx, value=h)
        style_header_row(ws_liga, 4, len(headers_liga))
        
        ligas_raw = auditoria.get("desglose_ligas", [])
        ligas_sorted = cls.sort_report_rows(ligas_raw)
        
        current_row = 5
        for item in ligas_sorted:
            ws_liga.cell(row=current_row, column=1, value=item.get("liga_nombre") or "SIN LIGA")
            
            c_ocr = ws_liga.cell(row=current_row, column=2, value=item.get("ocr_count", 0))
            c_ocr.number_format = INT_FORMAT
            c_ocr.alignment = Alignment(horizontal="right")
            
            c_foto = ws_liga.cell(row=current_row, column=3, value=item.get("foto_count", 0))
            c_foto.number_format = INT_FORMAT
            c_foto.alignment = Alignment(horizontal="right")
            
            c_vm = ws_liga.cell(row=current_row, column=4, value=item.get("verificamex_count", 0))
            c_vm.number_format = INT_FORMAT
            c_vm.alignment = Alignment(horizontal="right")
            
            c_usd = ws_liga.cell(row=current_row, column=5, value=item.get("costo_total_usd", 0.0))
            c_usd.number_format = USD_FORMAT
            c_usd.alignment = Alignment(horizontal="right")
            
            c_mxn = ws_liga.cell(row=current_row, column=6, value=item.get("costo_total_mxn", 0.0))
            c_mxn.number_format = MXN_FORMAT
            c_mxn.alignment = Alignment(horizontal="right")
            
            for c_idx in range(1, 7):
                cell = ws_liga.cell(row=current_row, column=c_idx)
                cell.font = cell_font
                cell.border = border_all
                if current_row % 2 == 0:
                    cell.fill = zebra_fill
            ws_liga.row_dimensions[current_row].height = 20
            current_row += 1
            
        finalize_sheet(ws_liga, start_row=4, end_row=current_row-1, max_col=6)
        
        # =====================================================================
        # 3. HOJA: Equipo
        # =====================================================================
        ws_eq = wb.create_sheet(title="Equipo")
        ws_eq.sheet_properties.tabColor = "000000"
        
        ws_eq["A1"] = "CONSUMOS POR EQUIPO"
        ws_eq["A1"].font = sheet_title_font
        ws_eq["A2"] = f"Periodo: {fecha_inicio} al {fecha_fin}"
        ws_eq["A2"].font = subtitle_font
        
        headers_eq = ["Equipo", "Liga", "Conteo OCR", "Conteo Foto", "Conteo VerificaMEX", "Costo Total USD", "Costo Total MXN"]
        for col_idx, h in enumerate(headers_eq, 1):
            ws_eq.cell(row=4, column=col_idx, value=h)
        style_header_row(ws_eq, 4, len(headers_eq))
        
        equipos_raw = auditoria.get("desglose_equipos", [])
        equipos_sorted = cls.sort_report_rows(equipos_raw)
        
        current_row = 5
        for item in equipos_sorted:
            ws_eq.cell(row=current_row, column=1, value=item.get("equipo_nombre") or "SIN EQUIPO")
            ws_eq.cell(row=current_row, column=2, value=item.get("liga_nombre") or "SIN LIGA")
            
            c_ocr = ws_eq.cell(row=current_row, column=3, value=item.get("ocr_count", 0))
            c_ocr.number_format = INT_FORMAT
            c_ocr.alignment = Alignment(horizontal="right")
            
            c_foto = ws_eq.cell(row=current_row, column=4, value=item.get("foto_count", 0))
            c_foto.number_format = INT_FORMAT
            c_foto.alignment = Alignment(horizontal="right")
            
            c_vm = ws_eq.cell(row=current_row, column=5, value=item.get("verificamex_count", 0))
            c_vm.number_format = INT_FORMAT
            c_vm.alignment = Alignment(horizontal="right")
            
            c_usd = ws_eq.cell(row=current_row, column=6, value=item.get("costo_total_usd", 0.0))
            c_usd.number_format = USD_FORMAT
            c_usd.alignment = Alignment(horizontal="right")
            
            c_mxn = ws_eq.cell(row=current_row, column=7, value=item.get("costo_total_mxn", 0.0))
            c_mxn.number_format = MXN_FORMAT
            c_mxn.alignment = Alignment(horizontal="right")
            
            for c_idx in range(1, 8):
                cell = ws_eq.cell(row=current_row, column=c_idx)
                cell.font = cell_font
                cell.border = border_all
                if current_row % 2 == 0:
                    cell.fill = zebra_fill
            ws_eq.row_dimensions[current_row].height = 20
            current_row += 1
            
        finalize_sheet(ws_eq, start_row=4, end_row=current_row-1, max_col=7)
        
        # =====================================================================
        # 4. HOJA: Jugadores
        # =====================================================================
        ws_jug = wb.create_sheet(title="Jugadores")
        ws_jug.sheet_properties.tabColor = "000000"
        
        ws_jug["A1"] = "CONSUMOS POR JUGADORES"
        ws_jug["A1"].font = sheet_title_font
        ws_jug["A2"] = f"Periodo: {fecha_inicio} al {fecha_fin}"
        ws_jug["A2"].font = subtitle_font
        
        headers_jug = ["Nombre Jugador", "Equipo", "Liga", "Conteo OCR", "Conteo Foto", "Conteo VerificaMEX", "Costo Total USD", "Costo Total MXN"]
        for col_idx, h in enumerate(headers_jug, 1):
            ws_jug.cell(row=4, column=col_idx, value=h)
        style_header_row(ws_jug, 4, len(headers_jug))
        
        jugadores_raw = auditoria.get("desglose_jugadores", [])
        jugadores_sorted = cls.sort_report_rows(jugadores_raw)
        
        current_row = 5
        for item in jugadores_sorted:
            ws_jug.cell(row=current_row, column=1, value=item.get("jugador_nombre") or "SIN NOMBRE")
            ws_jug.cell(row=current_row, column=2, value=item.get("equipo_nombre") or "PRE-REGISTRO / SIN EQUIPO")
            ws_jug.cell(row=current_row, column=3, value=item.get("liga_nombre") or "SIN LIGA")
            
            c_ocr = ws_jug.cell(row=current_row, column=4, value=item.get("ocr_count", 0))
            c_ocr.number_format = INT_FORMAT
            c_ocr.alignment = Alignment(horizontal="right")
            
            c_foto = ws_jug.cell(row=current_row, column=5, value=item.get("foto_count", 0))
            c_foto.number_format = INT_FORMAT
            c_foto.alignment = Alignment(horizontal="right")
            
            c_vm = ws_jug.cell(row=current_row, column=6, value=item.get("verificamex_count", 0))
            c_vm.number_format = INT_FORMAT
            c_vm.alignment = Alignment(horizontal="right")
            
            c_usd = ws_jug.cell(row=current_row, column=7, value=item.get("costo_total_usd", 0.0))
            c_usd.number_format = USD_FORMAT
            c_usd.alignment = Alignment(horizontal="right")
            
            c_mxn = ws_jug.cell(row=current_row, column=8, value=item.get("costo_total_mxn", 0.0))
            c_mxn.number_format = MXN_FORMAT
            c_mxn.alignment = Alignment(horizontal="right")
            
            for c_idx in range(1, 9):
                cell = ws_jug.cell(row=current_row, column=c_idx)
                cell.font = cell_font
                cell.border = border_all
                if current_row % 2 == 0:
                    cell.fill = zebra_fill
            ws_jug.row_dimensions[current_row].height = 20
            current_row += 1
            
        finalize_sheet(ws_jug, start_row=4, end_row=current_row-1, max_col=8)
        
        # =====================================================================
        # 5. HOJA: Directivos
        # =====================================================================
        ws_dir = wb.create_sheet(title="Directivos")
        ws_dir.sheet_properties.tabColor = "000000"
        
        ws_dir["A1"] = "CONSUMOS POR DIRECTIVOS"
        ws_dir["A1"].font = sheet_title_font
        ws_dir["A2"] = f"Periodo: {fecha_inicio} al {fecha_fin}"
        ws_dir["A2"].font = subtitle_font
        
        headers_dir = ["Nombre Directivo", "Rol", "Equipo", "Liga", "Conteo OCR", "Conteo Foto", "Conteo VerificaMEX", "Costo Total USD", "Costo Total MXN"]
        for col_idx, h in enumerate(headers_dir, 1):
            ws_dir.cell(row=4, column=col_idx, value=h)
        style_header_row(ws_dir, 4, len(headers_dir))
        
        directivos_raw = auditoria.get("desglose_directivos", [])
        directivos_sorted = cls.sort_report_rows(directivos_raw)
        
        current_row = 5
        for item in directivos_sorted:
            ws_dir.cell(row=current_row, column=1, value=item.get("directivo_nombre") or "SIN NOMBRE")
            ws_dir.cell(row=current_row, column=2, value=item.get("directivo_rol") or "DIRECTIVO")
            ws_dir.cell(row=current_row, column=3, value=item.get("equipo_nombre") or "PRE-REGISTRO / SIN EQUIPO")
            ws_dir.cell(row=current_row, column=4, value=item.get("liga_nombre") or "SIN LIGA")
            
            c_ocr = ws_dir.cell(row=current_row, column=5, value=item.get("ocr_count", 0))
            c_ocr.number_format = INT_FORMAT
            c_ocr.alignment = Alignment(horizontal="right")
            
            c_foto = ws_dir.cell(row=current_row, column=6, value=item.get("foto_count", 0))
            c_foto.number_format = INT_FORMAT
            c_foto.alignment = Alignment(horizontal="right")
            
            c_vm = ws_dir.cell(row=current_row, column=7, value=item.get("verificamex_count", 0))
            c_vm.number_format = INT_FORMAT
            c_vm.alignment = Alignment(horizontal="right")
            
            c_usd = ws_dir.cell(row=current_row, column=8, value=item.get("costo_total_usd", 0.0))
            c_usd.number_format = USD_FORMAT
            c_usd.alignment = Alignment(horizontal="right")
            
            c_mxn = ws_dir.cell(row=current_row, column=9, value=item.get("costo_total_mxn", 0.0))
            c_mxn.number_format = MXN_FORMAT
            c_mxn.alignment = Alignment(horizontal="right")
            
            for c_idx in range(1, 10):
                cell = ws_dir.cell(row=current_row, column=c_idx)
                cell.font = cell_font
                cell.border = border_all
                if current_row % 2 == 0:
                    cell.fill = zebra_fill
            ws_dir.row_dimensions[current_row].height = 20
            current_row += 1
            
        finalize_sheet(ws_dir, start_row=4, end_row=current_row-1, max_col=9)
        
        # Guardar en memoria y retornar bytes
        out = io.BytesIO()
        wb.save(out)
        return out.getvalue()
