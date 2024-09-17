import React, { useState } from 'react';
import './css/Register.css';
import { useNavigate } from 'react-router-dom'; 


function Register({onLogin}) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [username, setUsername] = useState('');
    const [secretCode, setSecretCode] = useState('');


    const navigate = useNavigate();

    const login = async (username, password) => {
        try {
            const response = await fetch(`${process.env.REACT_APP_API_URL}/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, password }),
                credentials: 'include',
            });

            if (response.ok) {
                const data = await response.json();
                console.log('Login successful:', data);
                onLogin(username);
                navigate('/dashboard'); // Redirect to dashboard after login
            } else {
                console.error('Login failed:', await response.text());
                // Set state to show an error message in the UI
            }
        } catch (error) {
            console.error('Network error:', error);
            // Set state to show an error message
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (password !== confirmPassword) {
            alert("The passwords do not match!");
            return;
        }

        const data = {
            email: email,
            password: password,
            username: username,
            secretCode: secretCode
        };

        try {
            const resp = await fetch(`${process.env.REACT_APP_API_URL}/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
            });
    
            const respData = await resp.json(); 
    
            if (resp.ok) {
                console.log('The Registration Has Been Successful:', respData);
                await login(username, password);
            } else {
                // Display the error message from the server's response
                console.error('Registration failed:', respData.message);
                alert(respData.message || 'The Registration Has Failed'); 
            }
        } catch (error) {
            console.error('Error during registration:', error);
            alert('Network error during registration. Please try again later.');
        }
    };

    return (
        <div className="registration-page">
            <div className="register-container">
                <h2 className="register-title">Welcome to StorAI</h2>
                <form className="register-form" onSubmit={handleSubmit}>
                    <input
                        type="email"
                        className="register-input"
                        placeholder="Email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                    />
                    <br />
                     <input
                        type="username"
                        className="register-input"
                        placeholder="Username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                    />
                    <br />
                    <input
                        type="password"
                        className="register-input"
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />
                    <br />
                    <input
                        type="password"
                        className="register-input"
                        placeholder="Confirm Password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                    <br />
                    <input
                        className="register-input"
                        placeholder="Registration Code"
                        value={secretCode}
                        onChange={(e) => setSecretCode(e.target.value)}
                        />
                    <br />
                    <button type="submit" className="register-button">Sign Up!</button>
                </form>
            </div>
        </div>
    );
}

export default Register;
