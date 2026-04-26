// Per-category "Go Deeper" chat drawer.
// Wired to Convex: messages come from useQuery, sending hits the chatRefine action.
// Static greeting on open (NO LLM call) — preserved from original learnings.

import { useState, useEffect, useRef } from "react";
import { X, Send, Sparkles, Plus, Check, AlertTriangle } from "lucide-react";
import { useQuery, useAction, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { C } from "../../config/constants";
import { useToast } from "../../context/useToast";

export default function ChatDrawer({ category, participantId, onClose, onIdeaAdded }) {
  const messages = useQuery(api.canvas.listChatMessages, {
    participantId,
    categoryId: category.id,
  });

  const chatRefine = useAction(api.ai.chatRefine.run);
  const addIdea = useMutation(api.canvas.addIdea);
  const markChatIdeaAdded = useMutation(api.canvas.markChatIdeaAdded);
  const { showToast } = useToast();

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const bottomRef = useRef(null);

  const scroll = () =>
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);

  useEffect(() => {
    scroll();
  }, [messages, loading]);

  // Static opener: shown instantly without an LLM call. The original team
  // learned this shaves 4-6s of latency and lets the user drive direction.
  const showStaticOpener = !messages || messages.length === 0;
  const opener = `Let's explore ${category.title}. What would be most useful to dig into?`;

  const send = async () => {
    if (!input.trim() || loading) return;
    const txt = input.trim();
    setInput("");
    setLoading(true);
    setError(null);
    try {
      await chatRefine({
        participantId,
        categoryId: category.id,
        userMessage: txt,
      });
    } catch (err) {
      setError(err?.message ?? "The AI couldn't connect. Try again?");
    } finally {
      setLoading(false);
    }
  };

  const onAddSuggestion = async (msgId, idx, suggestion) => {
    try {
      await addIdea({
        participantId,
        categoryId: suggestion.categoryId || category.id,
        text: suggestion.text,
        source: "chat",
      });
      await markChatIdeaAdded({
        participantId,
        messageId: msgId,
        ideaIdx: idx,
      });
      onIdeaAdded?.(suggestion.categoryId || category.id);
    } catch (err) {
      console.error("Failed to add suggestion", err);
      showToast(err?.message ?? "Couldn't add that idea — try again.");
    }
  };

  return (
    <div className="chat-drawer" style={{ "--rule-color": category.color || C.accent }}>
      <div className="chat-header">
        <div className="chat-header-bg" />
        <div className="chat-header-content">
          <div
            className="chat-rule-badge"
            style={{
              borderColor: `${category.color || C.accent}40`,
              color: category.color || C.accent,
            }}
          >
            {category.number}
          </div>
          <div>
            <span className="chat-rule-name">{category.title}</span>
            <span className="chat-rule-principle">{category.description}</span>
          </div>
        </div>
        <button onClick={onClose} className="chat-close-btn" aria-label="Close chat">
          <X size={18} />
        </button>
      </div>

      <div className="chat-messages">
        <div className="chat-system-note animate-fade-in">
          <Sparkles size={14} color={C.accent} />
          <span>Exploring {category.title}…</span>
        </div>

        {showStaticOpener && (
          <div className="chat-msg-ai animate-slide-right">
            <div className="chat-bubble-ai">{opener}</div>
          </div>
        )}

        {messages?.map((msg) => (
          <div key={msg._id}>
            {msg.role === "user" && (
              <div className="chat-msg-user animate-slide-left">
                <div className="chat-bubble-user">{msg.content}</div>
              </div>
            )}
            {msg.role === "assistant" && (
              <div className="chat-msg-ai animate-slide-right">
                <div className="chat-bubble-ai">{msg.content}</div>
              </div>
            )}
            {msg.ideas?.length > 0 && (
              <div className="chat-ideas">
                <div className="chat-ideas-divider">
                  <span>Suggested Ideas</span>
                </div>
                {msg.ideas.map((idea, ii) => (
                  <div
                    key={ii}
                    className={`chat-idea animate-fade-in ${idea.added ? "chat-idea-added" : ""}`}
                    style={{ animationDelay: `${ii * 0.12}s` }}
                  >
                    <Sparkles
                      size={14}
                      color={category.color || C.accent}
                      style={{ flexShrink: 0, marginTop: 2, opacity: 0.7 }}
                    />
                    <p className="chat-idea-text">{idea.text}</p>
                    <button
                      onClick={() => onAddSuggestion(msg._id, ii, idea)}
                      disabled={idea.added}
                      className={`chat-idea-btn ${idea.added ? "chat-idea-btn-added" : ""}`}
                    >
                      {idea.added ? (
                        <>
                          <Check size={13} /> Added
                        </>
                      ) : (
                        <>
                          <Plus size={13} /> Add
                        </>
                      )}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="chat-msg-ai animate-slide-right">
            <div className="chat-bubble-ai chat-thinking">
              <div className="thinking-dots">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="thinking-dot"
                    style={{ animationDelay: `${i * 0.2}s` }}
                  />
                ))}
              </div>
              <span>Thinking…</span>
            </div>
          </div>
        )}

        {error && (
          <div className="chat-error animate-fade-in">
            <AlertTriangle size={15} />
            <span>{error}</span>
            <button onClick={() => setError(null)} className="btn-icon">
              <X size={14} />
            </button>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      <div className="chat-input-bar">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          placeholder={`Ask anything about ${category.title}…`}
          rows={1}
          className="chat-input"
        />
        <button
          onClick={send}
          disabled={!input.trim() || loading}
          className={`chat-send-btn ${input.trim() && !loading ? "chat-send-active" : ""}`}
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}
