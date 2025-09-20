import { createContext, useEffect, useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { io } from "socket.io-client";

const backendurl = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

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
    return;
  }

  const newSocket = io(backendurl, {
    query: { userId: userData._id },
    withCredentials: true,
    transports: ["websocket"], // ép dùng websocket
  });

  newSocket.on("connect", () => {
    console.log("✅ Socket connected:", newSocket.id);
    setSocket(newSocket); // chỉ set sau khi connect thành công
  });

  newSocket.on("online-users", (users) => {
    setOnlineUsers(users);
  });

  newSocket.on("disconnect", () => {
    console.log("❌ Socket disconnected");
  });

  newSocket.on("connect_error", (err) => {
    console.error("Socket connection error:", err.message);
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