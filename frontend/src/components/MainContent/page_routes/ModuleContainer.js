import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate} from 'react-router-dom';
import './css/ModuleContainer.css';
import PDFViewer from './comps/PDFViewer.js';
import VideoPlayer from './comps/VideoPlayer.js';
import Activity from './comps/Activity.js';
import { fetchData, updateData } from '../../../utilities/fetch-api/api-calls.js';

function CombinedViewer() {
    const location = useLocation();
    const [currentContentIndex, setCurrentContentIndex] = useState(0);
    const [moduleContent, setModuleContent] = useState([]);
    const [pdfUrl, setPdfUrl] = useState(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();
    const moduleId = location.state?.module?.id;

    useEffect(() => {
      if (moduleId) {
          fetchData(`${process.env.REACT_APP_API_URL}/current-id?module_id=${moduleId}`, {
              credentials: 'include',
          })
          .then(data => { 
              console.log("Fetched data:", data); // Log the entire data object to confirm structure
              const currentId = data.data.current_id; 
              console.log("Current ID:", currentId); 
              setCurrentContentIndex(currentId || 0); 
          })
          .catch(error => console.error('Failed to fetch current content index:', error));
      }
      if (location.state?.content) {
        setModuleContent(location.state.content);
        if (location.state.content.length > 0) {
            updateContentProgress(location.state.content[0].id);
        }
    }
    }, [moduleId, location.state]);
    

  const updateContentProgress = (contentId) => {
      updateData(`${process.env.REACT_APP_API_URL}/user-content-progress`, { content_id: contentId, started: true })
      .catch(error => console.error("Error updating content progress:", error));
  };

  const updateCurrentContentIndex = (newIndex) => {
      if (moduleId) {
          updateData(`${process.env.REACT_APP_API_URL}/current-id`, {
              module_id: moduleId,
              current_id: newIndex,
          }, { credentials: 'include' })
          .catch(error => console.error('Failed to update current content index:', error));
      }
  };

    const markModuleAsCompleted = () => {
        if (location.state?.module.id) {
            updateData(`${process.env.REACT_APP_API_URL}/user-module-progress`, {
                module_id: location.state.module.id,
                completed: true
            }).then(() => {
                console.log("Module marked as completed.");
            }).catch(error => {
                console.error("Error marking module as completed:", error);
            });
        }
    };    

    const goToNextContent = () => {
      let nextIndex = currentContentIndex + 1;
      if (nextIndex <= moduleContent.length - 1) { 
          setCurrentContentIndex(nextIndex); 
          updateCurrentContentIndex(nextIndex); 
          updateContentProgress(moduleContent[nextIndex].id);
      }
      if (nextIndex === moduleContent.length - 1) { 
          markModuleAsCompleted();
      }
  };

    const goBack = () => {
      let prevIndex = currentContentIndex - 1;
      if (prevIndex >= 0) {
          setCurrentContentIndex(prevIndex);
          updateCurrentContentIndex(prevIndex);
          // Only update content progress if moving back to previously started content
          if (moduleContent[prevIndex]?.started) {
              updateContentProgress(moduleContent[prevIndex]?.id);
          }
      }
  };

  const goToModules = () => {
    navigate('/modules');
};

    const fetchPDFWithCredentials = async (url) => {
        const response = await fetch(url, {
          method: 'GET',
          credentials: 'include', // Ensure cookies are sent
        });
        if (!response.ok) throw new Error('Network response was not ok.');
        return await response.blob();
      };
    
      useEffect(() => {
        const currentItem = moduleContent[currentContentIndex];
    
        if (currentItem?.type === 'pdf' || currentItem?.type === 'activity') {
          const fileSrc = `${process.env.REACT_APP_DOMAIN}${currentItem?.src || currentItem?.pdfSrc}`;
          fetchPDFWithCredentials(fileSrc)
            .then(blob => {
              const url = URL.createObjectURL(blob);
              setPdfUrl(url);
              setLoading(false);
            })
            .catch(error => {
              console.error("Error fetching PDF:", error);
              setLoading(false);
            });
        }
      }, [currentContentIndex, moduleContent]);

      const renderContent = () => {
        const currentItem = moduleContent[currentContentIndex];
        switch (currentItem?.type) {
          case 'pdf':
            return (
             <div className="styled-container"> 
                {loading ? <div>Loading PDF...</div> : <PDFViewer file={pdfUrl} />}
              </div>
            );
          case 'video':
            return (
              <div className="styled-container"> 
                <VideoPlayer src={`${process.env.REACT_APP_DOMAIN}${currentItem?.src}`} />
              </div>
            );
          case 'activity':
            return (
              <Activity
                key={currentItem?.id}
                pdfSrc={pdfUrl}
                fileSrc={`${currentItem?.download_src}`}
                aiViewer={currentItem?.ai_viewer}
                contentId={currentItem?.id}
                aiType={currentItem?.ai_type}
              />
            );
          default:
            return <div>Unsupported content type</div>;
        }
      };
      

return (
    <div className="combined-viewer">
         <div className="file-viewer">
            {renderContent()}
            <div className="skip-button-container">
            {currentContentIndex !== 0 && (
            <button onClick={goBack} className="navigation-button">
                        Back
                    </button>
            )}
            {currentContentIndex < moduleContent.length - 1 && (
                    <button onClick={goToNextContent} className="navigation-button">
                        Next
                    </button>
            )}
            {currentContentIndex === moduleContent.length - 1 && (
                    <button onClick={goToModules} className="navigation-button">
                        Back To Modules
                    </button>
            )}
            </div>
        </div>
    </div>
);
}

export default CombinedViewer;
