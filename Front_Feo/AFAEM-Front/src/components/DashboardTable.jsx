import React from 'react';
import '../styles/dashboard.css';
import Loader from './Loader';

const DashboardTable = ({ 
  columns = [], 
  data = [], 
  emptyMessage = 'No hay datos disponibles',
  isLoading = false,
  onRowClick = null,
  // Paginación Props
  totalItems = 0,
  itemsPerPage = 10,
  currentPage = 1,
  onPageChange = null
}) => {
  const showFullLoader = isLoading && data.length === 0;

  if (showFullLoader) {
    return (
      <div className="table-container" style={{ minHeight: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Loader inline text="Cargando información de la tabla..." />
      </div>
    );
  }

  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const showPagination = totalPages > 1;

  // Calcular rango visible
  const startRange = (currentPage - 1) * itemsPerPage + 1;
  const endRange = Math.min(currentPage * itemsPerPage, totalItems);

  //Limina la cantidad de páginas visibles a 3 para evitar saturar la interfaz
  const maxVisiblePages = 3;

  let startPage = Math.max(currentPage - 2, 1);
  let endPage = startPage + maxVisiblePages - 1;

  if (endPage > totalPages) {
    endPage = totalPages;
    startPage = Math.max(endPage - maxVisiblePages + 1, 1);
  }

  const visiblePages = [];

  for (let i = startPage; i <= endPage; i++) {
    visiblePages.push(i);
  }

  return (
    <div className="table-container" style={{ position: 'relative' }}>
      {isLoading && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(255, 255, 255, 0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 5,
          borderRadius: '12px',
          backdropFilter: 'blur(2px)'
        }}>
          <Loader inline text="Actualizando información..." />
        </div>
      )}
      <div className="table-wrapper" style={{ opacity: isLoading ? 0.6 : 1, transition: 'opacity 0.25s ease' }}>
        <table className="dashboard-table">
          <thead>
            <tr>
              {columns.map((col, idx) => (
                <th key={idx} style={col.width ? { width: col.width, minWidth: col.width } : {}}>{col.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.length > 0 ? (
              data.map((row, rowIdx) => (
                <tr 
                  key={row?.EquipoId ?? row?.id ?? row?.equipo_id ?? rowIdx} 
                  onClick={() => onRowClick && onRowClick(row)}
                  style={{ cursor: onRowClick ? 'pointer' : 'default' }}
                >
                  {columns.map((col, colIdx) => (
                    <td key={colIdx} style={col.width ? { width: col.width, minWidth: col.width } : {}}>
                      {col.render ? col.render(row[col.key], row) : row[col.key]}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length} style={{ textAlign: 'center', padding: '30px' }}>
                  {emptyMessage}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showPagination && (
        <div className="table-pagination">
          <div className="pagination-info">
            Mostrando <strong>{startRange}-{endRange}</strong> de <strong>{totalItems}</strong> registros
          </div>
          <div className="pagination-controls">
            <button 
              className="pagination-btn"
              disabled={currentPage === 1}
              onClick={() => onPageChange(currentPage - 1)}
            >
              Anterior
            </button>
            <div className="pagination-pages">
              {/*
              {[...Array(totalPages)].map((_, i) => (
                <button
                  key={i + 1}
                  className={`page-num ${currentPage === i + 1 ? 'active' : ''}`}
                  onClick={() => onPageChange(i + 1)}
                >
                  {i + 1}
                </button>
              ))}
              */}
              {visiblePages.map((page) => (
                <button
                key={page}
                className={`page-num ${currentPage === page ? 'active' : ''}`}
                onClick={() => onPageChange(page)}
                >
                  {page}
                </button>
              ))}
            </div> 
            <button 
              className="pagination-btn"
              disabled={currentPage === totalPages}
              onClick={() => onPageChange(currentPage + 1)}
            >
              Siguiente
            </button>
          </div>
        </div>
      )}

      <style>{`
        .table-pagination {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 20px;
          background: #f8fafc;
          border-top: 1px solid #e2e8f0;
          font-family: 'Inter', sans-serif;
        }
        .pagination-info {
          font-size: 13px;
          color: #64748b;
        }
        .pagination-controls {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .pagination-pages {
          display: flex;
          gap: 6px;
        }
        .page-num {
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 8px;
          border: 1px solid #e2e8f0;
          background: white;
          font-size: 13px;
          font-weight: 600;
          color: #64748b;
          cursor: pointer;
          transition: all 0.2s;
        }
        .page-num.active {
          background: #0b4ea6;
          color: white;
          border-color: #0b4ea6;
        }
        .page-num:hover:not(.active) {
          background: #f1f5f9;
        }
        .pagination-btn {
          padding: 6px 14px;
          border-radius: 8px;
          border: 1px solid #e2e8f0;
          background: white;
          font-size: 13px;
          font-weight: 600;
          color: #1e293b;
          cursor: pointer;
          transition: all 0.2s;
        }
        .pagination-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          background: #f8fafc;
        }
        .pagination-btn:not(:disabled):hover {
          background: #f1f5f9;
        }
      `}</style>
    </div>
  );
};

export default DashboardTable;
