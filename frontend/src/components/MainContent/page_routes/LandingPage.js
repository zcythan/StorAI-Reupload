import React, { useEffect } from 'react';
import './css/LandingPage.css';
import logo from './images/logo.png';

import { useNavigate } from 'react-router-dom';

function LandingPage({ isLoggedIn }) {
    const navigate = useNavigate();
    
    useEffect(() => {
        if (isLoggedIn) {
            navigate('/dashboard');
        }
    }, [isLoggedIn, navigate]);

    const goToReg = () => {
        navigate('/register');
    };

    return (
        <div className="landing-page">
            <main className="hero container flex">
                <div className="hero-text flex-column">
                    <h1>Welcome to StorAI</h1>
                    <p>Your companion in entrepreneurial learning.</p>
                    <p>Learn how to find your entrepreneurial sweet spot with our guided program.</p>
                    <button className="cta-button" onClick={goToReg}>Register Now</button>
                </div>
            
            </main>
            <section className="features container">
                <h2>Features</h2>
                <ul>
                    <li>Interactive learning activities</li>
                    <li>AI-driven discussion simulations</li>
                    <li>Real-life application of entrepreneurial concepts</li>
                </ul>
            </section>
            <section className="image-container container">
                <img src={logo} alt="I, Inc Logo"  style={{ width: '300px', height: 'auto' }} />
            </section>
            <footer className="footer container">
                <p>© StorAI - Empowering Entrepreneurs</p>
            </footer>
        </div>
    );
}

export default LandingPage;
