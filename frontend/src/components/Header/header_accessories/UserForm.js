// UserForm.js
import React from 'react';
import './css/UserForm.css';
import { useNavigate } from 'react-router-dom';

const UserForm = ({ username, onLogout, isAdmin }) => {
    const navigate = useNavigate();
    const handleLogout = () => {
        // Logout logic
        fetch(`${process.env.REACT_APP_API_URL}/logout`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include', // Include cookies
            body: JSON.stringify({ username }), // Sending the username for logging purposes
        }).then(() => {
            onLogout(); // Call the onLogout prop function after successful logout
            navigate('/');
        });
    };

    const goToEditor = () => {
        navigate('/editor'); // Navigates to the Admin Dashboard page
    };

    const goToUsersPage = () => {
        navigate('/useractions'); 
    };

    const goToProfile = () => {
        navigate('/profile'); // Navigates to the Profile page
    };

    return (
        <div className="user-form">
            <button onClick={goToProfile}>Profile</button>
            <button onClick={handleLogout}>Logout</button> 
            {isAdmin && <button onClick={goToEditor}>Editor</button>}
            {isAdmin && <button onClick={goToUsersPage}>Users</button>} 
        </div>
    );
};

export default UserForm;