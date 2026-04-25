import { useState, useEffect, useRef } from "react";
import { X, Send, Sparkles, Plus, Check, AlertTriangle } from "lucide-react";
import { C } from "../../config/constants";
import { useFlash } from "../../context/AppContext";
import { sendChat } from "../../utils/api";

export default function ChatDrawer({ type, item, state, dispatch, onClose }) {
  const isPrimitive = type === "primitive";
  const { triggerFlash } = useFlash();

  const chatStore = isPrimitive ? state.primitivesChat : state.playbookChat;
  const itemId = item.id;
  const messages = chatStore[itemId] || [];

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const bottomRef = useRef(null);
  const sentInit = useRef(false);
  const stateRef = useRef(state);
  useEffect(() => { stateRef.current = state; });

  const scroll = () => { setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100); };

  const doSend = async (txt, isSystem = false) => {
    const s = stateRef.current;
    const cs = isPrimitive ? s.primitivesChat : s.playbookChat;
    const addMsgType = isPrimitive ? "ADD_PRIMITIVES_CHAT_MSG" : "ADD_CHAT_MSG";
    const idKey = isPrimitive ? "categoryId" : "ruleId";

    if (!isSystem) dispatch({ type: addMsgType, [idKey]: itemId, message: { role: "user", content: txt } });
    setLoading(true);
    setError(null);

    try {
      const hist = isSystem ? [] : [...(cs[itemId] || []), { role: "user", content: txt }];
      const currentItems = isPrimitive
        ? (s.primitives[itemId] || []).map((a) => a.text)
        : (s.plan[itemId] || []).map((a) => a.text);

      const starred = [];
      for (const [catId, ideas] of Object.entries(s.primitives)) {
        ideas.filter((i) => i.starred).forEach((i) => starred.push({ category: catId, text: i.text }));
      }

      const res = await sendChat({
        mode: isPrimitive ? "primitives" : "playbook",
        intake: s.intake,
        category: isPrimitive ? { id: item.id, number: item.number, title: item.title, description: item.description } : undefined,
        rule: !isPrimitive ? { id: item.id, number: item.number, name: item.name, principle: item.principle } : undefined,
        currentItems,
        allPrimitives: s.primitives,
        allPlan: s.plan,
        starredPrimitives: starred,
        chatHistory: hist,
        userMessage: txt,
      });

      dispatch({
        type: addMsgType,
        [idKey]: itemId,
        message: { role: "assistant", content: res.content, ideas: res.ideas },
      });
    } catch (e) {
      console.error(e);
      setError("The AI couldn't connect. Check your connection and try again.");
    }
    setLoading(false);
  };

  useEffect(() => {
    if (messages.length === 0 && !sentInit.current) {
      sentInit.current = true;
      const addMsgType = isPrimitive ? "ADD_PRIMITIVES_CHAT_MSG" : "ADD_CHAT_MSG";
      const idKey = isPrimitive ? "categoryId" : "ruleId";
      const opener = isPrimitive
        ? `Let's explore ${item.title.toLowerCase()} for your role. What would be most useful to dig into?`
        : `Let's explore ${item.name}. What would be most useful to dig into?`;
      dispatch({ type: addMsgType, [idKey]: itemId, message: { role: "assistant", content: opener } });
    }
  }, [itemId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(scroll, [messages, loading]);

  const send = () => {
    if (!input.trim() || loading) return;
    const m = input.trim();
    setInput("");
    doSend(m);
  };

  const addIdea = (mi, ii, idea) => {
    const markType = isPrimitive ? "MARK_PRIMITIVE_IDEA_ADDED" : "MARK_IDEA_ADDED";
    const markKey = isPrimitive ? "categoryId" : "ruleId";

    if (isPrimitive) {
      const targetCat = idea.categoryId || itemId;
      dispatch({ type: "ADD_PRIMITIVE", categoryId: targetCat, text: idea.text, source: "ai" });
      dispatch({ type: markType, [markKey]: itemId, msgIdx: mi, ideaIdx: ii });
      triggerFlash(targetCat);
    } else {
      const targetRule = idea.ruleId || itemId;
      dispatch({ type: "ADD_ACTION", ruleId: targetRule, text: idea.text, source: "ai" });
      dispatch({ type: markType, [markKey]: itemId, msgIdx: mi, ideaIdx: ii });
      triggerFlash(targetRule);
    }
  };

  const badgeNumber = isPrimitive ? item.number : item.number;
  const badgeName = isPrimitive ? item.title : item.name;
  const badgePrinciple = isPrimitive ? item.description : item.principle;
  const noteLabel = isPrimitive ? `Exploring ${item.title}...` : `Reviewing your actions for Rule ${item.number}...`;
  const placeholder = isPrimitive ? "Ask anything about this category..." : "Ask anything about this rule...";

  return (
    <div className="chat-drawer" style={{ "--rule-color": item.color || C.accent }}>
      <div className="chat-header">
        <div className="chat-header-bg" />
        <div className="chat-header-content">
          <div className="chat-rule-badge" style={{ borderColor: `${item.color || C.accent}40`, color: item.color || C.accent }}>
            {badgeNumber}
          </div>
          <div>
            <span className="chat-rule-name">{badgeName}</span>
            <span className="chat-rule-principle">{badgePrinciple}</span>
          </div>
        </div>
        <button onClick={onClose} className="chat-close-btn" aria-label="Close chat">
          <X size={18} />
        </button>
      </div>

      <div className="chat-messages">
        {messages.length > 0 && messages[0].role === "assistant" && (
          <div className="chat-system-note animate-fade-in">
            <Sparkles size={14} color={C.accent} />
            <span>{noteLabel}</span>
          </div>
        )}

        {messages.map((msg, mi) => (
          <div key={mi}>
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
                  <span>{isPrimitive ? "Suggested Ideas" : "Suggested Actions"}</span>
                </div>
                {msg.ideas.map((idea, ii) => (
                  <div key={ii} className={`chat-idea animate-fade-in ${idea.added ? "chat-idea-added" : ""}`}
                    style={{ animationDelay: `${ii * 0.12}s` }}>
                    <Sparkles size={14} color={item.color || C.accent} style={{ flexShrink: 0, marginTop: 2, opacity: 0.7 }} />
                    <p className="chat-idea-text">{idea.text}</p>
                    <button onClick={() => addIdea(mi, ii, idea)} disabled={idea.added}
                      className={`chat-idea-btn ${idea.added ? "chat-idea-btn-added" : ""}`}>
                      {idea.added ? <><Check size={13} /> Added</> : <><Plus size={13} /> Add</>}
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
                {[0, 1, 2].map((i) => <div key={i} className="thinking-dot" style={{ animationDelay: `${i * 0.2}s` }} />)}
              </div>
              <span>Thinking...</span>
            </div>
          </div>
        )}

        {error && (
          <div className="chat-error animate-fade-in">
            <AlertTriangle size={15} />
            <span>{error}</span>
            <button onClick={() => setError(null)} className="btn-icon"><X size={14} /></button>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="chat-input-bar">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
          placeholder={placeholder}
          rows={1}
          className="chat-input"
        />
        <button onClick={send} disabled={!input.trim() || loading}
          className={`chat-send-btn ${input.trim() && !loading ? "chat-send-active" : ""}`}>
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}
