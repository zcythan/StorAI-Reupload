// MainContent.js
import React from 'react';
import Feedback from './page_routes/Feedback';
import { Routes, Route, Navigate } from 'react-router-dom';
import Profile from './page_routes/Profile.js';

import Modules from './page_routes/Modules'; 
import Dashboard from './page_routes/Dashboard';
import LandingPage from './page_routes/LandingPage';
import Register from './page_routes/Register';
import CombinedViewer from './page_routes/ModuleContainer.js';
import ForgotPW from './page_routes/ForgotPW.js';
import ForgotUser from './page_routes/ForgotUser.js';
import Editor from './admin_routes/Editor.js';
import Actions from './admin_routes/UserAdmin.js';
import './MainContent.css';

function MainContent({ isLoggedIn, username, setUsername, setIsLoggedIn, isAdmin}) {

    const handleLogin = (user) => {
        setUsername(user);
        setIsLoggedIn(true); // Set logged in status to true
    };

    return (
        <div className="main-content">
            <Routes>
                <Route path="/feedback" element={<Feedback />} />
                <Route path="/modules" element={<Modules />} />
                <Route path="/dashboard" element={<Dashboard username={username} />} />
                <Route path="/" element={<LandingPage isLoggedIn = {isLoggedIn}/>} exact /> 
                <Route path="/profile" element={<Profile />} />
                <Route path="/register" element={<Register onLogin = {handleLogin}/>} />
                <Route path ="/mContainer" element={<CombinedViewer />} />
                <Route path ="/forgot-password" element={<ForgotPW />} />
                <Route path ="/forgot-user" element={<ForgotUser />} />
                <Route
                  path="/editor" element={isAdmin ? <Editor /> : <Navigate to="/" />}
                />
                <Route
                  path="/useractions" element={isAdmin ? <Actions /> : <Navigate to="/" />}
                />
                <Route path="/modules" element={<Navigate to="/modules" replace />} />

           </Routes>
        </div>
    );
}

export default MainContent;