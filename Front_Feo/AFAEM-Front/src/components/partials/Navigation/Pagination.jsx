import React from 'react';

/**
 * Componente Pagination
 * Paginación reutilizable
 * 
 * @param {number} currentPage - Página actual
 * @param {number} totalPages - Total de páginas
 * @param {function} onPageChange - Callback al cambiar página
 * @param {boolean} disabled - Deshabilitado
 */
export default function Pagination({
  currentPage = 1,
  totalPages = 1,
  onPageChange,
  disabled = false,
  style = {}
}) {
  const handlePrevious = () => {
    if (currentPage > 1 && !disabled) {
      onPageChange(currentPage - 1);
    }
  };

  const handleNext = () => {
    if (currentPage < totalPages && !disabled) {
      onPageChange(currentPage + 1);
    }
  };

  const handlePageClick = (page) => {
    if (!disabled) {
      onPageChange(page);
    }
  };

  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;
    
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push('...');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      }
    }
    
    return pages;
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '8px',
      margin: '24px 0',
      ...style
    }}>
      <button
        onClick={handlePrevious}
        disabled={currentPage === 1 || disabled}
        style={{
          padding: '8px 12px',
          border: '1px solid #cbd5e1',
          borderRadius: '6px',
          backgroundColor: currentPage === 1 || disabled ? '#f1f5f9' : 'white',
          color: currentPage === 1 || disabled ? '#94a3b8' : '#0b4ea6',
          cursor: currentPage === 1 || disabled ? 'not-allowed' : 'pointer',
          fontSize: '14px',
          fontWeight: '600',
          transition: 'all 0.2s ease'
        }}
      >
        ← Anterior
      </button>

      <div style={{ display: 'flex', gap: '4px', margin: '0 16px' }}>
        {getPageNumbers().map((page, idx) => (
          page === '...' ? (
            <span key={`ellipsis-${idx}`} style={{
              padding: '8px 12px',
              color: '#94a3b8'
            }}>
              ...
            </span>
          ) : (
            <button
              key={page}
              onClick={() => handlePageClick(page)}
              disabled={disabled}
              style={{
                padding: '8px 12px',
                border: page === currentPage ? '2px solid #0b4ea6' : '1px solid #cbd5e1',
                borderRadius: '6px',
                backgroundColor: page === currentPage ? '#dbeafe' : 'white',
                color: page === currentPage ? '#0b4ea6' : '#1e293b',
                cursor: disabled ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: page === currentPage ? '700' : '600',
                transition: 'all 0.2s ease',
                minWidth: '40px'
              }}
            >
              {page}
            </button>
          )
        ))}
      </div>

      <button
        onClick={handleNext}
        disabled={currentPage === totalPages || disabled}
        style={{
          padding: '8px 12px',
          border: '1px solid #cbd5e1',
          borderRadius: '6px',
          backgroundColor: currentPage === totalPages || disabled ? '#f1f5f9' : 'white',
          color: currentPage === totalPages || disabled ? '#94a3b8' : '#0b4ea6',
          cursor: currentPage === totalPages || disabled ? 'not-allowed' : 'pointer',
          fontSize: '14px',
          fontWeight: '600',
          transition: 'all 0.2s ease'
        }}
      >
        Siguiente →
      </button>
    </div>
  );
}
