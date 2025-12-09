const API_URL = 'https://api.mrbright.ai';
const CHAT_URL = 'https://chat.mrbright.ai';

export const signupUser = async (email, name, companyName, userType) => {
  try {
    const response = await fetch(`${API_URL}/auth/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        name,
        companyName,
        userType: userType || 'client'
      })
    });
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Signup error:', error);
    throw error;
  }
};

export { API_URL, CHAT_URL };
