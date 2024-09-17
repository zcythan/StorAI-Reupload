import React, { useEffect, useState } from 'react';
import './css/Modules.css';
import { fetchData } from '../../../utilities/fetch-api/api-calls.js';
import { Link } from 'react-router-dom';

const Modules = () => {
    const [userModules, setUserModules] = useState([]);

    useEffect(() => {
        const compileModuleObject = async () => {
            // get the modules, content, user_module_status, and user_content_status from our backend endpoint
            const dataM = await fetchData(`${process.env.REACT_APP_API_URL}/gModules`).then(res => res.data);
            const dataC = await fetchData(`${process.env.REACT_APP_API_URL}/content`).then(res => res.data);
            const dataUMS = await fetchData(`${process.env.REACT_APP_API_URL}/user-module-progress`).then(res => res.data);
            const dataUCS = await fetchData(`${process.env.REACT_APP_API_URL}/user-content-progress`).then(res => res.data);
            
            // Compile the module object with necessary data
            const moduleObject = dataM.map(module => {
                const content = dataC.filter(contentItem => contentItem.module_id === module.moduleid);
                const userModule = dataUMS.find(userModuleItem => userModuleItem.module_id === module.moduleid) || {};
                return {
                    id: module.moduleid,
                    image: module.image,
                    path: module.path, 
                    title: module.title,
                    completed: userModule.completed || false,
                    viewed: userModule.viewed || false,
                    content: content.map(contentItem => {
                        const userContentItem = dataUCS.find(userContent => userContent.content_id === contentItem.id) || {};
                        return {
                            id: contentItem.id,
                            type: contentItem.type,
                            src: contentItem.src,
                            ai_viewer: contentItem.ai_viewer,
                            download_src: contentItem.download_src,
                            ai_type: contentItem.ai_type,
                            started: userContentItem.started || false
                        };
                    })
                };
            });

            setUserModules(moduleObject);
        };

        compileModuleObject();
    }, []);

    return (
        <>
            <div className="modules-banner">
                <h2>Modules</h2>
            </div>
            <div className="modules-container">
                {userModules.map(module => (
                    <div key={module.id} className="module-card">
                        <img src={require(`./images/${module.image}.webp`)} alt={`Module ${module.title}`} className="module-image" />
                        <div className="module-info">
                            <div className="module-title">{module.title}</div>
                            <div className="module-status">
                                {!module.completed && !module.viewed ? 'Not Started' : (module.viewed && !module.completed ? 'In Progress' : 'Completed')}
                            </div>
                            <Link to={module.path} state={{ content: module.content, module }} className="module-action">
                                {module.completed ? 'Review' : 'Start'}
                            </Link>
                        </div>
                    </div>
                ))}
            </div>
        </>
    );
};

export default Modules;
