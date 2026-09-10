/**
 * useAIChat - Hook for managing AI chat conversations
 * All chat history is stored locally on user's device (localStorage)
 */

import { useState, useEffect, useCallback, useRef } from "react";
import {
  ChatMessage,
  ChatConversation,
  getChatHistory,
  getConversationById,
  createConversation,
  addMessageToConversation,
  updateLastMessage,
  deleteConversation,
  clearAllChatHistory,
  sendMessageToAI,
  getAvailableModels,
  AIContext,
} from "@/lib/ai-api";

interface UseAIChatReturn {
  // Current conversation
  currentConversation: ChatConversation | null;
  conversations: ChatConversation[];
  isLoading: boolean;
  isStreaming: boolean;
  error: string | null;
  availableModels: string[];
  selectedModel: string;
  streamingContent: string;

  // Actions
  selectConversation: (id: string) => void;
  createNewConversation: (firstMessage?: string) => void;
  deleteConversation: (id: string) => void;
  clearAllHistory: () => void;
  sendMessage: (content: string) => Promise<void>;
  setStreamingContent: (content: string) => void;
  setSelectedModel: (model: string) => void;
  refreshModels: () => Promise<void>;
}

export function useAIChat(aiContext?: AIContext): UseAIChatReturn {
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [currentConversation, setCurrentConversation] = useState<ChatConversation | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>("llama2");
  const [streamingContent, setStreamingContent] = useState("");
  
  const abortControllerRef = useRef<AbortController | null>(null);

  // Load conversations on mount
  useEffect(() => {
    const history = getChatHistory();
    setConversations(history);
    refreshModels();
  }, []);

  // Refresh available models
  const refreshModels = async () => {
    try {
      const models = await getAvailableModels();
      setAvailableModels(models);
      if (models.length > 0 && !models.includes(selectedModel)) {
        setSelectedModel(models[0]);
      }
    } catch (err) {
      console.error("Failed to refresh models:", err);
    }
  };

  // Select a conversation
  const selectConversation = useCallback((id: string) => {
    const conversation = getConversationById(id);
    setCurrentConversation(conversation);
    setError(null);
  }, []);

  // Create new conversation
  const createNewConversation = useCallback((firstMessage: string = "") => {
    if (firstMessage) {
      const newConv = createConversation(firstMessage);
      setConversations(prev => [newConv, ...prev]);
      setCurrentConversation(newConv);
    } else {
      setCurrentConversation(null);
    }
    setError(null);
  }, []);

  // Delete conversation
  const deleteConversationById = useCallback((id: string) => {
    deleteConversation(id);
    setConversations(prev => prev.filter(c => c.id !== id));
    if (currentConversation?.id === id) {
      setCurrentConversation(null);
    }
  }, [currentConversation]);

  // Clear all history
  const clearAllHistoryWrapper = useCallback(() => {
    clearAllChatHistory();
    setConversations([]);
    setCurrentConversation(null);
  }, []);

  // Send message to AI
  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      let conversation = currentConversation;

      // Create new conversation if none selected
      if (!conversation) {
        conversation = createConversation(content);
        setConversations(prev => [conversation!, ...prev]);
        setCurrentConversation(conversation);
      } else {
        // Add user message
        const userMessage: ChatMessage = {
          id: Date.now().toString(),
          role: "user",
          content,
          timestamp: Date.now(),
        };
        addMessageToConversation(conversation.id, userMessage);
        
        // Update local state
        setConversations(prev => prev.map(c => 
          c.id === conversation!.id 
            ? { ...c, messages: [...c.messages, userMessage], updatedAt: Date.now() }
            : c
        ));
        setCurrentConversation(prev => prev ? {
          ...prev,
          messages: [...prev.messages, userMessage],
          updatedAt: Date.now(),
        } : null);
      }

      // Create streaming message placeholder
      const assistantMessageId = Date.now().toString();
      setIsStreaming(true);

      // Abort controller for canceling requests
      abortControllerRef.current = new AbortController();

      let fullResponse = "";

      await sendMessageToAI(
        content,
        conversation.messages,
        selectedModel,
        aiContext, // Pass context for AI awareness
        (chunk) => {
          fullResponse += chunk;
          
          // Update streaming content for typing indicator (only for display, not saved)
          setStreamingContent(fullResponse);
        }
      );

      // Streaming complete - now add the full message to conversation
      const assistantMessage: ChatMessage = {
        id: Date.now().toString(),
        role: "assistant",
        content: fullResponse,
        timestamp: Date.now(),
      };
      
      addMessageToConversation(conversation.id, assistantMessage);
      
      // Update local state
      setConversations(prev => prev.map(c => 
        c.id === conversation!.id 
          ? { ...c, messages: [...c.messages, assistantMessage], updatedAt: Date.now() }
          : c
      ));
      setCurrentConversation(prev => prev ? {
        ...prev,
        messages: [...prev.messages, assistantMessage],
        updatedAt: Date.now(),
      } : null);
      
      // Clear streaming content when done
      setStreamingContent("");

    } catch (err: any) {
      if (err.name === "AbortError") {
        setError("Request canceled");
      } else {
        console.error("AI chat error:", err);
        setError(err.message || "Failed to send message. Please check if the AI server is available.");
      }
    } finally {
      setIsLoading(false);
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  }, [currentConversation, selectedModel, aiContext]);

  // Cancel ongoing request
  const cancelRequest = useCallback(() => {
    abortControllerRef.current?.abort();
  }, []);

  return {
    currentConversation,
    conversations,
    isLoading,
    isStreaming,
    error,
    availableModels,
    selectedModel,
    streamingContent,
    selectConversation,
    createNewConversation,
    deleteConversation: deleteConversationById,
    clearAllHistory: clearAllHistoryWrapper,
    sendMessage,
    setStreamingContent,
    setSelectedModel,
    refreshModels,
  };
}
