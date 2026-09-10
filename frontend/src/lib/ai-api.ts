/**
 * AI Chat API - Connects to Ollama API endpoint
 * All chat history is stored locally on user's device (localStorage)
 */

const OLLAMA_API_URL = "http://161.97.89.230:11434/api";
const DEFAULT_MODEL = "llama2"; // Default model - can be changed

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

export interface ChatConversation {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
}

// Context for AI awareness
export interface AIContext {
  user?: {
    name: string;
    email: string;
    role: "student" | "instructor" | "admin";
  };
  currentCourse?: {
    id: string;
    title: string;
    description: string;
    instructorName: string;
  };
  enrolledCourses?: Array<{
    id: string;
    title: string;
    progress: number;
  }>;
  currentPage?: string;
  learningPath?: string[];
}

// Generate unique ID
const generateId = () =>
  `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

/**
 * Build a system prompt with context awareness
 */
function buildSystemPrompt(context?: AIContext): string {
  const parts: string[] = [];

  parts.push("You are an AI assistant for Alpha.");
  parts.push("You are helpful, knowledgeable, and supportive.");
  parts.push(
    "When users ask your name, respond: 'I'm your AI assistant for Alpha.'",
  );
  parts.push("Be helpful, encouraging, and educational in your responses.");
  parts.push("You take pride in being part of the Alpha community.");

  if (context?.user) {
    parts.push(`\nUser Context:`);
    parts.push(`- Name: ${context.user.name}`);
    parts.push(`- Role: ${context.user.role}`);
    parts.push(`- Email: ${context.user.email}`);

    if (context.user.role === "student") {
      parts.push(
        "\nYou are primarily helping them with their studies. Offer study tips, explain concepts, and encourage their learning journey.",
      );
    } else if (context.user.role === "instructor") {
      parts.push(
        "\nYou are assisting them with teaching. Help with course creation, student management, and educational strategies.",
      );
    } else if (context.user.role === "admin") {
      parts.push(
        "\nYou are assisting with platform administration. Help with user management, system oversight, and platform optimization.",
      );
    }
  }

  if (context?.currentCourse) {
    parts.push(`\nCurrent Course Context:`);
    parts.push(`- Course: ${context.currentCourse.title}`);
    parts.push(`- Instructor: ${context.currentCourse.instructorName}`);
    if (context.currentCourse.description) {
      parts.push(
        `- Description: ${context.currentCourse.description.slice(0, 200)}...`,
      );
    }
    parts.push(
      "\nThe user is currently viewing this course. Tailor your responses to be relevant to this course content.",
    );
  }

  if (context?.enrolledCourses && context.enrolledCourses.length > 0) {
    parts.push(
      `\nUser's Enrolled Courses (${context.enrolledCourses.length} total):`,
    );
    context.enrolledCourses.slice(0, 5).forEach((course) => {
      parts.push(`- ${course.title} (${course.progress}% complete)`);
    });
    if (context.enrolledCourses.length > 5) {
      parts.push(`- ...and ${context.enrolledCourses.length - 5} more courses`);
    }
  }

  if (context?.currentPage) {
    parts.push(`\nCurrent Page: ${context.currentPage}`);
    parts.push(
      "Consider what the user might need help with based on where they are in the platform.",
    );
  }

  if (context?.learningPath && context.learningPath.length > 0) {
    parts.push(`\nLearning Path Progress:`);
    parts.push(
      context.learningPath.map((item, i) => `${i + 1}. ${item}`).join(" → "),
    );
  }

  parts.push("\n\nResponse Guidelines:");
  parts.push("- Keep responses concise but informative");
  parts.push("- Use encouraging language for students");
  parts.push("- Provide actionable advice");
  parts.push("- If asked about something outside your knowledge, be honest");
  parts.push("- Reference their courses and progress when relevant");
  parts.push("- Always be helpful and supportive");

  return parts.join("\n");
}

/**
 * Send a message to Ollama API and get streaming response
 */
export async function sendMessageToAI(
  message: string,
  conversationHistory: ChatMessage[],
  model: string = DEFAULT_MODEL,
  context?: AIContext,
  onChunk?: (chunk: string) => void,
): Promise<string> {
  // Build system message with context
  const systemMessage = {
    role: "system" as const,
    content: buildSystemPrompt(context),
  };

  // Format messages for Ollama (include system prompt first)
  const messages = [
    systemMessage,
    ...conversationHistory.map((msg) => ({
      role: msg.role as "user" | "assistant",
      content: msg.content,
    })),
  ];

  // Add current user message
  messages.push({ role: "user" as const, content: message });

  const response = await fetch(`${OLLAMA_API_URL}/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages,
      stream: !!onChunk, // Enable streaming if callback provided
    }),
  });

  if (!response.ok) {
    throw new Error(`AI API Error: ${response.status}`);
  }

  // Handle streaming response
  if (onChunk && response.body) {
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullResponse = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      // Parse NDJSON (newline-delimited JSON)
      const lines = chunk.split("\n").filter((line) => line.trim());

      for (const line of lines) {
        try {
          const parsed = JSON.parse(line);
          if (parsed.message?.content) {
            const content = parsed.message.content;
            fullResponse += content;
            onChunk(content);
          }
        } catch (e) {
          // Skip invalid JSON lines
        }
      }
    }

    return fullResponse;
  }

  // Non-streaming response
  const data = await response.json();
  return data.message?.content || "";
}

/**
 * Get available models from Ollama
 */
export async function getAvailableModels(): Promise<string[]> {
  try {
    const response = await fetch(`${OLLAMA_API_URL}/tags`);
    if (!response.ok) return [DEFAULT_MODEL];

    const data = await response.json();
    return data.models?.map((m: any) => m.name) || [DEFAULT_MODEL];
  } catch (error) {
    console.error("Failed to fetch models:", error);
    return [DEFAULT_MODEL];
  }
}

/**
 * Check if AI service is available
 */
export async function checkAIAvailability(): Promise<boolean> {
  try {
    const response = await fetch(`${OLLAMA_API_URL}/tags`, {
      method: "GET",
      signal: AbortSignal.timeout(5000), // 5 second timeout
    });
    return response.ok;
  } catch {
    return false;
  }
}

// ============ Local Storage Functions (Chat History stored on user's device) ============

const STORAGE_KEY = "alpha_ai_chat_history";

/**
 * Get all conversations from localStorage
 */
export function getChatHistory(): ChatConversation[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    return JSON.parse(stored);
  } catch (error) {
    console.error("Failed to load chat history:", error);
    return [];
  }
}

/**
 * Save all conversations to localStorage
 */
function saveChatHistory(conversations: ChatConversation[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));
  } catch (error) {
    console.error("Failed to save chat history:", error);
    // Handle storage quota exceeded
    if (error instanceof DOMException && error.name === "QuotaExceededError") {
      // Auto-cleanup: remove oldest conversation
      cleanupOldConversations();
    }
  }
}

/**
 * Get a specific conversation by ID
 */
export function getConversationById(id: string): ChatConversation | null {
  const conversations = getChatHistory();
  return conversations.find((c) => c.id === id) || null;
}

/**
 * Create a new conversation
 */
export function createConversation(firstMessage: string): ChatConversation {
  const newConversation: ChatConversation = {
    id: generateId(),
    title: firstMessage.slice(0, 50) + (firstMessage.length > 50 ? "..." : ""),
    messages: [
      {
        id: generateId(),
        role: "user",
        content: firstMessage,
        timestamp: Date.now(),
      },
    ],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  const conversations = getChatHistory();
  conversations.unshift(newConversation); // Add to top
  saveChatHistory(conversations);

  return newConversation;
}

/**
 * Add a message to an existing conversation
 */
export function addMessageToConversation(
  conversationId: string,
  message: ChatMessage,
): ChatConversation | null {
  const conversations = getChatHistory();
  const conversation = conversations.find((c) => c.id === conversationId);

  if (!conversation) return null;

  conversation.messages.push(message);
  conversation.updatedAt = Date.now();

  // Update title if it's the first user message
  const userMessages = conversation.messages.filter((m) => m.role === "user");
  if (userMessages.length === 1 && message.role === "user") {
    conversation.title =
      message.content.slice(0, 50) + (message.content.length > 50 ? "..." : "");
  }

  // Move to top of list
  conversations.splice(conversations.indexOf(conversation), 1);
  conversations.unshift(conversation);

  saveChatHistory(conversations);
  return conversation;
}

/**
 * Update the last message in a conversation (for streaming)
 */
export function updateLastMessage(
  conversationId: string,
  role: "user" | "assistant",
  content: string,
): ChatConversation | null {
  const conversations = getChatHistory();
  const conversation = conversations.find((c) => c.id === conversationId);

  if (!conversation) return null;

  const lastMessage = conversation.messages[conversation.messages.length - 1];
  if (lastMessage && lastMessage.role === role) {
    lastMessage.content = content;
    conversation.updatedAt = Date.now();
    saveChatHistory(conversations);
  }

  return conversation;
}

/**
 * Delete a conversation
 */
export function deleteConversation(conversationId: string): void {
  const conversations = getChatHistory();
  const filtered = conversations.filter((c) => c.id !== conversationId);
  saveChatHistory(filtered);
}

/**
 * Clear all chat history
 */
export function clearAllChatHistory(): void {
  localStorage.removeItem(STORAGE_KEY);
}

/**
 * Cleanup old conversations (keep last 50)
 */
function cleanupOldConversations(): void {
  const conversations = getChatHistory();
  if (conversations.length > 50) {
    const recent = conversations.slice(0, 50);
    saveChatHistory(recent);
  }
}

/**
 * Get conversation statistics
 */
export function getChatStats(): {
  totalConversations: number;
  totalMessages: number;
} {
  const conversations = getChatHistory();
  const totalMessages = conversations.reduce(
    (sum, c) => sum + c.messages.length,
    0,
  );
  return {
    totalConversations: conversations.length,
    totalMessages,
  };
}
