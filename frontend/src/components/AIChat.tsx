/**
 * AIChat - AI Chat Component with Ollama integration
 * All chat history is stored locally on user's device
 */

import React, { useState, useRef, useEffect } from "react";
import { useAIChat } from "@/hooks/useAIChat";
import { useAIContext } from "@/hooks/useAIContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Send,
  PlusCircle,
  Trash2,
  MessageSquare,
  X,
  Bot,
  User,
  Settings,
  StopCircle,
  ChevronLeft,
  Menu,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { formatDistanceToNow } from "date-fns";

interface AIChatProps {
  isOpen: boolean;
  onClose: () => void;
}

const AIChat: React.FC<AIChatProps> = ({ isOpen, onClose }) => {
  const aiContext = useAIContext(); // Gather context about user, courses, page
  const {
    currentConversation,
    conversations,
    isLoading,
    isStreaming,
    error,
    availableModels,
    selectedModel,
    selectConversation,
    createNewConversation,
    deleteConversation,
    clearAllHistory,
    sendMessage,
    setStreamingContent,
    setSelectedModel,
    streamingContent,
  } = useAIChat(aiContext); // Pass context to AI chat

  const [inputValue, setInputValue] = useState("");
  const [showSidebar, setShowSidebar] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom when new message arrives
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [currentConversation?.messages, streamingContent, isStreaming]);

  // Focus input on mount
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleSend = async () => {
    if (!inputValue.trim() || isLoading) return;

    const message = inputValue.trim();
    setInputValue("");
    await sendMessage(message);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleNewChat = () => {
    createNewConversation();
    setInputValue("");
  };

  const formatTime = (timestamp: number) => {
    return formatDistanceToNow(timestamp, { addSuffix: true });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full h-full sm:h-[600px] sm:w-[900px] bg-background rounded-t-lg sm:rounded-lg shadow-2xl flex overflow-hidden">
        {/* Sidebar - Conversation List */}
        {showSidebar && (
          <div className="w-64 border-r bg-muted/30 flex flex-col">
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <MessageSquare size={16} />
                Chat History
              </h3>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setShowSidebar(false)}
              >
                <ChevronLeft size={14} />
              </Button>
            </div>

            <div className="p-3">
              <Button
                onClick={handleNewChat}
                className="w-full text-sm"
                variant="outline"
              >
                <PlusCircle size={16} className="mr-2" />
                New Chat
              </Button>
            </div>

            <ScrollArea className="flex-1 px-2">
              {conversations.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">
                  No chat history
                </p>
              ) : (
                conversations.map((conv) => (
                  <div
                    key={conv.id}
                    className={`group p-3 mb-2 rounded-lg cursor-pointer transition-colors ${
                      currentConversation?.id === conv.id
                        ? "bg-accent text-accent-foreground"
                        : "hover:bg-muted"
                    }`}
                    onClick={() => selectConversation(conv.id)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {conv.title}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatTime(conv.updatedAt)}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteConversation(conv.id);
                        }}
                      >
                        <Trash2 size={12} />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </ScrollArea>

            <div className="p-3 border-t">
              <Button
                variant="outline"
                size="sm"
                className="w-full text-xs"
                onClick={() => setShowClearConfirm(true)}
              >
                <Trash2 size={14} className="mr-2" />
                Clear All History
              </Button>
            </div>
          </div>
        )}

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <div className="h-14 border-b flex items-center justify-between px-4 bg-muted/30">
            <div className="flex items-center gap-3">
              {!showSidebar && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setShowSidebar(true)}
                >
                  <Menu size={18} />
                </Button>
              )}
              <div className="flex items-center gap-2">
                <Bot size={20} className="text-accent" />
                <div>
                  <h2 className="font-semibold">Alpha AI</h2>
                  <p className="text-xs text-muted-foreground">AI Assistant</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setShowSettings(true)}
              >
                <Settings size={16} />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={onClose}
              >
                <X size={18} />
              </Button>
            </div>
          </div>

          {/* Messages */}
          <ScrollArea ref={scrollRef} className="flex-1 p-4 overflow-y-auto">
            {!currentConversation ||
            currentConversation.messages.length === 0 ? (
              <div className="h-full flex items-center justify-center">
                <div className="text-center max-w-md">
                  <Bot size={48} className="mx-auto text-accent mb-4" />
                  <h3 className="text-lg font-semibold mb-2">
                    Welcome to Alpha
                  </h3>
                  <p className="text-muted-foreground text-sm mb-4">
                    I'm your AI assistant for Alpha! I know about your courses,
                    progress, and where you are in the platform. Ask me anything
                    about your studies.
                  </p>
                  {aiContext?.user && (
                    <div className="bg-muted/50 rounded-lg p-3 mb-4 text-xs text-left">
                      <p className="font-medium mb-1">Current Context:</p>
                      <p>
                        👤 User: {aiContext.user.name} ({aiContext.user.role})
                      </p>
                      {aiContext.currentCourse && (
                        <p>📚 Viewing: {aiContext.currentCourse.title}</p>
                      )}
                      {aiContext.enrolledCourses &&
                        aiContext.enrolledCourses.length > 0 && (
                          <p>
                            📖 Enrolled: {aiContext.enrolledCourses.length}{" "}
                            courses
                          </p>
                        )}
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2 justify-center">
                    {[
                      "Help me study",
                      "Explain my current course",
                      "Study tips",
                    ].map((suggestion) => (
                      <Button
                        key={suggestion}
                        variant="outline"
                        size="sm"
                        className="text-xs"
                        onClick={() => {
                          setInputValue(suggestion);
                          sendMessage(suggestion);
                        }}
                      >
                        {suggestion}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {currentConversation.messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex items-start gap-3 ${
                      message.role === "user" ? "flex-row-reverse" : ""
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        message.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-accent text-accent-foreground"
                      }`}
                    >
                      {message.role === "user" ? (
                        <User size={16} />
                      ) : (
                        <Bot size={16} />
                      )}
                    </div>
                    <div
                      className={`max-w-[70%] rounded-lg p-3 ${
                        message.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap">
                        {message.content}
                      </p>
                      <p
                        className={`text-xs mt-1 ${
                          message.role === "user"
                            ? "text-primary-foreground/70"
                            : "text-muted-foreground"
                        }`}
                      >
                        {formatTime(message.timestamp)}
                      </p>
                    </div>
                  </div>
                ))}

                {/* Thinking indicator (before streaming starts) */}
                {isLoading && !isStreaming && (
                  <div className="flex items-center gap-2 text-muted-foreground text-sm">
                    <div className="h-2 w-2 rounded-full bg-accent animate-bounce" />
                    <div className="h-2 w-2 rounded-full bg-accent animate-bounce [animation-delay:0.2s]" />
                    <div className="h-2 w-2 rounded-full bg-accent animate-bounce [animation-delay:0.4s]" />
                    <span>AI is thinking...</span>
                  </div>
                )}

                {/* Typing indicator with live streaming */}
                {isStreaming && (
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center bg-accent text-accent-foreground">
                      <Bot size={16} />
                    </div>
                    <div className="max-w-[70%] rounded-lg p-3 bg-muted">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="flex gap-1">
                          <div className="h-2 w-2 rounded-full bg-accent animate-bounce" />
                          <div className="h-2 w-2 rounded-full bg-accent animate-bounce [animation-delay:0.2s]" />
                          <div className="h-2 w-2 rounded-full bg-accent animate-bounce [animation-delay:0.4s]" />
                        </div>
                        <span className="text-xs text-muted-foreground">
                          Typing...
                        </span>
                      </div>
                      {streamingContent && (
                        <div className="border-t pt-2 mt-2">
                          <p className="text-sm whitespace-pre-wrap">
                            {streamingContent}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {error && (
                  <div className="text-center text-destructive text-sm bg-destructive/10 p-3 rounded-lg">
                    {error}
                  </div>
                )}
              </div>
            )}
          </ScrollArea>

          {/* Input */}
          <div className="p-4 border-t bg-muted/30">
            <div className="flex items-center gap-2">
              <Input
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type your message..."
                disabled={isLoading}
                className="flex-1"
              />
              {isStreaming ? (
                <Button
                  size="icon"
                  variant="destructive"
                  onClick={() => {}}
                  disabled
                >
                  <StopCircle size={20} />
                </Button>
              ) : (
                <Button
                  size="icon"
                  onClick={handleSend}
                  disabled={isLoading || !inputValue.trim()}
                  className="gradient-accent text-accent-foreground"
                >
                  <Send size={18} />
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-2 text-center">
              Chat history stored locally on your device • Powered by Alpha AI
            </p>
          </div>
        </div>
      </div>

      {/* Settings Dialog */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings size={20} />
              AI Settings
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">AI Model</label>
              <Select value={selectedModel} onValueChange={setSelectedModel}>
                <SelectTrigger>
                  <SelectValue placeholder="Select model" />
                </SelectTrigger>
                <SelectContent>
                  {availableModels.map((model) => (
                    <SelectItem key={model} value={model}>
                      {model}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Available models from your Ollama server
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">API Endpoint</label>
              <Input value="http://161.97.89.230:11434" disabled />
              <p className="text-xs text-muted-foreground">
                Your Ollama server URL
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button onClick={() => setShowSettings(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Clear History Confirmation */}
      <AlertDialog open={showClearConfirm} onOpenChange={setShowClearConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear All Chat History?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete all your chat conversations. This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                clearAllHistory();
                setShowClearConfirm(false);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Clear All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AIChat;
