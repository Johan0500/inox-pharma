import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
});

api.interceptors.request.use((config) => {
  const token    = localStorage.getItem("token");
  const selectedLab = localStorage.getItem("selectedLab");

  if (token)       config.headers.Authorization = `Bearer ${token}`;
  if (selectedLab) config.headers["X-Lab"] = selectedLab;

  return config;
});

export default api;