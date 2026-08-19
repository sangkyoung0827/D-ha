import { useEffect, useId, useMemo, useRef, useState, type FormEvent } from "react";
import type { PetProfile } from "../../domain/pet";
import { useAccount } from "../../platform/auth/AccountProvider";

interface ChatSource {
  id: string;
  citation?: number;
  provider: string;
  title: string;
  url: string;
  year?: number;
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: ChatSource[];
  failed?: boolean;
}

interface PetResearchResponse {
  answer?: string;
  sources?: ChatSource[];
  error?: string;
}

const MAX_SAVED_MESSAGES = 14;

export function PetResearchChat({ pet }: { pet: PetProfile }) {
  const { account, getIdToken } = useAccount();
  const inputId = useId();
  const listRef = useRef<HTMLDivElement | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>(() => loadStoredMessages(account?.uid));
  const [sending, setSending] = useState(false);
  const storageKey = useMemo(() => account ? `diha:pet-research:${account.uid}` : null, [account]);

  useEffect(() => {
    if (!storageKey) return;
    localStorage.setItem(storageKey, JSON.stringify(messages.slice(-MAX_SAVED_MESSAGES)));
  }, [messages, storageKey]);

  useEffect(() => {
    if (!expanded) return;
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [expanded, messages, sending]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const nextQuestion = question.trim();
    if (!nextQuestion || sending) return;
    const userMessage: ChatMessage = { id: crypto.randomUUID(), role: "user", content: nextQuestion };
    const priorMessages = messages.slice(-6);
    setMessages((current) => [...current, userMessage].slice(-MAX_SAVED_MESSAGES));
    setQuestion("");
    setExpanded(true);
    setSending(true);
    try {
      const token = await getIdToken();
      if (!token) throw new Error("로그인 정보를 확인할 수 없습니다.");
      const response = await fetch("/api/pet-research", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          question: nextQuestion,
          history: priorMessages.map(({ role, content }) => ({ role, content })),
          pet: { name: pet.name, species: pet.species, breed: pet.breed }
        })
      });
      const body = await response.json() as PetResearchResponse;
      if (!response.ok || !body.answer) throw new Error(body.error || "답변을 준비하지 못했습니다.");
      const assistantMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: body.answer,
        sources: body.sources ?? []
      };
      setMessages((current) => [...current, assistantMessage].slice(-MAX_SAVED_MESSAGES));
    } catch (error) {
      const failedMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: error instanceof Error ? error.message : "답변을 준비하지 못했습니다.",
        failed: true
      };
      setMessages((current) => [...current, failedMessage].slice(-MAX_SAVED_MESSAGES));
    } finally {
      setSending(false);
    }
  };

  return <section className={`pet-research-chat${expanded ? " is-expanded" : ""}`} aria-label="헤더 펫 연구원">
    <header>
      <span aria-hidden="true">H</span>
      <div><strong>헤더 펫 연구원</strong><small>논문과 공식 연구자료를 찾아봐요</small></div>
      {expanded && <button type="button" aria-label="펫 연구원 접기" onClick={() => setExpanded(false)}>⌄</button>}
    </header>
    {expanded && <div className="pet-research-messages" ref={listRef} aria-live="polite">
      {messages.length === 0 && <div className="pet-research-empty"><strong>{pet.name}에 관해 궁금한 점이 있나요?</strong><span>건강, 영양, 행동에 관한 질문을 입력해 주세요.</span></div>}
      {messages.map((message) => <article key={message.id} className={`${message.role}${message.failed ? " failed" : ""}`}>
        <b>{message.role === "assistant" ? "헤더" : "나"}</b>
        <p>{message.content}</p>
        {message.sources && message.sources.length > 0 && <div className="pet-research-sources" aria-label="답변 출처">
          {message.sources.map((source, index) => <a key={source.id} href={source.url} target="_blank" rel="noreferrer">
            <small>{source.provider}</small><span>[{source.citation ?? index + 1}] {source.title}</span>{source.year && <time>{source.year}</time>}
          </a>)}
        </div>}
      </article>)}
      {sending && <div className="pet-research-thinking" role="status"><i /><i /><i /><span>논문을 찾고 답변을 정리하고 있어요</span></div>}
    </div>}
    <form onSubmit={(event) => void submit(event)}>
      <label className="sr-only" htmlFor={inputId}>펫 연구원에게 질문</label>
      <input id={inputId} value={question} maxLength={700} placeholder={`${pet.name}에 대해 무엇이든 물어보세요`} onFocus={() => setExpanded(true)} onChange={(event) => setQuestion(event.target.value)} disabled={sending} />
      <button type="submit" aria-label="질문 보내기" disabled={sending || !question.trim()}><span aria-hidden="true">↑</span></button>
    </form>
    <footer>연구자료 기반 일반 정보이며 수의사의 진료를 대신하지 않습니다.</footer>
  </section>;
}

function isStoredMessage(value: unknown): value is ChatMessage {
  if (!value || typeof value !== "object") return false;
  const message = value as Partial<ChatMessage>;
  return typeof message.id === "string" && (message.role === "user" || message.role === "assistant") && typeof message.content === "string";
}

function loadStoredMessages(uid: string | undefined): ChatMessage[] {
  if (!uid) return [];
  try {
    const saved = JSON.parse(localStorage.getItem(`diha:pet-research:${uid}`) || "[]") as unknown;
    return Array.isArray(saved) ? saved.filter(isStoredMessage).slice(-MAX_SAVED_MESSAGES) : [];
  } catch {
    return [];
  }
}
