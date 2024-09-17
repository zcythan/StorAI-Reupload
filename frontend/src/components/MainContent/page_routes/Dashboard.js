import React, { useEffect, useState } from "react";
import { fetchData } from "../../../utilities/fetch-api/api-calls";
import './css/Dashboard.css'; 

function Dashboard({ username }) {
    const localUsername = username ? username : 'Guest';
    const [courseProgress, setCourseProgress] = useState(0);
    const [completedModules, setCompletedModules] = useState([]);
    const [numChats, setNumChats] = useState(0);

    const calculateCourseProgress = async () => {
        try {
            // Fetch all necessary data
            const { data: dataM } = await fetchData(`${process.env.REACT_APP_API_URL}/gModules`);
            const { data: dataUMS } = await fetchData(`${process.env.REACT_APP_API_URL}/user-module-progress`);
            const { data: dataUCS } = await fetchData(`${process.env.REACT_APP_API_URL}/user-content-progress`);

            // Calculate course metrics
            const courseRatio = 1 / dataM.length;
            let courseCompletion = 0.0;
            dataM.forEach(m => {
                const checkModule = dataUMS.find(ums => ums.module_id === m.moduleid);
                if (checkModule?.completed) {
                    setCompletedModules(prev => [...prev, m.title]);
                }

                let contentLength = 0;
                let contentStarted = 0;
                dataUCS.forEach(ucs => {
                    if (ucs.module_id === m.moduleid) {
                        contentLength++;
                        if (ucs.started) {
                            contentStarted++;
                        }
                    }
                });

                courseCompletion += (contentStarted / contentLength) * courseRatio;
            });

            setCourseProgress((courseCompletion * 100).toFixed(2));
        } catch (error) {
            console.error('Error calculating course progress:', error);
        }
    };
    const fetchAIMetrics = async () => {
        try {
            const { data } = await fetchData(`${process.env.REACT_APP_API_URL}/aimetrics`, { credentials: 'include' });
            setNumChats(data.numChats);
        } catch (error) {
            console.error('Error fetching AI metrics:', error);
        }
    };
    useEffect(() => {
        calculateCourseProgress();
        fetchAIMetrics();
    }, []);

    const progressTextStyle = (courseProgress === '0.00') ? {
        color: 'black', 
        position: 'absolute',
        width: '100%',
        textAlign: 'center',
        left: 0,
    } : {};

    return (
        <div className="dashboard-page">
            <div className="dashboard">
                <h1>Welcome, {localUsername.toUpperCase()}</h1>
                <div className="dashboard-section course-progress">
                <h2>Module Progress</h2>
                    <div className="progress-container" style={{ position: 'relative' }}> 
                        <div className="progress-bar" style={{ width: `${courseProgress}%`, backgroundColor: courseProgress === '0.00' ? 'grey' : '' }}>
                            <span style={progressTextStyle}>{courseProgress}%</span>
                        </div>
                    </div>
                </div>
                <div className="dashboard-section completed-modules">
                    <h2>Completed Modules</h2>
                    <ul>
                        {completedModules.map((module, index) => (
                            <li key={index}>{module}</li>
                        ))}
                    </ul>
                </div>
                <div className="dashboard-section ai-metrics">
                    <h2>AI Chat Count: {numChats}</h2>
                </div>
            </div>
        </div>
    );
}

export default Dashboard;