import React from 'react';
import { Outlet } from 'react-router-dom';
import DashboardSidebar from '../components/DashboardSidebar';
import DashboardHeader from '../components/DashboardHeader';

const MainLayout = ({ userEmail }) => {
  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--bg-main)' }}>
      <DashboardSidebar userEmail={userEmail} />
      
      <div style={{ 
        flex: 1, 
        marginLeft: 'var(--sidebar-width)', 
        transition: 'margin-left 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <DashboardHeader userEmail={userEmail} />
        
        <main className="fade-in" style={{ 
          padding: '30px', 
          flex: 1
        }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default MainLayout;
