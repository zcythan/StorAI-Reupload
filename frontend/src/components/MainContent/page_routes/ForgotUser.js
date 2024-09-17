import React, { useState } from 'react';
import './css/ForgotUser.css'; 

function ForgotUser() {
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmitEmail = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setMessage('');

        try {
            const response = await fetch(`${process.env.REACT_APP_API_URL}/forgot-user`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
                credentials: 'include',
            });

            const messageText = await response.text();
            setMessage(messageText);
        } catch (error) {
            console.error('Error requesting username:', error);
            setMessage('An unexpected error occurred, please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="forgot-user-page">
            <div className="forgot-user-container">
                <h2 className="forgot-user-title">Forgot Username</h2>
                {isLoading ? (
                    <p>Loading...</p>
                ) : (
                    <p className="forgot-user-message">{message}</p>
                )}
                <form className="forgot-user-form" onSubmit={handleSubmitEmail}>
                    <input
                        type="email"
                        className="forgot-user-input"
                        placeholder="Email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                    />
                    <button type="submit" className="forgot-user-button">Submit</button>
                </form>
            </div>
        </div>
    );
}

export default ForgotUser;
