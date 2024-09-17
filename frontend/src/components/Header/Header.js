import React, { useState } from 'react';
import Navbar from './header_accessories/Navbar.js';
import LoginForm from './header_accessories/LoginForm.js';
import UserForm from './header_accessories/UserForm.js';

function Header({ isLoggedIn, username, setUsername, setIsLoggedIn, isAdmin, setIsAdmin }) {
    const [showLoginForm, setShowLoginForm] = useState(false);
    const [showUserForm, setShowUserForm] = useState(false);

    const handleLogin = (user) => {
        setUsername(user);
        setIsLoggedIn(true); // Set logged in status to true
    };

    const handleLogout = () => {
        setUsername("");
        setIsLoggedIn(false);
        setIsAdmin(false); 
    };

    const handleLoginClick = () => {
        if (isLoggedIn) {
            setShowUserForm(!showUserForm); // Toggle user form
        } else {
            setShowLoginForm(!showLoginForm); // Toggle login form
        }
    };

    return (
        <header>
            <Navbar 
                isLoggedIn={isLoggedIn} 
                username={username} 
                onLoginClick={handleLoginClick}
            />
            {showLoginForm && !isLoggedIn && <LoginForm onClose={() => setShowLoginForm(false)} onLogin={handleLogin} isAdmin={isAdmin} setIsAdmin={setIsAdmin} />}
            {showUserForm && isLoggedIn && <UserForm onClose={() => setShowUserForm(false)} onLogout={handleLogout} isAdmin={isAdmin}/>}
        </header>
    );
}

export default Header;
