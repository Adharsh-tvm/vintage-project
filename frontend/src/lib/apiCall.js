import axios from 'axios';

export const api = import.meta.env.VITE_API_BASE_URL; // adjust port if needed

axios.defaults.withCredentials = true;
