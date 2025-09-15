import { createContext, useContext, useEffect, useState } from "react";
import { AuthContext } from "./AuthContext";
import toast from "react-hot-toast";

export const ChatContext = createContext();

export const ChatProvider = ({ children }) => {
  const [messages, setMesages] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [unseenMessages, setUnseenMessages] = useState({});

  const { socket, axios } = useContext(AuthContext);

  const backendurl = import.meta.env.VITE_BACKEND_URL;

  // Function to get all Users
  const getUsers = async () => {
    try {
      const { data } = await axios.get(`${backendurl}/api/messages/users`);
      if (data.success) {
        setUsers(data.users);
        setUnseenMessages(data.unseenMessages || {});
      }
    } catch (error) {
      toast.error(error.message);
    }
  };

  // Function to get messages for selected user
  const getMessages = async (userId) => {
    try {
      const { data } = axios.get(`${backendurl}/api/messages/${userId}`);
      if (data.success) {
        setMesages(data.messages);
      }
    } catch (error) {
      toast.error(error.message);
    }
  };

  // Function to send message to selected user
  const sendMessage = async (messageText) => {
    try {
      const { data } = await axios.post(
        `${backendurl}/api/messages/send/${selectedUser._id}`,
        { messageText }
      );
      if (data.success) {
        setMesages((prevMessages) => [...prevMessages, data.message]);
      } else {
        toast.error(error.message);
      }
    } catch (error) {
      toast.error(error.message);
    }
  };

  // Function to subscribe to message for selected user
  const subscribeToMessages = async () => {
    if (!socket) return;

    socket.on("newMessage", (newMessage) => {
      if (selectedUser & (newMessage.senderId === selectedUser._id)) {
        newMessage.seen = true;
        setMesages((prevMessages) => [...prevMessages, newMessage]);
        axios.put(`${backendurl}/api/messages/mark/${newMessage._id}`);
      } else {
        setUnseenMessage((prevUnseenMessages) => ({
          ...prevUnseenMessages,
          [newMessage.senderId]: prevUnseenMessages[newMessage.senderId]
            ? prevUnseenMessages[newMessage.senderId] + 1
            : 1,
        }));
      }
    });
  };

  // Function to ubsubcribe from messages 
  const unsubscribeFromMessages = () => {
    if(socket){
      socket.off("newMessage")
    }
  }

  useEffect(() => {
    subscribeToMessages()
    return () => unsubscribeFromMessages();
  }, [socket, selectedUser])

  const value = {
    messages, users, selectedUser, getUsers, getMessages, sendMessage, setSelectedUser, 
    unseenMessages, setUnseenMessages
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};
