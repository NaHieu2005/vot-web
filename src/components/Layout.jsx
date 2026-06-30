import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';

const Layout = () => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', paddingTop: '80px' }}>
      <Navbar />
      <main style={{ flex: '1' }}>
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;
