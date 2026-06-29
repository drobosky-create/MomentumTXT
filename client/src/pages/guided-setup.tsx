import { useState, useRef, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Send,
  Settings,
  Sparkles,
  CheckCircle,
  Loader2,
  Bot,
  User,
  ArrowRight,
} from "lucide-react";

interface Message {
  id: string;
  role: "assistant" | "user";
  content: string;
  timestamp: Date;
  suggestions?: string[];
  actions?: SetupAction[];
}

interface SetupAction {
  type: "create_company" | "create_kpis" | "add_recipient" | "complete_setup";
  label: string;
  data?: Record<string, unknown>;
  completed?: boolean;
}

interface ConversationState {
  step:
    | "greeting"
    | "business_info"
    | "industry_details"
    | "goals"
    | "kpi_generation"
    | "kpi_selection"
    | "recipients"
    | "schedule"
    | "complete";
  collectedData: {
    companyName?: string;
    industry?: string;
    businessDescription?: string;
    goals?: string[];
    teamSize?: string;
    selectedKpis?: Array<{ name: string; description: string }>;
    recipients?: Array<{ name: string; phone: string }>;
    smsSchedule?: string;
  };
}

export default function GuidedSetup() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      content:
        "Hi! I'm your KPIFlow setup assistant. I'll help you get your business metrics tracking up and running in just a few minutes. Let's start with the basics — what's your company name?",
      timestamp: new Date(),
    },
  ]);

  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [conversationState, setConversationState] = useState<ConversationState>({
    step: "business_info",
    collectedData: {},
  });

  const chatMutation = useMutation({
    mutationFn: async (userMessage: string) => {
      // Build conversation history from messages for context
      const conversationHistory = messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      }));

      const response = await apiRequest("POST", "/api/setup/chat", {
        message: userMessage,
        conversationState,
        conversationHistory,
      });
      return await response.json();
    },
    onSuccess: (data) => {
      setIsTyping(false);

      const assistantMessage: Message = {
        id: Date.now().toString(),
        role: "assistant",
        content: data.message,
        timestamp: new Date(),
        suggestions: data.suggestions,
        actions: data.actions,
      };

      setMessages((prev) => [...prev, assistantMessage]);

      if (data.newState) {
        setConversationState(data.newState);
      }

      if (data.setupComplete) {
        queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
        queryClient.invalidateQueries({ queryKey: ["/api/kpis"] });
        toast({
          title: "Setup Complete!",
          description: "Your KPIFlow dashboard is ready to use.",
        });
      }
    },
    onError: (error: Error) => {
      setIsTyping(false);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleSend = () => {
    if (!inputValue.trim() || chatMutation.isPending) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: inputValue.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setIsTyping(true);

    chatMutation.mutate(inputValue.trim());
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInputValue(suggestion);
    inputRef.current?.focus();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const goToManualSetup = () => {
    setLocation("/setup");
  };

  const goToDashboard = () => {
    setLocation("/");
  };

  return (
    <div className="min-h-screen bg-background flex">
      <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full">
        <header className="border-b border-border p-4 flex items-center justify-between bg-card/50 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="font-semibold text-foreground">KPIFlow Setup Assistant</h1>
              <p className="text-sm text-muted-foreground">Guided configuration</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={goToManualSetup}
            data-testid="button-switch-manual"
          >
            <Settings className="h-4 w-4 mr-2" />
            Switch to Manual
          </Button>
        </header>

        <ScrollArea className="flex-1 p-6" ref={scrollRef}>
          <div className="space-y-6 pb-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}
                data-testid={`message-${message.role}-${message.id}`}
              >
                {message.role === "assistant" && (
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Bot className="h-4 w-4 text-primary" />
                  </div>
                )}

                <div className={`max-w-[80%] ${message.role === "user" ? "order-first" : ""}`}>
                  <Card
                    className={`${
                      message.role === "user"
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-card/80 backdrop-blur-xl border-border"
                    }`}
                  >
                    <CardContent className="p-4">
                      <p className="whitespace-pre-wrap">{message.content}</p>
                    </CardContent>
                  </Card>

                  {message.suggestions && message.suggestions.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {message.suggestions.map((suggestion, idx) => (
                        <Button
                          key={idx}
                          variant="outline"
                          size="sm"
                          className="text-sm bg-card/50 hover:bg-primary/10 hover:text-primary hover:border-primary/50"
                          onClick={() => handleSuggestionClick(suggestion)}
                          data-testid={`suggestion-${idx}`}
                        >
                          {suggestion}
                        </Button>
                      ))}
                    </div>
                  )}

                  {message.actions && message.actions.length > 0 && (
                    <div className="mt-4 space-y-2">
                      {message.actions.map((action, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-sm">
                          {action.completed ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          ) : (
                            <Loader2 className="h-4 w-4 text-muted-foreground animate-spin" />
                          )}
                          <span
                            className={
                              action.completed ? "text-muted-foreground" : "text-foreground"
                            }
                          >
                            {action.label}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {message.role === "user" && (
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                    <User className="h-4 w-4 text-muted-foreground" />
                  </div>
                )}
              </div>
            ))}

            {isTyping && (
              <div className="flex gap-3 justify-start">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
                <Card className="bg-card/80 backdrop-blur-xl border-border">
                  <CardContent className="p-4">
                    <div className="flex gap-1">
                      <span
                        className="w-2 h-2 bg-primary/60 rounded-full animate-bounce"
                        style={{ animationDelay: "0ms" }}
                      />
                      <span
                        className="w-2 h-2 bg-primary/60 rounded-full animate-bounce"
                        style={{ animationDelay: "150ms" }}
                      />
                      <span
                        className="w-2 h-2 bg-primary/60 rounded-full animate-bounce"
                        style={{ animationDelay: "300ms" }}
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {conversationState.step === "complete" && (
              <div className="flex justify-center mt-8">
                <Button size="lg" onClick={goToDashboard} data-testid="button-go-to-dashboard">
                  Go to Dashboard
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="border-t border-border p-4 bg-card/50 backdrop-blur-xl">
          <div className="flex items-center gap-2">
            <div className="flex-1 relative">
              <Input
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type your response..."
                className="pr-12 bg-background/50 border-border focus:border-primary"
                disabled={chatMutation.isPending || conversationState.step === "complete"}
                data-testid="input-chat-message"
              />
            </div>
            <Button
              onClick={handleSend}
              disabled={
                !inputValue.trim() ||
                chatMutation.isPending ||
                conversationState.step === "complete"
              }
              className="px-4"
              data-testid="button-send-message"
            >
              {chatMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>

          <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                Step:{" "}
                {conversationState.step.replace("_", " ").charAt(0).toUpperCase() +
                  conversationState.step.replace("_", " ").slice(1)}
              </Badge>
            </div>
            <span>Press Enter to send</span>
          </div>
        </div>
      </div>
    </div>
  );
}
