import React from 'react'; // Make sure to import useState
import './css/Navbar.css';
import { NavLink } from 'react-router-dom';


export const Navbar = ({ isLoggedIn, username, onLoginClick }) => {
    return (
        <nav className="navbar navbar-expand-lg navbar-light bg-light">
            <NavLink className="navbar-brand" to={isLoggedIn ? "/dashboard" : "/"}>StorAI</NavLink>
            {isLoggedIn && (
                <div className="navbar-nav">
                    <NavLink className="nav-link" to="/dashboard">Dashboard</NavLink>
                    <NavLink className="nav-link" to="/modules">Modules</NavLink>
                    <NavLink className="nav-link" to="/feedback">Feedback</NavLink>
                </div>
            )}
            <div className="login-container">
                <button className="button-cont" onClick={onLoginClick}>
                    {isLoggedIn ? username : 'Login'}
                </button>
            </div>
        </nav>
    );
};
export default Navbar