import React, { useState } from 'react';
import TextareaAutosize from 'react-textarea-autosize';
import './css/Feedback.css';

function Feedback() {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        const feedbackData = { name, email, message };

        try {
            const response = await fetch(`${process.env.REACT_APP_API_EMAIL}/send-feedback`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(feedbackData),
                credentials: 'include', 
            });

            if (response.ok) {
                alert('Feedback sent successfully');
            } else {
                alert('Failed to send feedback');
            }
        } catch (error) {
            console.error('Error sending feedback:', error);
        }
    };
    return (
        <div className="feedback-page">
            <div className="feedback-container">
                <h2 className="feedback-title">Feedback Form</h2>
                <form className="feedback-form" onSubmit={handleSubmit}>
                    <input 
                      type="text" 
                      className="feedback-input" 
                      placeholder="Name" 
                      value={name} 
                      onChange={(e) => setName(e.target.value)} 
                    />
                    <input 
                      type="text" 
                      className="feedback-input" 
                      placeholder="Email" 
                      value={email} 
                      onChange={(e) => setEmail(e.target.value)} 
                    />
                    <TextareaAutosize
                      className="feedback-input feedback-textarea"
                      placeholder="Your feedback"
                      minRows={10}
                      maxRows={10}
                      
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                    />
                    <button type="submit" className="feedback-button">Submit</button>
                </form>
            </div>
        </div>
    );
}

export default Feedback;
