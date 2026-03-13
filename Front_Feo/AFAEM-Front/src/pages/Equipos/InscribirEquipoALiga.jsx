import React, { useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import DashboardSidebar from '../../components/DashboardSidebar';
import DashboardHeader from '../../components/DashboardHeader';
import '../../styles/dashboard.css';

export default function InscribirEquipoALiga() {
  const navigate = useNavigate();
  const { teamId } = useParams();
  const _location = useLocation();
  const userEmail = localStorage.getItem('email');
  
  const [selectedTeam] = useState('Real Huexca');
  const [selectedLeague, setSelectedLeague] = useState(null);

  const availableLeagues = [
    {
      id: 1,
      name: 'Nombre de la liga',
      description: 'Lorem Ipsum dolor sit amet, consectetur adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim ad miniim veniam, quis nostrud exerci tation ullamcorper suscipit lobortis nisl ut aliquip ex ea commodo consequat. Duis auten irure dolor in hendrerit in'
    },
    {
      id: 2,
      name: 'Nombre de la liga',
      description: 'Lorem Ipsum dolor sit amet, consectetur adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim ad miniim veniam, quis nostrud exerci tation ullamcorper suscipit lobortis nisl ut aliquip ex ea commodo consequat. Duis auten irure dolor in hendrerit in'
    }
  ];

  return (
    <div className="dashboard-wrapper">
      <DashboardSidebar userEmail={userEmail} />
      
      <div className="dashboard-container">
        <DashboardHeader userEmail={userEmail} pageTitle="Administración de Equipo" />
        
        <div className="dashboard-main">
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}>
            <div style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              padding: '40px',
              maxWidth: '500px',
              width: '90%',
              boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)',
              maxHeight: '90vh',
              overflowY: 'auto'
            }}>
              {/* TÍTULO */}
              <h2 style={{
                margin: '0 0 30px 0',
                color: '#0b4ea6',
                fontSize: '22px',
                fontWeight: '700',
                textAlign: 'center'
              }}>
                Inscribir equipo a liga
              </h2>

              {/* SELECTOR DE EQUIPO */}
              <div style={{
                marginBottom: '30px'
              }}>
                <label style={{
                  display: 'block',
                  color: '#1e293b',
                  fontSize: '14px',
                  fontWeight: '700',
                  marginBottom: '12px'
                }}>
                  Equipo:
                </label>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 14px',
                  backgroundColor: '#f8fafc',
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0',
                  color: '#1e293b',
                  fontSize: '14px',
                  fontWeight: '600'
                }}>
                  <span>{selectedTeam}</span>
                  <span style={{ fontSize: '18px', color: '#64748b' }}>▼</span>
                </div>
              </div>

              {/* LIGAS DISPONIBLES */}
              <div style={{
                marginBottom: '30px'
              }}>
                <label style={{
                  display: 'block',
                  color: '#1e293b',
                  fontSize: '14px',
                  fontWeight: '700',
                  marginBottom: '16px'
                }}>
                  Ligas disponibles para equipo:
                </label>

                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px'
                }}>
                  {availableLeagues.map((league) => (
                    <div
                      key={league.id}
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '12px',
                        padding: '16px',
                        backgroundColor: '#f8fafc',
                        borderRadius: '8px',
                        border: selectedLeague === league.id ? '2px solid #0b4ea6' : '1px solid #e2e8f0',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                      onClick={() => setSelectedLeague(league.id)}
                      onMouseEnter={(e) => {
                        if (selectedLeague !== league.id) {
                          e.currentTarget.style.backgroundColor = '#f1f5f9';
                          e.currentTarget.style.borderColor = '#cbd5e1';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (selectedLeague !== league.id) {
                          e.currentTarget.style.backgroundColor = '#f8fafc';
                          e.currentTarget.style.borderColor = '#e2e8f0';
                        }
                      }}
                    >
                      {/* RADIO BUTTON */}
                      <input
                        type="radio"
                        name="league"
                        value={league.id}
                        checked={selectedLeague === league.id}
                        onChange={() => setSelectedLeague(league.id)}
                        style={{
                          marginTop: '2px',
                          cursor: 'pointer',
                          width: '18px',
                          height: '18px',
                          flexShrink: 0
                        }}
                      />

                      {/* CONTENIDO */}
                      <div style={{
                        flex: 1,
                        minWidth: 0
                      }}>
                        <h3 style={{
                          margin: '0 0 8px 0',
                          color: '#1e293b',
                          fontSize: '14px',
                          fontWeight: '700'
                        }}>
                          {league.name}
                        </h3>
                        <p style={{
                          margin: '0',
                          color: '#64748b',
                          fontSize: '12px',
                          lineHeight: '1.5',
                          fontWeight: '500'
                        }}>
                          {league.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* BOTONES */}
              <div style={{
                display: 'flex',
                gap: '12px',
                justifyContent: 'center'
              }}>
                <button
                  onClick={() => {}}
                  style={{
                    padding: '12px 32px',
                    backgroundColor: '#0b4ea6',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    minWidth: '140px'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#0a3d85';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#0b4ea6';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  Inscribirse
                </button>
                <button
                  onClick={() => navigate(teamId ? `/presidente-equipo/admin-equipo/${teamId}` : '/presidente-equipo/equipos')}
                  style={{
                    padding: '12px 32px',
                    backgroundColor: '#f1f5f9',
                    color: '#64748b',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    minWidth: '140px'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#e2e8f0';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#f1f5f9';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
