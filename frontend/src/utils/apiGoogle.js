import axios from "axios";

const api = axios.create({
    baseUrl: import.meta.env.VITE_API_BASE_URL
});

export const googleAuth = (code) => api.post(`/google?code=${code}`, code)