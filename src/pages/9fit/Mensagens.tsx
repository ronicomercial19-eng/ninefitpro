import { useState, useEffect, useRef } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  ChevronLeft, 
  Send, 
  MessageSquare, 
  Bot, 
  User,
  Loader2,
  Star,
  Mic
} from "lucide-react";
import { BottomNavigation } from "@/components/9fit/BottomNavigation";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

interface Message {
  id: string;
  content: string;
  sender: "user" | "coach" | "ai";
  timestamp: Date;
  senderName?: string;
  senderAvatar?: string;
}

interface Conversation {
  id: string;
  name: string;
  avatar?: string;
  lastMessage: string;
  lastMessageTime: Date;
  unreadCount: number;
  type: "coach" | "ai";
}

// Skeleton component
function ConversationSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map(i => (
        <div key={i} className="flex items-center gap-3 p-4 bg-card border border-border rounded-sm">
          <div className="w-12 h-12 bg-muted rounded-full animate-shimmer" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-muted rounded animate-shimmer w-1/3" />
            <div className="h-3 bg-muted rounded animate-shimmer w-2/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

// Empty state component
function EmptyMessages() {
  return (
    <div className="bg-card border border-border rounded-sm p-8 text-center">
      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
        <MessageSquare className="w-8 h-8 text-primary" />
      </div>
      <h3 className="text-lg font-bold text-foreground mb-2">
        Nenhuma mensagem ainda
      </h3>
      <p className="text-sm text-muted-foreground mb-4">
        Inicie uma conversa com seu personal trainer ou FitCopilot!
      </p>
      <button className="btn-neon px-6 py-3 rounded-sm">
        Nova Mensagem
      </button>
    </div>
  );
}

export default function NineFitMensagens() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchConversations();
  }, [user]);

  useEffect(() => {
    if (selectedConversation) {
      fetchMessages(selectedConversation.id);
    }
  }, [selectedConversation]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const fetchConversations = async () => {
    setLoading(true);
    
    // Simulate API call - in production, fetch from Supabase
    await new Promise(resolve => setTimeout(resolve, 800));
    
    const mockConversations: Conversation[] = [
      {
        id: "1",
        name: "Diego Souza",
        lastMessage: "Excelente treino hoje, Pedro!",
        lastMessageTime: new Date(),
        unreadCount: 1,
        type: "coach"
      },
      {
        id: "ai",
        name: "FitCopilot",
        lastMessage: "Olá! Eu sou o FitCopilot IA. Como posso te ajudar?",
        lastMessageTime: new Date(),
        unreadCount: 0,
        type: "ai"
      }
    ];
    
    setConversations(mockConversations);
    setLoading(false);
  };

  const fetchMessages = async (conversationId: string) => {
    // Simulate fetching messages
    await new Promise(resolve => setTimeout(resolve, 500));
    
    if (conversationId === "ai") {
      setMessages([
        {
          id: "1",
          content: "Olá, Pedro! 👋\n\nSou o FITCOPILOT, seu assistente virtual de fitness. Em que posso te ajudar hoje?",
          sender: "ai",
          timestamp: new Date(Date.now() - 3600000),
          senderName: "FitCopilot"
        }
      ]);
    } else {
      setMessages([
        {
          id: "1",
          content: "Ajustei seu treino de força para amanhã. Vamos com tudo! 💪",
          sender: "coach",
          timestamp: new Date(Date.now() - 7200000),
          senderName: "Diego Souza"
        },
        {
          id: "2",
          content: "Valeu, Alex! Vou conferir o treino e te aviso se tiver alguma dúvida. Obrigado!",
          sender: "user",
          timestamp: new Date(Date.now() - 3600000)
        },
        {
          id: "3",
          content: "Combinado! Se precisar de algo, é só chamar.",
          sender: "coach",
          timestamp: new Date(Date.now() - 1800000),
          senderName: "Diego Souza"
        }
      ]);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || sending) return;
    
    setSending(true);
    
    const userMessage: Message = {
      id: Date.now().toString(),
      content: newMessage,
      sender: "user",
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setNewMessage("");
    
    // Simulate AI response if FitCopilot
    if (selectedConversation?.type === "ai") {
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        content: "Entendi! Vou analisar seu pedido e preparar uma sugestão personalizada para você. 🎯",
        sender: "ai",
        timestamp: new Date(),
        senderName: "FitCopilot"
      };
      
      setMessages(prev => [...prev, aiResponse]);
    }
    
    setSending(false);
    toast.success("Mensagem enviada!");
  };

  // Conversation List View
  if (!selectedConversation) {
    return (
      <div className="min-h-screen bg-background pb-24">
        {/* Header */}
        <div className="px-4 pt-6 pb-4">
          <h1 className="text-2xl font-black italic uppercase tracking-tighter text-foreground">
            Mensagens
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Converse com seu Professor
          </p>
        </div>

        <div className="px-4">
          {loading ? (
            <ConversationSkeleton />
          ) : conversations.length === 0 ? (
            <EmptyMessages />
          ) : (
            <div className="space-y-3">
              {conversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => setSelectedConversation(conv)}
                  className="w-full flex items-center gap-3 p-4 bg-card border border-border rounded-sm hover:border-primary/50 transition-all text-left"
                >
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                    conv.type === "ai" 
                      ? "bg-primary/20" 
                      : "bg-muted"
                  }`}>
                    {conv.type === "ai" ? (
                      <Bot className="w-6 h-6 text-primary" />
                    ) : (
                      <User className="w-6 h-6 text-muted-foreground" />
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-foreground flex items-center gap-2">
                        {conv.name}
                        {conv.type === "coach" && (
                          <span className="flex gap-0.5">
                            {[1,2,3,4,5].map(i => (
                              <Star key={i} className="w-3 h-3 fill-primary text-primary" />
                            ))}
                          </span>
                        )}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {format(conv.lastMessageTime, "HH:mm")}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {conv.lastMessage}
                    </p>
                  </div>
                  
                  {conv.unreadCount > 0 && (
                    <div className="w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                      <span className="text-[10px] font-bold text-primary-foreground">
                        {conv.unreadCount}
                      </span>
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        <BottomNavigation />
      </div>
    );
  }

  // Chat View
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Chat Header */}
      <div className="px-4 py-4 bg-card border-b border-border flex items-center gap-3">
        <button 
          onClick={() => setSelectedConversation(null)}
          className="p-2 hover:bg-muted rounded-sm transition-colors -ml-2"
        >
          <ChevronLeft className="w-5 h-5 text-foreground" />
        </button>
        
        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
          selectedConversation.type === "ai" 
            ? "bg-primary/20" 
            : "bg-muted"
        }`}>
          {selectedConversation.type === "ai" ? (
            <Bot className="w-5 h-5 text-primary" />
          ) : (
            <User className="w-5 h-5 text-muted-foreground" />
          )}
        </div>
        
        <div className="flex-1">
          <h2 className="font-bold text-foreground">{selectedConversation.name}</h2>
          <p className="text-xs text-muted-foreground">
            {selectedConversation.type === "ai" ? "Assistente IA" : "Personal Trainer"}
          </p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-24">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.sender === "user" ? "justify-end" : "justify-start"}`}
          >
            <div className={`max-w-[80%] ${
              message.sender === "user"
                ? "bg-primary text-primary-foreground rounded-tl-lg rounded-tr-sm rounded-bl-lg rounded-br-lg"
                : "bg-card border border-border rounded-tl-sm rounded-tr-lg rounded-bl-lg rounded-br-lg"
            } p-3`}>
              {message.sender !== "user" && (
                <p className={`text-xs font-bold mb-1 ${
                  message.sender === "ai" ? "text-primary" : "text-muted-foreground"
                }`}>
                  {message.senderName}
                </p>
              )}
              <p className={`text-sm whitespace-pre-wrap ${
                message.sender === "user" ? "text-primary-foreground" : "text-foreground"
              }`}>
                {message.content}
              </p>
              <p className={`text-[10px] mt-1 ${
                message.sender === "user" ? "text-primary-foreground/70" : "text-muted-foreground"
              }`}>
                {format(message.timestamp, "HH:mm")}
              </p>
            </div>
          </div>
        ))}
        
        {sending && (
          <div className="flex justify-start">
            <div className="bg-card border border-border rounded-lg p-3">
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="fixed bottom-16 left-0 right-0 p-4 bg-background border-t border-border">
        <div className="flex items-center gap-2 max-w-lg mx-auto">
          <button className="p-3 bg-card border border-border rounded-sm hover:bg-muted transition-colors">
            <Mic className="w-5 h-5 text-muted-foreground" />
          </button>
          
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            placeholder="Digite sua mensagem..."
            className="flex-1 bg-card border border-border rounded-sm px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
          />
          
          <button 
            onClick={sendMessage}
            disabled={!newMessage.trim() || sending}
            className="p-3 bg-primary rounded-sm hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {sending ? (
              <Loader2 className="w-5 h-5 animate-spin text-primary-foreground" />
            ) : (
              <Send className="w-5 h-5 text-primary-foreground" />
            )}
          </button>
        </div>
      </div>

      <BottomNavigation />
    </div>
  );
}
