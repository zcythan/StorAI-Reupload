import React, { useState, useEffect } from 'react';
import Header from './components/Header/Header.js';
import MainContent from './components/MainContent/MainContent.js';
import './App.css'; 

function App() {
  const [username, setUsername] = useState('Guest');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const setNavbarHeight = () => {

      const header = document.querySelector('header');
      if (header) {
        const headerHeight = header.offsetHeight;
        document.documentElement.style.setProperty('--navbar-height', `${headerHeight}px`);
      } else {
        console.error('Header element not found');
      }
    };
  
    setNavbarHeight(); 
    window.addEventListener('resize', setNavbarHeight); // Update on resize
  

    return () => window.removeEventListener('resize', setNavbarHeight);
  }, []);
  
  useEffect(() => {
    const checkSessionAndAdmin = async () => {
      try {
        const sessionResponse = await fetch(`${process.env.REACT_APP_API_URL}/check-session`, {
          credentials: 'include',
        });
        const sessionData = await sessionResponse.json();

        if (sessionData.loggedIn) {
          setUsername(sessionData.username);
          setIsLoggedIn(true);

      
          const adminResponse = await fetch(`${process.env.REACT_APP_API_URL}/check-creds`, {
            credentials: 'include',
          });
          const adminData = await adminResponse.json();
          setIsAdmin(adminData.isAdmin); 
        }
      } catch (error) {
        console.error('Error checking session or admin status:', error);
      }
    };

    checkSessionAndAdmin();
  }, []);

  return (
    <div className="app-container"> 
      <Header
        isLoggedIn={isLoggedIn}
        username={username}
        setUsername={setUsername}
        setIsLoggedIn={setIsLoggedIn}
        setIsAdmin={setIsAdmin}
        isAdmin={isAdmin}
      />
      <MainContent 
        style={{ paddingTop: 'var(--navbar-height)' }} 
        username={username} 
        isLoggedIn={isLoggedIn}
        setIsLoggedIn={setIsLoggedIn}
        setUsername={setUsername}
        isAdmin={isAdmin}
      />
    </div>
  );
}

export default App;
