import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "https://vintage.adharshs.in/api";

// Public API instance — withCredentials sends the httpOnly token cookie on every request
export const API = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

// Request interceptor
API.interceptors.request.use(
  (config) => {
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);


API.interceptors.response.use(
  (response) => {
    // Any status code within the range of 2xx
    return response;
  },
  (error) => {
    // Handle specific error cases
    if (error.response) {
      switch (error.response.status) {
        case 401:
          // Handle unauthorized access
          localStorage.removeItem('jwt');
          // You might want to redirect to login page here
          break;
        case 404:
          // Handle not found
          break;
        case 500:
          // Handle server error
          break;
      }
    }
    return Promise.reject(error);
  }
);

// Private API (Requires Authorization)
// export const API = axios.create({
//   baseURL: API_BASE_URL,
// });

// Function to set Authorization token dynamically
export const setAuthToken = (token) => {
  if (token) {
    API.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete API.defaults.headers.common['Authorization'];
  }
};

// Load token from localStorage on startup
const token = localStorage.getItem('jwt');
if (token) {
  setAuthToken(token);
}
