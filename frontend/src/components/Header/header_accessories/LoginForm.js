import './css/LoginForm.css';
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

function LoginForm({ onClose, onLogin, setIsAdmin }) { 
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
    
        try {
            // Attempt to log in
            const response = await fetch(`${process.env.REACT_APP_API_URL}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', },
                body: JSON.stringify({ username, password }),
                credentials: 'include',
            });
    
            if (response.ok) {
                // Check for admin status
                const adminCheckResponse = await fetch(`${process.env.REACT_APP_API_URL}/check-creds`, {
                    credentials: 'include',
                });
                if (adminCheckResponse.ok) {
                    const adminData = await adminCheckResponse.json();
                    setIsAdmin(adminData.isAdmin); // Update admin status based on response
                }
    
                // Continue with successful login logic
                const data = await response.json();
                console.log('Login successful:', data);
                onLogin(username); // Pass username to callback
                onClose(); // Close form
                navigate('/dashboard');
            } else {
                // Try to parse the response as JSON to get the message
                try {
                    const errorData = await response.json();
                    const errorMessage = errorData.message || "Login failed for an unknown reason.";
                    alert(errorMessage);
                } catch (jsonParseError) {
                    // If parsing fails, display a generic error message
                    alert("Login failed: Unable to parse error message.");
                }
            }
        } catch (error) {
            console.error('Network error:', error);
            alert(`Network error: ${error.message}`);
        }
    };
        
    const handleForgotPassword = () => {
        navigate('/forgot-password');
    };

    const handleForgotUsername = () => {
        navigate('/forgot-user');
    };

    return (
        <div className="login-form">
            <form onSubmit={handleSubmit}>
                <div>
                    <label>Username:</label>
                    <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} />
                </div>
                <div>
                    <label>Password:</label>
                    <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
                </div>
                <button type="submit">Login</button>
                <br></br>
                <button type="button" onClick={handleForgotPassword} className="forgot-password-button" style={{ marginTop: '30px' }}>Forgot Password</button>
                <button type="button" onClick={handleForgotUsername} className="forgot-username-button" >Forgot Username</button>
            </form>
        </div>
    );
}

export default LoginForm;
