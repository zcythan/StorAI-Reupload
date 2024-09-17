import React, { useState, useEffect } from 'react';
import './css/Profile.css';

const Profile = () => {
  const [user, setUser] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [confirmEmail, setConfirmEmail] = useState('');

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await fetch(`${process.env.REACT_APP_API_URL}/profile`, {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error('Network response was not ok');
        }

        const data = await response.json();
        setUser(data);
      } catch (error) {
        console.error('Error fetching user data:', error);
      }
    };

    fetchUser();
  }, []);
  const handleUpdateEmail = async (e) => {
    e.preventDefault();
    if (newEmail !== confirmEmail) {
      alert('Emails do not match');
      return;
    }
  
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/update-email`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ newEmail: newEmail }),
      });
  
      const data = await response.json(); 
      if (!response.ok) {
        throw new Error(data.message || 'Failed to update email');
      }
  
      alert(data.message);  
      setUser(prevUser => ({ ...prevUser, email: newEmail })); 
    } catch (error) {
      console.error('Error updating email:', error);
      alert(error.message);
    }
  };

  const handleFlushChatData = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_AI}/flush-chat-data`, {
        method: 'DELETE',
        credentials: 'include', // Important for session-based authentication
      });

      if (response.ok) {
        alert('AI chat data successfully deleted.');
      } else {
        const errorMessage = await response.text();
        alert(`Failed to purge AI chat data: ${errorMessage}`);
      }
    } catch (error) {
      console.error('Error flushing AI chat data:', error);
      alert('Error flushing AI chat data. Please try again later.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      alert('Passwords do not match'); // Alert the user immediately for mismatch
      return;
    }

    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/reset-pwd`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ newPassword }),
      });

      if (!response.ok) {
        const errorResponse = await response.json(); 
        const errorMessage = errorResponse.message || 'Failed to update password';
        throw new Error(errorMessage);
      }

      const successMessage = 'Password updated successfully';
      alert(successMessage); // Show success message as alert
    } catch (error) {
      console.error('Error updating password:', error);
      alert(error.message); // Display the error message in an alert
    }
};



  if (!user) {
    return <div>Loading...</div>;
  }

  return (
    <div className="profile-container">
      <h1 className="profile-title">Profile</h1>
      <div className="profile-info">
        <p>Username: {user.username}</p>
        <p>Email: {user.email}</p>
      </div>
      <div className="password-change-container">
        <h2 className="password-change-title">Change Password</h2>
        <form onSubmit={handleSubmit} className="password-form">
          <div className="password-input-container">
            <input
              type={showNewPassword ? "text" : "password"}
              placeholder="New Password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />
            <button
              type="button"
              onClick={() => setShowNewPassword(!showNewPassword)}
              className="toggle-password-visibility"
            >
              {showNewPassword ? "Hide" : "Show"}
            </button>
          </div>
          <div className="password-input-container">
            <input
              type={showConfirmPassword ? "text" : "password"}
              placeholder="Confirm New Password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="toggle-password-visibility"
            >
              {showConfirmPassword ? "Hide" : "Show"}
            </button>
          </div>
          <button type="submit" className="password-form-button">Change Password</button>
        </form>
      </div>
  <div className="password-change-container">  
  <h2 className="password-change-title">Change Email</h2>  
  <form onSubmit={handleUpdateEmail} className="password-form">  
    <input
      type="email"
      placeholder="New Email"
      value={newEmail}
      onChange={(e) => setNewEmail(e.target.value)}
      required
    />
    <input
      type="email"
      placeholder="Confirm New Email"
      value={confirmEmail}
      onChange={(e) => setConfirmEmail(e.target.value)}
      required
    />
    <button type="submit" className="password-form-button">Update Email</button>  
  </form>
</div>
<div className="flush-chat-data-container">
        <button onClick={handleFlushChatData} className="flush-chat-data-button">
          Clear AI Chat Data
        </button>
      </div>
    </div>
  );
};

export default Profile;
