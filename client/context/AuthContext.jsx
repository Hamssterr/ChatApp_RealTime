import { createContext, useEffect, useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { io } from "socket.io-client";

const backendurl = import.meta.env.VITE_BACKEND_URL;
// axios.defaults.baseURL = backendurl;

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(localStorage.getItem("token") || null);
  const [authUser, setAuthUser] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [socket, setSocket] = useState(null);

  //   Check user authentication
  // AuthContext.jsx
  const checkAuth = async () => {
    try {
      const { data } = await axios.get(`${backendurl}/api/auth/checkAuth`, {
        headers: {
          Authorization: `Bearer ${token}`, // Explicitly set header
        },
      });
      if (data.success) {
        setAuthUser(data.user);
        connectSocket(data.user);
      }
    } catch (error) {
      console.error("CheckAuth Error:", {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message,
      });
      if (error.response?.status === 401) {
        localStorage.removeItem("token");
        setToken(null);
        setAuthUser(null);
        toast.error("Session expired. Please log in again.");
      } else {
        toast.error(error.response?.data?.message || error.message);
      }
    }
  };

  const login = async (state, credentials) => {
    try {
      const { data } = await axios.post(
        `${backendurl}/api/auth/${state}`,
        credentials
      );
      if (data.success) {
        setAuthUser(data.userData);
        setToken(data.token);
        localStorage.setItem("token", data.token);
        axios.defaults.headers.common["Authorization"] = `Bearer ${data.token}`;
        connectSocket(data.userData);
        toast.success(data.message);
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      console.error("Login Error:", error.response?.data || error.message);
      toast.error(error.response?.data?.message || error.message);
    }
  };

  //   Logout function handler and socket disconnection
  const logout = async () => {
    localStorage.removeItem("token");
    setToken(null);
    setAuthUser(null);
    setOnlineUsers([]);
    axios.defaults.headers.common["Authorization"] = null;
    toast.success("Logged out successfully");
    if (socket) {
      socket.disconnect();
      setSocket(null);
    }
  };

  //   Update Profile function handler
  const updateProfile = async (body) => {
    try {
      const { data } = await axios.put(`${backendurl}/api/auth/update-profile`, body);
      if (data.success) {
        setAuthUser(data.user);
        toast.success("Profile updated successfully");
      }
    } catch (error) {
      toast.error(error.message);
    }
  };

  // Connect to Socket.io server
  const connectSocket = (userData) => {
    if (!userData || socket?.connected) return;
    const newSocket = io(backendurl, {
      query: {
        userId: userData._id,
      },
    });
    newSocket.connect();
    setSocket(newSocket);

    newSocket.on("online-users", (users) => {
      setOnlineUsers(users);
    });
  };

  useEffect(() => {
    if (token) {
      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      checkAuth();
    }
  }, [token]);

  const value = {
    axios,
    authUser,
    onlineUsers,
    socket,
    login,
    logout,
    updateProfile,
  };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
