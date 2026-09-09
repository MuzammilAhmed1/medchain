import { useState, useRef, useEffect } from "react";
import { X, Sparkles, Send, ArrowUpRight, Bot, User, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";
import { assistantApi } from "../../services/assistantApi";
import { useAuth } from "../../context/AuthContext";

export default function AssistantDrawer({ isOpen, onClose }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content:
        `Hello ${user?.name || ""}! I am your **MedChain AI Supply-Chain Assistant**.\n\n` +
        `I analyze your authorized batches, transfers, sensor telemetry, and blockchain custody logs directly from the database.\n\n` +
        `How can I assist your team today?`,
      referencedBatchIds: [],
      suggestedActions: [
        "Where is my shipment?",
        "Which batches are high risk?",
        "Show recent cold-chain alerts",
      ],
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleSend = async (queryText) => {
    const text = queryText || input;
    if (!text.trim() || loading) return;

    const userMsg = { role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    if (!queryText) setInput("");
    setLoading(true);

    try {
      const res = await assistantApi.queryAssistant(text);
      const botMsg = {
        role: "assistant",
        content: res.answerMarkdown,
        referencedBatchIds: res.referencedBatchIds || [],
        suggestedActions: res.suggestedActions || [],
      };
      setMessages((prev) => [...prev, botMsg]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `⚠️ **Error retrieving context**: ${err.message || "Failed to communicate with AI Assistant service."}`,
          referencedBatchIds: [],
          suggestedActions: ["Retry query"],
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-ink/30 backdrop-blur-xs transition-opacity" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-lg bg-surface border-l border-border shadow-xl flex flex-col">
          {/* Header */}
          <div className="p-5 border-b border-border flex items-center justify-between bg-surface">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-xs bg-primary-tint text-primary border border-primary/20">
                <Sparkles size={18} />
              </div>
              <div>
                <h2 className="text-h3 font-semibold text-ink flex items-center gap-2">
                  AI Assistant
                  <span className="text-xs font-normal px-2 py-0.5 rounded-full bg-canvas border border-border text-ink-muted">
                    {user?.role}
                  </span>
                </h2>
                <p className="text-xs text-ink-muted">Role-authorized database intelligence</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-xs hover:bg-canvas text-ink-muted hover:text-ink transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Messages Feed */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-canvas/50">
            {messages.map((m, idx) => (
              <div
                key={idx}
                className={`flex gap-3 ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {m.role === "assistant" && (
                  <div className="w-8 h-8 rounded-full bg-primary-tint border border-primary/20 flex items-center justify-center text-primary shrink-0 mt-0.5">
                    <Bot size={16} />
                  </div>
                )}
                <div
                  className={`max-w-[85%] rounded-xs p-4 text-small leading-relaxed shadow-xs ${
                    m.role === "user"
                      ? "bg-primary text-white"
                      : "bg-surface border border-border text-ink"
                  }`}
                >
                  <div className="whitespace-pre-line prose prose-sm max-w-none">
                    {m.content}
                  </div>

                  {/* Referenced Batch links */}
                  {m.referencedBatchIds && m.referencedBatchIds.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-border/60">
                      <p className="text-xs font-medium text-ink-muted mb-1.5">Referenced Batches:</p>
                      <div className="flex flex-wrap gap-1.5">
                        {m.referencedBatchIds.map((bId) => (
                          <Link
                            key={bId}
                            to={`/app/batches/${bId}`}
                            onClick={onClose}
                            className="inline-flex items-center gap-1 text-xs font-mono px-2 py-0.5 rounded-xs bg-canvas border border-border text-primary hover:underline"
                          >
                            {bId} <ArrowUpRight size={12} />
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Suggested follow-up prompts */}
                  {m.suggestedActions && m.suggestedActions.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-border/60">
                      <p className="text-xs font-medium text-ink-muted mb-1.5">Suggested Prompts:</p>
                      <div className="flex flex-wrap gap-1.5">
                        {m.suggestedActions.map((action, aIdx) => (
                          <button
                            key={aIdx}
                            onClick={() => handleSend(action)}
                            className="text-xs px-2.5 py-1 rounded-full bg-primary-tint/60 text-primary hover:bg-primary-tint border border-primary/20 transition-colors text-left"
                          >
                            {action}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                {m.role === "user" && (
                  <div className="w-8 h-8 rounded-full bg-ink-muted/20 border border-border flex items-center justify-center text-ink shrink-0 mt-0.5">
                    <User size={16} />
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <div className="flex gap-3 justify-start">
                <div className="w-8 h-8 rounded-full bg-primary-tint border border-primary/20 flex items-center justify-center text-primary shrink-0">
                  <Bot size={16} />
                </div>
                <div className="bg-surface border border-border rounded-xs p-3 text-small text-ink-muted flex items-center gap-2">
                  <span className="inline-block w-2 h-2 rounded-full bg-primary animate-ping" />
                  Querying database & computing intelligence...
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Box */}
          <div className="p-4 border-t border-border bg-surface">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="flex gap-2"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about batch risk, expiries, anomalies, or trust..."
                className="flex-1 px-3 py-2 text-small bg-canvas border border-border rounded-xs focus:outline-hidden focus:border-primary"
                disabled={loading}
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="px-4 py-2 bg-primary text-white rounded-xs text-small font-medium hover:bg-primary-hover disabled:opacity-50 transition-colors flex items-center gap-1.5 shrink-0"
              >
                <Send size={15} /> Send
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
