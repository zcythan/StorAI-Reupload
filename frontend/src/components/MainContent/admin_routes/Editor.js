import React, { useEffect, useState } from 'react';
import './css/Editor.css'; 
import DeleteContent from './comps/DeleteContent'; 
import AddContent from './comps/AddContent';

const Editor = () => {
  const [modules, setModules] = useState([]);
  const [contents, setContents] = useState([]);
  const [showDeleteForm, setShowDeleteForm] = useState(false); 
  const [showAddForm, setShowAddForm] = useState(false);

  const fetchData = async () => {
    const fetchModules = async () => {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/gModules`, { credentials: 'include' });
      if (response.ok) {
        const modulesData = await response.json();
        setModules(modulesData);
      } else {
        console.error('Failed to fetch modules:', await response.text());
      }
    };

    const fetchContents = async () => {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/content`, { credentials: 'include' });
      if (response.ok) {
        const contentsData = await response.json();
        setContents(contentsData);
      } else {
        console.error('Failed to fetch contents:', await response.text());
      }
    };

    await fetchModules();
    await fetchContents();
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenDeleteForm = () => {
    setShowDeleteForm(true);
    setShowAddForm(false); 
  };

  const handleOpenAddForm = () => {
    setShowAddForm(true);
    setShowDeleteForm(false);
  };

  const handleCloseForms = () => {
    setShowDeleteForm(false);
    setShowAddForm(false);
    fetchData(); 
  };

  return (
    <div className="editor-page">
      <div className="editor-container">
        <h2>Module Content Management</h2>
        <div className="content-management-buttons">
          <button onClick={handleOpenAddForm} className="add-content-button">Add Content</button>
          <button onClick={handleOpenDeleteForm} className="delete-content-button">Delete Content</button>
        </div>
        {showAddForm && <AddContent onClose={handleCloseForms} modules={modules}/>} 
        {showDeleteForm && <DeleteContent onClose={handleCloseForms} modules={modules}  contents = {contents}/>}
        {modules.map(module => (
          <div key={module.moduleid}>
            <h3 className="m-title">{module.title}</h3>
            <ul className="content-list">
              {contents.filter(content => content.module_id === module.moduleid).map(content => (
                <li key={content.id} className="content-item">
                  {content.type}: {content.label ? content.label : "No Label"} (Order: {content.content_order})
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Editor;
