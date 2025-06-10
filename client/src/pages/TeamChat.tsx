import React, { useState, useEffect, useRef } from 'react';
import { useZoomStore } from '../store/newZoomStore';
import { 
  Send, 
  Mic, 
  MicOff, 
  Paperclip, 
  Users, 
  MessageCircle, 
  Edit3, 
  Trash2, 
  X,
  Phone,
  Video,
  MoreVertical,
  Search,
  Plus
} from 'lucide-react';

const ZoomChat: React.FC = () => {
  const {
    contacts,
    messages,
    channels,
    selectedContact,
    selectedChannel,
    isLoading,
    error,
    fetchContacts,
    fetchMessages,
    sendMessage,
    sendVoiceMessage,
    sendFileMessage,
    editMessage,
    deleteMessage,
    fetchChannels,
    createChannel,
    setSelectedContact,
    setSelectedChannel,
    clearError
  } = useZoomStore();

  const [messageInput, setMessageInput] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateChannel, setShowCreateChannel] = useState(false);
  const [newChannelName, setNewChannelName] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load data on component mount
  useEffect(() => {
    fetchContacts();
    fetchChannels();
  }, [fetchContacts, fetchChannels]);

  // Load messages when contact/channel is selected
  useEffect(() => {
    if (selectedContact) {
      fetchMessages(selectedContact.id, false);
    } else if (selectedChannel) {
      fetchMessages(selectedChannel.id, true);
    }
  }, [selectedContact, selectedChannel, fetchMessages]);

  // Auto scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Filter contacts based on search
  const filteredContacts = contacts.filter((contact: { firstName: any; lastName: any; email: string; }) =>
    `${contact.firstName} ${contact.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contact.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSendMessage = async () => {
    if (!messageInput.trim()) return;
    
    const targetId = selectedContact?.id || selectedChannel?.id;
    if (!targetId) return;

    try {
      await sendMessage(targetId, messageInput, !!selectedChannel);
      setMessageInput('');
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: BlobPart[] = [];

      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = async () => {
        const audioBlob = new Blob(chunks, { type: 'audio/webm' });
        const targetId = selectedContact?.id || selectedChannel?.id;
        if (targetId) {
          try {
            await sendVoiceMessage(targetId, audioBlob, !!selectedChannel);
          } catch (error) {
            console.error('Failed to send voice message:', error);
          }
        }
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
    } catch (error) {
      console.error('Failed to start recording:', error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorder) {
      mediaRecorder.stop();
      setMediaRecorder(null);
      setIsRecording(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const targetId = selectedContact?.id || selectedChannel?.id;
    if (!targetId) return;

    try {
      await sendFileMessage(targetId, file, !!selectedChannel);
      e.target.value = '';
    } catch (error) {
      console.error('Failed to send file:', error);
    }
  };

  const handleEditMessage = async (messageId: string) => {
    if (!editingText.trim()) return;
    
    const targetId = selectedContact?.id || selectedChannel?.id;
    if (!targetId) return;

    try {
      await editMessage(messageId, editingText, targetId, !!selectedChannel);
      setEditingMessageId(null);
      setEditingText('');
    } catch (error) {
      console.error('Failed to edit message:', error);
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    const targetId = selectedContact?.id || selectedChannel?.id;
    if (!targetId) return;

    try {
      await deleteMessage(messageId, targetId, !!selectedChannel);
    } catch (error) {
      console.error('Failed to delete message:', error);
    }
  };

  const handleCreateChannel = async () => {
    if (!newChannelName.trim()) return;

    try {
      await createChannel(newChannelName, 3, selectedMembers);
      setShowCreateChannel(false);
      setNewChannelName('');
      setSelectedMembers([]);
    } catch (error) {
      console.error('Failed to create channel:', error);
    }
  };

  const currentMessages = selectedContact 
    ? messages[selectedContact.id] || []
    : selectedChannel 
    ? messages[selectedChannel.id] || []
    : [];

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-xl font-semibold text-gray-900">Zoom Chat</h1>
            <button
              onClick={() => setShowCreateChannel(true)}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full"
            >
              <Plus size={20} />
            </button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Search contacts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Contacts and Channels List */}
        <div className="flex-1 overflow-y-auto">
          {/* Channels Section */}
          {channels.length > 0 && (
            <div className="p-3">
              <h3 className="text-sm font-medium text-gray-500 mb-2 flex items-center">
                <Users size={16} className="mr-1" />
                Channels
              </h3>
              {channels.map((channel:any) => (
                <div
                  key={channel.id}
                  onClick={() => setSelectedChannel(channel)}
                  className={`flex items-center p-3 rounded-lg cursor-pointer hover:bg-gray-50 ${
                    selectedChannel?.id === channel.id ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                  }`}
                >
                  <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center mr-3">
                    <Users size={20} className="text-gray-600" />
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">#{channel.name}</div>
                    <div className="text-sm text-gray-500">{channel.member_count || 0} members</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Contacts Section */}
          <div className="p-3">
            <h3 className="text-sm font-medium text-gray-500 mb-2 flex items-center">
              <MessageCircle size={16} className="mr-1" />
              Direct Messages
            </h3>
            {isLoading ? (
              <div className="text-center py-4 text-gray-500">Loading...</div>
            ) : (
              filteredContacts.map((contact:any) => (
                <div
                  key={contact.id}
                  onClick={() => setSelectedContact(contact)}
                  className={`flex items-center p-3 rounded-lg cursor-pointer hover:bg-gray-50 ${
                    selectedContact?.id === contact.id ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                  }`}
                >
                  <div className="relative">
                    <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-medium mr-3">
                      {contact.firstName.charAt(0)}{contact.lastName.charAt(0)}
                    </div>
                    <div className={`absolute bottom-0 right-2 w-3 h-3 border-2 border-white rounded-full ${
                      contact.presence_status === 'available' ? 'bg-green-500' :
                      contact.presence_status === 'away' ? 'bg-yellow-500' :
                      contact.presence_status === 'busy' ? 'bg-red-500' :
                      'bg-gray-400'
                    }`} />
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">
                      {contact.firstName} {contact.lastName}
                    </div>
                    <div className="text-sm text-gray-500">{contact.email}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedContact || selectedChannel ? (
          <>
            {/* Chat Header */}
            <div className="bg-white border-b border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-medium mr-3">
                    {selectedContact ? (
                      `${selectedContact.firstName.charAt(0)}${selectedContact.lastName.charAt(0)}`
                    ) : (
                      <Users size={20} />
                    )}
                  </div>
                  <div>
                    <h2 className="font-semibold text-gray-900">
                      {selectedContact 
                        ? `${selectedContact.firstName} ${selectedContact.lastName}`
                        : `#${selectedChannel?.name}`
                      }
                    </h2>
                    <p className="text-sm text-gray-500">
                      {selectedContact 
                        ? selectedContact.presence_status 
                        : `${selectedChannel?.member_count || 0} members`
                      }
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full">
                    <Phone size={20} />
                  </button>
                  <button className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full">
                    <Video size={20} />
                  </button>
                  <button className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full">
                    <MoreVertical size={20} />
                  </button>
                </div>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {currentMessages.map((message:any) => (
                <div key={message.id} className="flex items-start space-x-3 group">
                  <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center text-xs font-medium">
                    {message.sender.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="font-medium text-gray-900">{message.sender}</span>
                      <span className="text-xs text-gray-500">
                        {new Date(message.date_time).toLocaleTimeString()}
                      </span>
                    </div>
                    {editingMessageId === message.id ? (
                      <div className="flex items-center space-x-2">
                        <input
                          type="text"
                          value={editingText}
                          onChange={(e) => setEditingText(e.target.value)}
                          className="flex-1 px-3 py-1 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          onKeyPress={(e) => e.key === 'Enter' && handleEditMessage(message.id)}
                        />
                        <button
                          onClick={() => handleEditMessage(message.id)}
                          className="text-blue-600 hover:text-blue-700"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingMessageId(null)}
                          className="text-gray-500 hover:text-gray-700"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div className="bg-gray-50 rounded-lg p-3 max-w-md">
                        {message.message_type === 'file' ? (
                          <div className="flex items-center space-x-2">
                            <Paperclip size={16} className="text-gray-500" />
                            <a
                              href={message.file_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline"
                            >
                              {message.file_name}
                            </a>
                          </div>
                        ) : message.message_type === 'voice' ? (
                          <div className="flex items-center space-x-2">
                            <Mic size={16} className="text-gray-500" />
                            <audio controls src={message.file_url} className="max-w-xs" />
                          </div>
                        ) : (
                          <p className="text-gray-900">{message.message}</p>
                        )}
                      </div>
                    )}
                    <div className="opacity-0 group-hover:opacity-100 flex items-center space-x-2 mt-1">
                      <button
                        onClick={() => {
                          setEditingMessageId(message.id);
                          setEditingText(message.message);
                        }}
                        className="text-xs text-gray-500 hover:text-gray-700"
                      >
                        <Edit3 size={14} />
                      </button>
                      <button
                        onClick={() => handleDeleteMessage(message.id)}
                        className="text-xs text-gray-500 hover:text-red-600"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="bg-white border-t border-gray-200 p-4">
              <div className="flex items-center space-x-3">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full"
                >
                  <Paperclip size={20} />
                </button>
                <button
                  onClick={isRecording ? stopRecording : startRecording}
                  className={`p-2 rounded-full ${
                    isRecording 
                      ? 'text-red-600 bg-red-100 hover:bg-red-200' 
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {isRecording ? <MicOff size={20} /> : <Mic size={20} />}
                </button>
                <div className="flex-1 relative">
                  <textarea
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Type a message..."
                    rows={1}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <button
                  onClick={handleSendMessage}
                  disabled={!messageInput.trim()}
                  className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send size={20} />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <MessageCircle size={64} className="mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Select a conversation
              </h3>
              <p className="text-gray-500">
                Choose a contact or channel to start messaging
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Create Channel Modal */}
      {showCreateChannel && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Create Channel</h3>
              <button
                onClick={() => setShowCreateChannel(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={20} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Channel Name
                </label>
                <input
                  type="text"
                  value={newChannelName}
                  onChange={(e) => setNewChannelName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter channel name"
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowCreateChannel(false)}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateChannel}
                  disabled={!newChannelName.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  Create
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error Toast */}
      {error && (
        <div className="fixed top-4 right-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg flex items-center space-x-2 z-50">
          <span>{error}</span>
          <button onClick={clearError} className="text-red-700 hover:text-red-900">
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  );
};

export default ZoomChat;