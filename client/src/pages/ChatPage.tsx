import React, { useEffect, useState, useRef, useMemo } from "react";
import { Send, MessageCircle } from "lucide-react";
import { useZoomStore, ZoomContact } from "@/store/zoomStore";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { ChatMessage } from "@/components/zoom/ChatMessage";
import { VoiceRecorder } from "@/components/zoom/VoiceRecorder";
import toast from "react-hot-toast";



export const ChatPage: React.FC = () => {
  const {
    contacts,
    messages,
    selectedContact,
    isLoading,
    error,
    fetchContacts,
    fetchMessages,
    sendMessage,
    sendVoiceMessage,
    setSelectedContact,
    clearError,
  } = useZoomStore();
  const { user } = useAuth();
  // const { sendMessage, lastMessage } = useWebSocket(); // Assuming useWebSocket returns lastMessage
  // const { toast } = useToast();
  const queryClient = useQueryClient();

  const [messageText, setMessageText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: allUsersData, isLoading: isLoadingUsers } = useQuery({
    queryKey: ["/api/users"],
    enabled: !!user,
  });

  const allUsers: ZoomContact[] = useMemo(() => {
    return Array.isArray(allUsersData) ? (allUsersData as ZoomContact[]) : [];
  }, [allUsersData]);

  const availableUsers = useMemo(() => {
    if (!user || allUsers.length === 0) return [];

    return allUsers.filter((otherUser: ZoomContact) => {
      // Don't include self
      if (otherUser.id === user.id) return false;

      // Check permissions based on role
      if (user.role === "super_admin") return true;

      // Users must be in the same company
      if (otherUser.companyId !== user.companyId) return false;

      // Company admin can communicate with anyone in their company
      if (user.role === "company_admin") return true;

      // Manager can communicate with their assigned employees and company admin
      if (user.role === "manager") {
        return (
          otherUser.role === "company_admin" ||
          (otherUser.role === "employee" && otherUser.managerId === user.id)
        );
      }

      // Employee can communicate with their manager and company admin
      if (user.role === "employee") {
        return (
          otherUser.role === "company_admin" ||
          (otherUser.role === "manager" && user.managerId === otherUser.id)
        );
      }

      return false;
    });
  }, [allUsers, user]);

  useEffect(() => {
    fetchContacts().catch((err) => {
      toast.error("Failed to load contacts");
      console.error(err);
    });
  }, [fetchContacts]);

  useEffect(() => {
    if (selectedContact) {
      fetchMessages(selectedContact.id).catch((err) => {
        toast.error("Failed to load messages");
        console.error(err);
      });
    }
  }, [selectedContact, fetchMessages]);

  useEffect(() => {
    if (error) {
      toast.error(error);
      clearError();
    }
  }, [error, clearError]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, selectedContact]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim() || !selectedContact || isSending) return;

    const text = messageText.trim();
    setMessageText("");
    setIsSending(true);

    try {
      await sendMessage(selectedContact.id, text);
    } catch (error) {
      toast.error("Failed to send message");
      setMessageText(text); // Restore message on error
    } finally {
      setIsSending(false);
    }
  };

  const handleSendVoice = async (audioBlob: Blob) => {
    if (!selectedContact) return;

    setIsSending(true);
    try {
      await sendVoiceMessage(selectedContact.id, audioBlob);
      toast.success("Voice message sent!");
    } catch (error) {
      toast.error("Failed to send voice message");
    } finally {
      setIsSending(false);
    }
  };

  const currentMessages = selectedContact
    ? messages[selectedContact.id] || []
    : [];

  return (
    <div className="flex h-[calc(100vh-8rem)]">
      {/* Contacts Sidebar */}
      <div className="w-1/3 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Contacts</h2>
        </div>

        <div className="flex-1 overflow-y-auto">
          {availableUsers.map((contact) => (
            <button
              key={contact.id}
              onClick={() => setSelectedContact(contact)}
              className={`w-full p-4 text-left hover:bg-gray-50 border-b border-gray-100 ${
                selectedContact?.id === contact.id
                  ? "bg-blue-50 border-blue-200"
                  : ""
              }`}
            >
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
                  <span className="text-sm font-medium text-gray-700">
                    {contact.firstName.charAt(0)}
                    {contact.lastName.charAt(0)}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {contact.firstName} {contact.lastName}
                  </p>
                  <p className="text-sm text-gray-500 truncate">
                    {contact.email}
                  </p>
                  <div className="flex items-center mt-1">
                    {/* <div
                      className={`w-2 h-2 rounded-full mr-2 ${
                        contact.presence_status === "available"
                          ? "bg-green-400"
                          : "bg-gray-400"
                      }`}
                    ></div> */}
                    {/* <span className="text-xs text-gray-500 capitalize">
                      {contact.presence_status}
                    </span> */}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedContact ? (
          <>
            {/* Chat Header */}
            <div className="p-4 bg-white border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                {selectedContact.firstName} {selectedContact.lastName}
              </h3>
              <p className="text-sm text-gray-500">{selectedContact.email}</p>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {currentMessages.map((message) => (
                <ChatMessage
                  key={message.id}
                  message={message}
                  isOwn={message.sender === "me"} // Adjust based on your logic
                />
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="p-4 bg-white border-t border-gray-200">
              <form
                onSubmit={handleSendMessage}
                className="flex items-end space-x-2"
              >
                <div className="flex-1">
                  <textarea
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    placeholder="Type a message..."
                    rows={1}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage(e);
                      }
                    }}
                  />
                </div>

                <VoiceRecorder
                  onSendVoice={handleSendVoice}
                  disabled={isSending}
                />

                <button
                  type="submit"
                  disabled={!messageText.trim() || isSending}
                  className="p-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className="h-5 w-5" />
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <MessageCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Select a contact
              </h3>
              <p className="text-gray-600">
                Choose a contact from the sidebar to start chatting.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
