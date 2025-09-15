import { createContext, useContext, useEffect, useState } from "react";
import { AuthContext } from "./AuthContext";
import toast from "react-hot-toast";

export const ChatContext = createContext();

export const ChatProvider = ({ children }) => {
  const [messages, setMessages] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [unseenMessages, setUnseenMessages] = useState({});

  const { socket, axios } = useContext(AuthContext);

  const backendurl =
    import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

  // Function to get all Users
  const getUsers = async () => {
    try {
      const { data } = await axios.get(`${backendurl}/api/messages/users`);
      console.log("getUsers response:", data); // Debug
      if (data?.success) {
        setUsers(data.users || []);
        setUnseenMessages(data.unseenMessages || {});
      } else {
        toast.error(data?.message || "Failed to fetch users");
      }
    } catch (error) {
      console.error("getUsers error:", error);
      toast.error(error.message || "Error fetching users");
    }
  };

  // Function to get messages for selected user
  const getMessages = async (userId) => {
    try {
      const response = await axios.get(`${backendurl}/api/messages/${userId}`);
      console.log("getMessages response:", response.data); // Debug
      const { data } = response;
      if (data?.success) {
        setMessages(data.messages || []);
      } else {
        toast.error(data?.message || "Failed to fetch messages");
      }
    } catch (error) {
      console.error("getMessages error:", error);
      toast.error(error.message || "Error fetching messages");
    }
  };

  // Function to send message to selected user
  const sendMessage = async ({ text, image }) => {
    try {
      console.log("sendMessage payload:", {
        text,
        image: image?.slice(0, 50),
        receiverId: selectedUser?._id,
      }); // Debug
      const { data } = await axios.post(
        `${backendurl}/api/messages/send/${selectedUser._id}`,
        { text, image }
      );
      console.log("sendMessage response:", data); // Debug
      if (data?.success) {
        setMessages((prevMessages) => [...prevMessages, data.newMessage]);
      } else {
        toast.error(data?.message || "Failed to send message");
      }
    } catch (error) {
      console.error("sendMessage error:", error.response?.data, error.message); // Log full error response
      toast.error(
        error.response?.data?.message ||
          error.message ||
          "Error sending message"
      );
    }
  };

  // Function to subscribe to messages for selected user
  const subscribeToMessages = () => {
    if (!socket) {
      console.warn("Socket not initialized"); // Debug
      return;
    }

    socket.on("newMessage", (newMessage) => {
      console.log("New message received:", newMessage); // Debug
      if (selectedUser && newMessage.senderId === selectedUser._id) {
        newMessage.seen = true;
        setMessages((prevMessages) => [...prevMessages, newMessage]);
        axios
          .put(`${backendurl}/api/messages/mark/${newMessage._id}`)
          .catch((err) => {
            console.error("Failed to mark message as seen:", err);
          });
      } else {
        setUnseenMessages((prevUnseenMessages) => ({
          ...prevUnseenMessages,
          [newMessage.senderId]:
            (prevUnseenMessages[newMessage.senderId] || 0) + 1,
        }));
      }
    });

    socket.on("connect", () => {
      console.log("Socket connected:", socket.id); // Debug
    });

    socket.on("disconnect", () => {
      console.log("Socket disconnected"); // Debug
    });

    socket.on("connect_error", (error) => {
      console.error("Socket connection error:", error.message); // Debug
      toast.error("WebSocket connection failed");
    });
  };

  // Function to unsubscribe from messages
  const unsubscribeFromMessages = () => {
    if (socket) {
      socket.off("newMessage");
      socket.off("connect");
      socket.off("disconnect");
      socket.off("connect_error");
    }
  };

  useEffect(() => {
    subscribeToMessages();
    return () => unsubscribeFromMessages();
  }, [socket, selectedUser]);

  const value = {
    messages,
    users,
    selectedUser,
    getUsers,
    getMessages,
    sendMessage,
    setSelectedUser,
    unseenMessages,
    setUnseenMessages,
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};
