import { useState, useEffect } from 'react';
import messageService from '../services/messageService';

export const useConversations = () => {
  const [conversations, setConversations] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchConversations = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await messageService.getConversations();
      setConversations(data);
    } catch (err) {
      setError(err.message || 'Failed to fetch conversations');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchConversations();
  }, []);

  return { conversations, isLoading, error, refetch: fetchConversations };
};

export const useConversation = (conversationId) => {
  const [conversation, setConversation] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchConversation = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await messageService.getConversation(conversationId);
      setConversation(data);
    } catch (err) {
      setError(err.message || 'Failed to fetch conversation');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (conversationId) {
      fetchConversation();
    }
  }, [conversationId]);

  return { conversation, isLoading, error, refetch: fetchConversation };
};

export const useMessages = (conversationId) => {
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchMessages = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await messageService.getMessages(conversationId);
      setMessages(data);
    } catch (err) {
      setError(err.message || 'Failed to fetch messages');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (conversationId) {
      fetchMessages();
    }
  }, [conversationId]);

  return { messages, isLoading, error, refetch: fetchMessages };
};

export const useSendMessage = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const send = async (conversationId, content) => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await messageService.sendMessage(conversationId, content);
      return data;
    } catch (err) {
      setError(err.message || 'Failed to send message');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return { send, isLoading, error };
};

export const useCreateConversation = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const create = async (participantIds) => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await messageService.createConversation(participantIds);
      return data;
    } catch (err) {
      setError(err.message || 'Failed to create conversation');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return { create, isLoading, error };
};
