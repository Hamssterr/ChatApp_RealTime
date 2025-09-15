import { createContext, useEffect, useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { io } from "socket.io-client";

const backendurl = import.meta.env.BACKEND_URL || "http://localhost:5000";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(localStorage.getItem("token") || null);
  const [authUser, setAuthUser] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [socket, setSocket] = useState(null);

  // Check user authentication
  const checkAuth = async () => {
    try {
      const { data } = await axios.get(`${backendurl}/api/auth/checkAuth`, {
        headers: {
          Authorization: `Bearer ${token}`,
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
      const { data } = await axios.post(`${backendurl}/api/auth/${state}`, credentials);
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
    if (!userData || socket?.connected) {
      console.warn("Socket not connected: userData missing or already connected"); // Debug
      return;
    }
    const newSocket = io(backendurl, {
      query: { userId: userData._id },
      reconnection: true, // Enable reconnection
      reconnectionAttempts: 5, // Try reconnecting 5 times
      reconnectionDelay: 1000, // Delay between reconnection attempts
    });
    setSocket(newSocket);

    newSocket.on("connect", () => {
      console.log("Socket connected:", newSocket.id); // Debug
      newSocket.emit("register", userData._id); // Register user
    });

    newSocket.on("online-users", (users) => {
      console.log("Online users:", users); // Debug
      setOnlineUsers(users);
    });

    newSocket.on("disconnect", () => {
      console.log("Socket disconnected"); // Debug
    });

    newSocket.on("connect_error", (error) => {
      console.error("Socket connection error:", error.message); // Debug
      toast.error("WebSocket connection failed");
    });
  };

  useEffect(() => {
    if (token) {
      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      checkAuth();
    }
    return () => {
      if (socket) {
        socket.disconnect();
        setSocket(null);
      }
    };
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