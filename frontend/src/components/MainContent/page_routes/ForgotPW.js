import React, { useState } from 'react';
import './css/ForgotPW.css';

function ForgotPW() {
    const [email, setEmail] = useState('');
    const [resetCode, setResetCode] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [message, setMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showResetCodeInput, setShowResetCodeInput] = useState(false);
    const [showPasswordReset, setShowPasswordReset] = useState(false);
    const [resetSuccess] = useState(false);

    const handleSubmitEmail = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setMessage('');

        try {
            const response = await fetch(`${process.env.REACT_APP_API_URL}/forgot-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
                credentials: 'include',
            });

            const messageText = await response.text();
            setMessage(messageText);

            if (response.ok) {
                setShowResetCodeInput(true);
            }
        } catch (error) {
            console.error('Error sending forgot password request:', error);
            setMessage('An unexpected error occurred, please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleResetCodeSubmission = async (e) => {
        e.preventDefault();
        setIsLoading(true);
    
        try {
            const response = await fetch(`${process.env.REACT_APP_API_URL}/verify-code`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, resetCode }),
                credentials: 'include', 
            });
    
            const messageText = await response.text();
            setMessage(messageText);
    
            if (response.ok) {
                setShowResetCodeInput(false);
                setShowPasswordReset(true); // Show password reset inputs if reset code verification is successful
            }
        } catch (error) {
            console.error('Error verifying reset code:', error);
            setMessage('An unexpected error occurred, please try again.');
        } finally {
            setIsLoading(false);
        }
    };
    
    const handlePasswordResetSubmission = async (e) => {
        e.preventDefault();
        setIsLoading(true);
    
        if (newPassword !== confirmPassword) {
            alert("The new passwords do not match.");
            setIsLoading(false);
            return;
        }
    
        try {
            const response = await fetch(`${process.env.REACT_APP_API_URL}/reset-pwd`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ newPassword }),
                credentials: 'include',
            });
    
            
            const contentType = response.headers.get("content-type");
            let responseData;
            if (contentType && contentType.indexOf("application/json") !== -1) {
                const json = await response.json();
                responseData = json.message; 
            } else {
                responseData = await response.text();
            }
    
            if (response.ok) {
                alert("Password has been reset successfully.");
            } else {
                alert(responseData);
            }
        } catch (error) {
            console.error('Error resetting password:', error);
            alert('An unexpected error occurred, please try again.');
        } finally {
            setIsLoading(false);
        }
    };
    
    

    return (
        <div className="forgot-pw-page">
            <div className="forgot-pw-container">
                <h2 className="forgot-pw-title">Forgot Password</h2>
                {isLoading ? (
                    <p>Loading...</p>
                ) : (
                    <p className="forgot-pw-message">{message}</p>
                )}
                {!resetSuccess && (
                  <>
                    {showResetCodeInput && !showPasswordReset && (
                        <form className="forgot-pw-form" onSubmit={handleResetCodeSubmission}>
                            <input
                                type="text"
                                className="forgot-pw-input"
                                placeholder="Reset Code"
                                value={resetCode}
                                onChange={(e) => setResetCode(e.target.value)}
                            />
                            <button type="submit" className="forgot-pw-button">
                                Submit Reset Code
                            </button>
                        </form>
                    )}
                    {showPasswordReset && (
                        <form className="forgot-pw-form" onSubmit={handlePasswordResetSubmission}>
                            <input
                                type="password"
                                className="forgot-pw-input"
                                placeholder="New Password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                            />
                            <input
                                type="password"
                                className="forgot-pw-input"
                                placeholder="Confirm Password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                            />
                            <button type="submit" className="forgot-pw-button">
                                Reset Password
                            </button>
                        </form>
                    )}
                    {!showResetCodeInput && !showPasswordReset && !isLoading && (
                        <form className="forgot-pw-form" onSubmit={handleSubmitEmail}>
                            <input
                                type="email"
                                className="forgot-pw-input"
                                placeholder="Email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                            <button type="submit" className="forgot-pw-button">Submit</button>
                        </form>
                    )}
                  </>
                )}
            </div>
        </div>
    );
}

export default ForgotPW;

                           
