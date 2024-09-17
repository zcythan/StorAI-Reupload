// Function to make a GET request to retrieve data from the API
async function fetchData(url) {
  const response = await fetch(url, {
    method: 'GET',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
  });
  let data = await response;
  if (response.ok) {
    data = await response.json();
    return { status: response.status, data };
  } else {
    return { status: response.status, data: null };
  }
}

// Function to make a POST request to send data to the API
async function postData(url, data) {
  try {
    const response = await fetch(url, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    const responseData = await response.json();
    return responseData;
  } catch (error) {
    console.error('Error posting data:', error);
    throw error;
  }
}

// Function to make a PUT request to update data in the API
async function updateData(url, data) {
  try {
    const response = await fetch(url, {
      method: 'PUT',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    const responseData = await response.json();
    return responseData;
  } catch (error) {
    console.error('Error updating data:', error);
    throw error;
  }
}

// Function to make a DELETE request to delete data from the API
async function deleteData(url) {
  try {
    const response = await fetch(url, {
      method: 'DELETE',
      credentials: 'include',
    });
    const responseData = await response.json();
    return responseData;
  } catch (error) {
    console.error('Error deleting data:', error);
    throw error;
  }
}

export { fetchData, postData, updateData, deleteData };
