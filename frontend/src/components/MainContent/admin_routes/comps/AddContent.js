import React, { useState } from 'react';
import './AddContent.css';

const AddContent = ({ onClose, modules }) => {
  const [moduleID, setModuleID] = useState('');
  const [type, setType] = useState('');
  const [contentOrder, setContentOrder] = useState('');
  const [label, setLabel] = useState('');
  const [file, setFile] = useState(null);
  const [aiViewer, setAiViewer] = useState(false);
  const [downloadFile, setDownloadFile] = useState(null);
  const [aiType, setAiType] = useState(''); 

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('module_id', moduleID);
    formData.append('type', type);
    formData.append('content_order', contentOrder);
    formData.append('label', label);
    if (aiViewer) {
      formData.append('ai_viewer', aiViewer);
      formData.append('ai_type', aiType); 
    }
    if (downloadFile) {
      formData.append('download_file', downloadFile);
    }

    try {
      const response = await fetch(`${process.env.REACT_APP_API_ACT}/content`, {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to add content.');
      }

      alert("Content added successfully.");
      onClose();
    } catch (error) {
      console.error('Error adding content:', error);
      alert('Error adding content.');
    }
  };

  const getFileAcceptType = () => {
    if (type === 'pdf' || type === 'activity') {
      return '.pdf';
    } else if (type === 'video') {
      return '.mp4, .m4v';
    }
    return '*'; 
  };
  

  return (
    <div className="overlay">
      <div className="add-content-form">
        <form onSubmit={handleSubmit}>
          <label>Module: </label>
          <select value={moduleID} onChange={(e) => setModuleID(e.target.value)} required>
            <option value="">Select Module</option>
            {modules.map((module) => (
              <option key={module.moduleid} value={module.moduleid}>
                {module.title}
              </option>
            ))}
          </select>
          <br />
          <label>Type: </label>
          <select value={type} onChange={(e) => setType(e.target.value)} required>
            <option value="">Select type</option>
            <option value="pdf">PDF</option>
            <option value="video">Video</option>
            <option value="activity">Activity</option>
          </select>
          <br />
          <label>Content Order: </label>
          <input type="number" value={contentOrder} onChange={(e) => setContentOrder(e.target.value)} required />
          <br />
          <label>Label: </label>
          <input type="text" value={label} onChange={(e) => setLabel(e.target.value)} required />
          <br />
          <label>Content: </label>
          <input type="file" accept={getFileAcceptType()} onChange={(e) => setFile(e.target.files[0])} required />
          <br />
          {type === 'activity' && (
            <>
              <label>AI Viewer: </label>
              <input type="checkbox" checked={aiViewer} onChange={() => setAiViewer(!aiViewer)} />
              <br />
              {aiViewer && (
                <>
                  <label>AI Type: </label>
                  <select value={aiType} onChange={(e) => setAiType(e.target.value)} required>
                    <option value="">Select AI Type</option>
                    <option value="general">general</option>
                    <option value="myers-briggs">myers-briggs</option>
                  </select>
                  <br />
                </>
              )}
              <label>Download File: </label>
              <input type="file" onChange={(e) => setDownloadFile(e.target.files[0])} />
              <br />
            </>
          )}
          <div className="form-actions">
            <button type="button" className="cancel-button" onClick={onClose}>Cancel</button>
            <button type="submit" className="submit-button">Add Content</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddContent;
