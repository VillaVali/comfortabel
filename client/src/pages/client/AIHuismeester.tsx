import { useState, useRef, useEffect } from "react";
import { useParams, Link } from "wouter";
import ClientLayout from "../../components/ClientLayout";
import { trpc } from "../../lib/trpc";
import { Bot, Send, User, Loader2, ArrowLeft, Sparkles, AlertCircle } from "lucide-react";
import { PLAN_FEATURES, type SubscriptionTier } from "@shared/const";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
};

const SUGGESTED_QUESTIONS = [
  "Wat zijn de meest urgente onderhoudspunten voor mijn woning?",
  "Welke verduurzamingsmaatregelen zijn het meest rendabel?",
  "Wanneer moet ik mijn CV-ketel vervangen?",
  "Welke subsidies kan ik aanvragen voor mijn woning?",
  "Wat is de staat van mijn dak en wanneer moet ik actie ondernemen?",
  "Hoe verbeter ik het energielabel van mijn woning?",
];

export default function AIHuismeester() {
  const { propertyId } = useParams<{ propertyId: string }>();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState("");
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [monthlyUsage, setMonthlyUsage] = useState(0);
  const [monthlyLimit, setMonthlyLimit] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const { data: properties = [] } = trpc.properties.myProperties.useQuery();
  const property = properties.find((p) => p.id === parseInt(propertyId || "0"));

  const features = property?.subscriptionType
    ? PLAN_FEATURES[property.subscriptionType as SubscriptionTier]
    : null;
  const hasAI = (features?.aiHuismeesterBeperkt || features?.aiHuismeesterUitgebreid) ?? false;
  const isFreeTier = hasAI && !features?.aiHuismeesterUitgebreid;

  // Load chat history
  useEffect(() => {
    if (!property || historyLoaded) return;

    fetch(`/api/chat/${propertyId}/history`, { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        if (data.messages && data.messages.length > 0) {
          const loaded: Message[] = data.messages.map((m: any) => ({
            id: m.id.toString(),
            role: m.role as "user" | "assistant",
            content: m.content,
            timestamp: new Date(m.createdAt),
          }));
          setMessages(loaded);
        } else {
          // Show welcome message if no history
          setMessages([
            {
              id: "welcome",
              role: "assistant",
              content: `Goedendag! Ik ben Mati, uw digitale woonvriend voor **${property.street} ${property.houseNumber}**.\n\nIk heb toegang tot het volledige woningpaspoort en kan u helpen met vragen over onderhoud, verduurzaming, technische kenmerken, subsidies en meer.\n\nWaar kan ik u mee helpen?`,
              timestamp: new Date(),
            },
          ]);
        }
        setMonthlyUsage(data.monthlyUsage ?? 0);
        setMonthlyLimit(data.monthlyLimit ?? null);
        setHistoryLoaded(true);
      })
      .catch(() => {
        // Fallback: show welcome message
        if (property) {
          setMessages([
            {
              id: "welcome",
              role: "assistant",
              content: `Goedendag! Ik ben Mati, uw digitale woonvriend voor **${property.street} ${property.houseNumber}**.\n\nWaar kan ik u mee helpen?`,
              timestamp: new Date(),
            },
          ]);
        }
        setHistoryLoaded(true);
      });
  }, [property, propertyId, historyLoaded]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const isLimitReached = monthlyLimit !== null && monthlyUsage >= monthlyLimit;

  const sendMessage = async (text?: string) => {
    const messageText = text || input.trim();
    if (!messageText || isStreaming || isLimitReached) return;

    setInput("");
    setError("");

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: messageText,
      timestamp: new Date(),
    };

    const updatedMessages = [...messages.filter((m) => m.id !== "welcome"), userMsg];
    setMessages((prev) => [...prev.filter((m) => m.id !== "welcome"), userMsg]);
    setIsStreaming(true);

    const assistantMsgId = (Date.now() + 1).toString();
    const assistantMsg: Message = {
      id: assistantMsgId,
      role: "assistant",
      content: "",
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, assistantMsg]);

    abortRef.current = new AbortController();

    try {
      const response = await fetch(`/api/chat/${propertyId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          messages: updatedMessages.map((m) => ({ role: m.role, content: m.content })),
          userMessage: messageText,
        }),
        signal: abortRef.current.signal,
      });

      if (!response.ok) {
        const err = await response.json();
        if (err.limitReached) {
          setMonthlyUsage(err.monthlyUsage);
          setMonthlyLimit(err.monthlyLimit);
        }
        throw new Error(err.error || "Verbindingsfout");
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("Geen stream");

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6).trim();
            if (data === "[DONE]") continue;
            try {
              const parsed = JSON.parse(data);
              if (parsed.error) throw new Error(parsed.error);
              if (parsed.content) {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantMsgId
                      ? { ...m, content: m.content + parsed.content }
                      : m
                  )
                );
              }
              // Update usage counter from server response
              if (parsed.done) {
                if (parsed.monthlyUsage !== undefined) setMonthlyUsage(parsed.monthlyUsage);
                if (parsed.monthlyLimit !== undefined) setMonthlyLimit(parsed.monthlyLimit);
              }
            } catch (parseErr: any) {
              if (parseErr.message !== "Unexpected end of JSON input") {
                throw parseErr;
              }
            }
          }
        }
      }
    } catch (err: any) {
      if (err.name === "AbortError") return;
      setError(err.message || "Er ging iets mis. Probeer opnieuw.");
      setMessages((prev) => prev.filter((m) => m.id !== assistantMsgId));
    } finally {
      setIsStreaming(false);
      abortRef.current = null;
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (!property || !historyLoaded) {
    return (
      <ClientLayout title="Mati">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-[#1E3A5F]" />
        </div>
      </ClientLayout>
    );
  }

  if (!hasAI) {
    return (
      <ClientLayout title="Mati">
        <div className="max-w-md mx-auto py-12 text-center">
          <div className="w-20 h-20 bg-amber-50 rounded-3xl flex items-center justify-center mx-auto mb-4">
            <Bot className="w-10 h-10 text-amber-500" />
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">Mati</h2>
          <p className="text-slate-500 text-sm mb-6 leading-relaxed">
            Mati, jouw digitale woonvriend, is beschikbaar vanaf het <strong>Digital</strong>-pakket. Upgrade uw abonnement om direct antwoord te krijgen op al uw woningvragen.
          </p>
          <Link
            href="/abonnementen"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#1E3A5F] text-white text-sm font-semibold rounded-xl hover:bg-[#162d4a] transition"
          >
            <Sparkles className="w-4 h-4" />
            Abonnement upgraden
          </Link>
        </div>
      </ClientLayout>
    );
  }

  const remainingQuestions = monthlyLimit !== null ? Math.max(0, monthlyLimit - monthlyUsage) : null;

  return (
    <ClientLayout title="Mati">
      <div className="flex flex-col h-[calc(100vh-120px)] max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4 pb-4 border-b border-slate-100">
          <Link href={`/mijn/woning/${propertyId}`} className="text-slate-400 hover:text-slate-600 transition">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="w-10 h-10 bg-gradient-to-br from-[#1E3A5F] to-[#2d5a9e] rounded-xl flex items-center justify-center">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="font-semibold text-slate-800 text-sm">Mati</h2>
            <p className="text-[11px] text-slate-400 -mt-0.5">Jouw digitale woonvriend</p>
            <p className="text-xs text-slate-400">
              {property.street} {property.houseNumber}
            </p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            {/* Free-tier question counter */}
            {isFreeTier && monthlyLimit !== null && (
              <div className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full ${
                remainingQuestions === 0
                  ? "text-red-600 bg-red-50"
                  : remainingQuestions === 1
                  ? "text-amber-600 bg-amber-50"
                  : "text-slate-500 bg-slate-100"
              }`}>
                <span>{remainingQuestions} van {monthlyLimit} vragen over</span>
              </div>
            )}
            {!isLimitReached && (
              <div className="flex items-center gap-1 text-xs text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                Online
              </div>
            )}
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto space-y-4 pb-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
            >
              {/* Avatar */}
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  msg.role === "assistant"
                    ? "bg-gradient-to-br from-[#1E3A5F] to-[#2d5a9e]"
                    : "bg-slate-200"
                }`}
              >
                {msg.role === "assistant" ? (
                  <Bot className="w-4 h-4 text-white" />
                ) : (
                  <User className="w-4 h-4 text-slate-600" />
                )}
              </div>

              {/* Bubble */}
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                  msg.role === "assistant"
                    ? "bg-white border border-slate-100 text-slate-800 shadow-sm"
                    : "bg-[#1E3A5F] text-white"
                }`}
              >
                {msg.content === "" && msg.role === "assistant" ? (
                  <div className="flex gap-1 items-center py-1">
                    <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                ) : (
                  <div className="whitespace-pre-wrap">{msg.content}</div>
                )}
              </div>
            </div>
          ))}

          {/* Suggested questions (only when just welcome message) */}
          {messages.length <= 1 && !isStreaming && !isLimitReached && (
            <div className="pt-2">
              <p className="text-xs text-slate-400 mb-3 text-center">Veelgestelde vragen</p>
              <div className="grid grid-cols-1 gap-2">
                {SUGGESTED_QUESTIONS.map((q) => (
                  <button
                    key={q}
                    onClick={() => sendMessage(q)}
                    className="text-left text-xs text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl px-3 py-2.5 transition"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Limit reached banner */}
          {isLimitReached && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-center">
              <AlertCircle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
              <p className="text-sm font-semibold text-amber-800 mb-1">Maandlimiet bereikt</p>
              <p className="text-xs text-amber-700 mb-3">
                U heeft uw {monthlyLimit} gratis vragen voor deze maand gebruikt. Upgrade naar Digital of hoger voor onbeperkte toegang.
              </p>
              <Link
                href="/abonnementen"
                className="inline-flex items-center gap-2 px-4 py-2 bg-[#1E3A5F] text-white text-xs font-semibold rounded-xl hover:bg-[#162d4a] transition"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Abonnement upgraden
              </Link>
            </div>
          )}

          {error && (
            <div className="text-center text-xs text-red-500 bg-red-50 rounded-xl px-4 py-2">
              {error}
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="border-t border-slate-100 pt-4">
          {isLimitReached ? (
            <div className="text-center text-xs text-slate-400">
              Upgrade uw abonnement om door te gaan met Mati.
            </div>
          ) : (
            <>
              <div className="flex gap-2 items-end">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Stel een vraag over uw woning..."
                  rows={1}
                  disabled={isStreaming}
                  className="flex-1 resize-none px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/20 focus:border-[#1E3A5F]/40 transition disabled:opacity-50 max-h-32"
                  style={{ minHeight: "48px" }}
                  onInput={(e) => {
                    const t = e.target as HTMLTextAreaElement;
                    t.style.height = "auto";
                    t.style.height = Math.min(t.scrollHeight, 128) + "px";
                  }}
                />
                <button
                  onClick={() => sendMessage()}
                  disabled={!input.trim() || isStreaming}
                  className="w-12 h-12 bg-[#1E3A5F] hover:bg-[#162d4a] disabled:opacity-40 text-white rounded-2xl flex items-center justify-center transition active:scale-95 flex-shrink-0"
                >
                  {isStreaming ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </button>
              </div>
              <p className="text-xs text-slate-400 text-center mt-2">
                Mati heeft toegang tot uw volledige Woningpaspoort™
                {isFreeTier && monthlyLimit !== null && remainingQuestions !== null && remainingQuestions > 0 && (
                  <span className="ml-1 text-amber-600">· {remainingQuestions} vra{remainingQuestions === 1 ? "ag" : "gen"} resterend deze maand</span>
                )}
              </p>
            </>
          )}
        </div>
      </div>
    </ClientLayout>
  );
}
