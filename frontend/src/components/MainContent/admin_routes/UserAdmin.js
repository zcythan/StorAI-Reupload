import React, { useState } from 'react';
import './css/UserAdmin.css';

const UserAdmin = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [codeCount, setCodeCount] = useState(''); // State to store the number of codes to generate
  const [userData, setUserData] = useState(null);

  const fetchUserData = async () => {
    const response = await fetch(`${process.env.REACT_APP_API_ACT}/searchUser?query=${encodeURIComponent(searchTerm)}`, {
      credentials: 'include',
      method: 'GET',
    });
    if (response.ok) {
      const data = await response.json();
      setUserData(data);
    } else {
     
      try {
        const errorData = await response.json(); 
        const errorMessage = errorData.message || "Failed to fetch user data.";
        alert(`Error: ${errorMessage}`);
      } catch (error) {
        alert("Error: Failed to fetch user data and unable to parse error message.");
      }
      console.error('Failed to fetch user data');
    }
  };
  

  const handleSearch = async () => {
    await fetchUserData(); // Use the abstracted function
  };

  const handleGenerateCodes = async () => {
    const response = await fetch(`${process.env.REACT_APP_API_ACT}/generate-codes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ numberOfCodes: parseInt(codeCount, 10) }),
      credentials: 'include',
    });
    if (response.ok) {
      // Trigger file download
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = 'registration-codes.txt'; 
      document.body.appendChild(link);
      link.click();
      link.remove();
    } else {
      console.error('Failed to generate codes');
   
    }
  };

  const toggleAdminStatus = async () => {
    if (!userData) return;

    const response = await fetch(`${process.env.REACT_APP_API_ACT}/toggleAdmin/${userData.id}`, {
      method: 'POST',
      credentials: 'include',
    });
    if (response.ok) {
      // After successfully toggling, refetch user data to reflect the new status
      await fetchUserData();
    } else {
      console.error('Failed to toggle admin status');
    }
  };

  const toggleActiveStatus = async () => {
    if (!userData) return;

    const response = await fetch(`${process.env.REACT_APP_API_ACT}/toggleActive/${userData.id}`, {
      method: 'POST',
      credentials: 'include',
    });
    if (response.ok) {
      // After successfully toggling, refetch user data to reflect the new active status
      await fetchUserData();
    } else {
      console.error('Failed to toggle active status');
    }
  };

  return (
    <div className="editor-page user-admin-page">
    <div className="editor-container user-admin-container">
      <h2>User Administration</h2>
      <div className="search-user-container">
        <input
          type="text"
          placeholder="Search by Username, Email, or ID"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
        <button onClick={handleSearch} className="search-button">Search</button>
      </div>
      <div className="generate-codes-container">
      <h2>Registration Codes</h2>
        <input
          type="number"
          min="1"
          placeholder="Number of Codes"
          value={codeCount}
          onChange={(e) => setCodeCount(e.target.value)}
          className="search-input"
        />
        <button onClick={handleGenerateCodes} className="generate-codes-button">Generate</button>
      </div>
        {userData && (
          <div className="user-details">
            <p>Username: {userData.username}</p>
            <p>Email: {userData.email}</p>
            <p>ID: {userData.id}</p>
            <p>Active: {userData.active ? 'Yes' : 'No'}</p>
            <p>Admin: {userData.is_admin ? 'Yes' : 'No'}</p>
            <p>Created At: {new Date(userData.created_at).toLocaleDateString()}</p>
            {userData.content_progress && (
              <div>
                <h3>Content Progress:</h3>
                <ul>
                  {userData.content_progress.map((content, index) => (
                    <li key={index}>
                      Content ID: {content.content_id}, Started: {content.started ? 'Yes' : 'No'}, Module ID: {content.module_id}, Label: {content.label}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {userData.module_progress && (
              <div>
                <h3>Module Progress:</h3>
                <ul>
                  {userData.module_progress.map((module, index) => (
                    <li key={index}>
                      Module ID: {module.module_id}, Completed: {module.completed ? 'Yes' : 'No'}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <button onClick={toggleAdminStatus} className="toggle-admin-button">
              {userData.is_admin ? 'Remove Admin Rights' : 'Grant Admin Rights'}
            </button>
            <button onClick={toggleActiveStatus} className="toggle-admin-button">
              {userData.active ? 'Deactivate Account' : 'Activate Account'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserAdmin;
