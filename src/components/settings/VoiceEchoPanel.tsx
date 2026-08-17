import { useRef, useState } from "react";

export function VoiceEchoPanel() {
  const [status, setStatus] = useState("버튼을 눌러 최대 3초 동안 녹음할 수 있어요.");
  const [recording, setRecording] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const timerRef = useRef<number | null>(null);

  const start = async () => {
    if (!navigator.mediaDevices?.getUserMedia || !("MediaRecorder" in window)) {
      setStatus("이 브라우저는 로컬 음성 반응을 지원하지 않아요.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const chunks: Blob[] = [];
      const recorder = new MediaRecorder(stream);
      recorderRef.current = recorder;
      recorder.addEventListener("dataavailable", (event) => {
        if (event.data.size) chunks.push(event.data);
      });
      recorder.addEventListener("stop", () => {
        stream.getTracks().forEach((track) => track.stop());
        setRecording(false);
        void replayWithPitch(new Blob(chunks, { type: recorder.mimeType })).then(() => setStatus("재생 후 음성 데이터는 폐기했어요."));
      });
      recorder.start();
      setRecording(true);
      setStatus("● 마이크 사용 중 · 서버로 전송하지 않아요.");
      timerRef.current = window.setTimeout(stop, 3000);
    } catch {
      setStatus("마이크 권한이 거부됐어요. 게임은 그대로 이용할 수 있어요.");
    }
  };

  const stop = () => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = null;
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
  };

  return (
    <section className="settings-section voice-panel">
      <div><h3>로컬 음성 메아리</h3><p>{status}</p></div>
      <button className={recording ? "danger-button" : "secondary-button"} onClick={recording ? stop : start}>{recording ? "녹음 중지" : "3초 녹음"}</button>
    </section>
  );
}

async function replayWithPitch(blob: Blob): Promise<void> {
  if (!blob.size || !("AudioContext" in window)) return;
  const context = new AudioContext();
  try {
    const buffer = await context.decodeAudioData(await blob.arrayBuffer());
    const source = context.createBufferSource();
    source.buffer = buffer;
    source.playbackRate.value = 1.12;
    source.connect(context.destination);
    source.start();
    await new Promise<void>((resolve) => source.addEventListener("ended", () => resolve(), { once: true }));
  } finally {
    await context.close();
  }
}
