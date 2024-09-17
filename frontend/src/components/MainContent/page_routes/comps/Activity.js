import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import PDFViewer from './PDFViewer.js';
import TextareaAutosize from 'react-textarea-autosize';
import './Activity.css'

const Activity = ({ pdfSrc, fileSrc, aiViewer, contentId, aiType }) => {
  const [prompt, setPrompt] = useState('');
  const [responses, setResponses] = useState([]);
  const [isLoading, setIsLoading] = useState(false);  
  const responsesEndRef = useRef(null);

  useEffect(() => {
    if (aiViewer) {
      const fetchIntroduction = async () => {
        try {
          const response = await fetch(`${process.env.REACT_APP_API_AI}/introduce`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ ai_type: aiType }),
          });
          const data = await response.json();
          if (data && data.aiIntroduction) {
            setResponses(responses => [...responses, { prompt: '', response: data.aiIntroduction }]);
          }
        } catch (error) {
          console.error('Error:', error);
        }
      };
      fetchIntroduction();
    }
  }, [aiViewer, aiType, contentId]);

  useLayoutEffect(() => {
    if (responsesEndRef.current) {
      responsesEndRef.current.scrollTop = responsesEndRef.current.scrollHeight - responsesEndRef.current.clientHeight;
    }
  }, [responses]);

  const handleSubmit = (e) => {
    e.preventDefault();
    setIsLoading(true); 
    const requestBody = { ai_type: aiType, userMessage: prompt };
  
    fetch(`${process.env.REACT_APP_API_AI}/generate-text`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(requestBody),
    })
    .then(response => {
      // Check if the response is OK 
      if (response.ok) {
        return response.json();  // Parse as JSON if response is OK
      } else {
        return response.text().then(text => {
          throw new Error(text || 'Unknown error');  
        });
      }
    })
    .then(data => {
      setResponses(prevResponses => [...prevResponses, { prompt, response: data.content }]);
      setPrompt('');
    })
    .catch(error => {
      console.error('Error:', error);
      alert(`Error: ${error.message}`);  
    })
    .finally(() => setIsLoading(false));  
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!isLoading) {  
        handleSubmit(e);
      }
    }
  };

  const downloadUrl = `${process.env.REACT_APP_API_URL}/download/${contentId}`;

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.setAttribute('download', 'downloadedFile');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const showDownloadButton = fileSrc !== null && fileSrc !== undefined && fileSrc.trim() !== '' && fileSrc !== 'null' && fileSrc !== 'undefined';
  return (
    <div className={`activity-container ${!aiViewer ? 'ai-absent' : ''}`}>
      <div className="pdf-and-download-container"> 
        {pdfSrc && <PDFViewer file={pdfSrc} />}
        {showDownloadButton && (
          <button onClick={handleDownload} className="download-button">
            Download Resource
          </button>
        )}
      </div>
      {aiViewer && (
        <div className="ai-viewer-container">
          <div className="responses-container" ref={responsesEndRef}>
            {responses.map((entry, index) => (
              <div key={index} className="response">
                <div className="user-prompt">{entry.prompt}</div>
                <div className="ai-response">{entry.response}</div>
              </div>
            ))}
          </div>
          <form onSubmit={handleSubmit} className="prompt-form">
            <TextareaAutosize
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={isLoading ? "Loading..." : "Send a message"}
              className="prompt-input"
              minRows={4}
              maxRows={4} 
              onKeyDown={handleKeyDown}
              disabled={isLoading}
            />
            <button type="submit" className="submit-button" disabled={isLoading}>Submit</button>
          </form>
        </div>
      )}
    </div>
  );
};

export default Activity;
