import React, { useState, useEffect } from 'react';
import './DeleteContent.css'; 

const DeleteContent = ({ onClose, modules, contents }) => {
  const [moduleId, setModuleId] = useState('');
  const [selectedLabel, setSelectedLabel] = useState('');
  const [filteredContents, setFilteredContents] = useState([]);

  useEffect(() => {
    if (moduleId) {
      const moduleContents = contents.filter(content => content.module_id.toString() === moduleId);
      setFilteredContents(moduleContents);
    } else {
      setFilteredContents([]);
    }
  }, [moduleId, contents]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const selectedContent = filteredContents.find(content => content.label === selectedLabel);
    if (!selectedContent) return alert("Please select content to delete.");

    try {
      const response = await fetch(`${process.env.REACT_APP_API_ACT}/content`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          module_id: moduleId,
          content_order: selectedContent.content_order,
        }),
      });

      if (response.ok) {
        alert('Content deleted successfully.');
        onClose(); // Close the form
      } else {
        alert('Failed to delete content. ' + await response.text());
      }
    } catch (error) {
      console.error('Failed to delete content:', error);
      alert('Error deleting content.');
    }
  };

  return (
    <div className="overlay">
      <div className="delete-content-form">
        <form onSubmit={handleSubmit}>
          <div>
            <label htmlFor="module_id">Module: </label>
            <select
              id="module_id"
              value={moduleId}
              onChange={(e) => setModuleId(e.target.value)}
              required
            >
              <option value="">Select Module</option>
              {modules.map((module) => (
                <option key={module.moduleid} value={module.moduleid}>
                  {module.title}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="content_label">Content Label: </label>
            <select
              id="content_label"
              value={selectedLabel}
              onChange={(e) => setSelectedLabel(e.target.value)}
              required
              disabled={filteredContents.length === 0}
            >
              <option value="">Select Content</option>
              {filteredContents.map(content => (
                <option key={content.id} value={content.label}>
                  {content.label}
                </option>
              ))}
            </select>
          </div>
          <button type="submit">Delete Content</button>
          <button type="button" onClick={onClose}>Cancel</button>
        </form>
      </div>
    </div>
  );
};

export default DeleteContent;
