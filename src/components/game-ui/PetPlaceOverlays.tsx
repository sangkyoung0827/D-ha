import { useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import type { PetExploration, PetMedicalProfile } from "../../domain/types";
import { breedDefinition } from "../../domain/pet";
import { useGameStore } from "../../store/gameStore";
import { cameraProvider } from "../../platform/camera/CameraProvider";
import { locationProvider } from "../../platform/location/LocationProvider";

function FeatureHeader({ eyebrow, title, copy }: { eyebrow: string; title: string; copy: string }) {
  return <header className="pet-feature-header"><p>{eyebrow}</p><h2 id="sheet-title">{title}</h2><span>{copy}</span></header>;
}

export function PetHospitalOverlay() {
  const profile = useGameStore((state) => state.profile);
  const medical = useGameStore((state) => state.petMedical);
  const saveProfile = useGameStore((state) => state.savePetMedicalProfile);
  const addRecord = useGameStore((state) => state.addPetMedicalRecord);
  const removeRecord = useGameStore((state) => state.removePetMedicalRecord);
  const bloodTypes = profile.species === "dog" ? ["미확인", "DEA 1.1 양성", "DEA 1.1 음성"] : ["미확인", "A형", "B형", "AB형"];

  const saveConnection = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const hospitalName = String(data.get("hospitalName") ?? "").trim();
    const patientNumber = String(data.get("patientNumber") ?? "").trim();
    const sameConnection = hospitalName === medical.hospital.hospitalName && patientNumber === medical.hospital.patientNumber;
    const next: PetMedicalProfile = {
      ...medical,
      bloodType: String(data.get("bloodType") ?? "미확인"),
      microchipId: String(data.get("microchipId") ?? "").trim(),
      hospital: {
        hospitalName,
        patientNumber,
        status: hospitalName && patientNumber ? sameConnection && medical.hospital.status === "connected" ? "connected" : "pending" : "not-connected",
        lastSyncedAt: sameConnection ? medical.hospital.lastSyncedAt : null
      }
    };
    saveProfile(next);
  };

  const addVisit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    addRecord({
      visitDate: String(data.get("visitDate") ?? ""),
      hospitalName: String(data.get("recordHospital") ?? medical.hospital.hospitalName).trim(),
      diagnosis: String(data.get("diagnosis") ?? "").trim(),
      treatment: String(data.get("treatment") ?? "").trim(),
      note: String(data.get("note") ?? "").trim(),
      nextVisitDate: String(data.get("nextVisitDate") ?? "") || null
    });
    form.reset();
  };

  return <div className="pet-feature pet-hospital" data-testid="pet-hospital-overlay">
    <FeatureHeader eyebrow="PET HEALTH RECORD" title={`${profile.name}의 동물병원`} copy="건강정보와 진료 이력을 한곳에서 관리해요." />
    <section className="hospital-pet-card">
      <span aria-hidden="true">{profile.species === "dog" ? "🐶" : "🐱"}</span>
      <div><strong>{profile.name}</strong><small>{breedDefinition(profile.breed).label}</small></div>
      <b>{medical.bloodType}</b>
    </section>
    <div className={`hospital-link-state ${medical.hospital.status}`}>
      <i aria-hidden="true" />
      <span><strong>{medical.hospital.status === "connected" ? "병원 자동 연동 중" : medical.hospital.status === "pending" ? "병원 연동 승인 대기" : "병원 연결 전"}</strong><small>{medical.hospital.status === "connected" ? `${medical.hospital.hospitalName} · 마지막 동기화 ${medical.hospital.lastSyncedAt ? new Date(medical.hospital.lastSyncedAt).toLocaleDateString("ko-KR") : "확인 중"}` : "제휴 병원의 API 승인이 완료되기 전에는 직접 등록한 기록만 표시됩니다."}</small></span>
    </div>
    <form className="pet-feature-form hospital-profile-form" onSubmit={saveConnection}>
      <label><span>혈액형</span><select name="bloodType" defaultValue={medical.bloodType}>{bloodTypes.map((type) => <option key={type}>{type}</option>)}</select></label>
      <label><span>마이크로칩 번호</span><input name="microchipId" defaultValue={medical.microchipId} maxLength={40} placeholder="선택 입력" /></label>
      <label><span>다니는 병원</span><input name="hospitalName" defaultValue={medical.hospital.hospitalName} maxLength={80} placeholder="병원명" /></label>
      <label><span>환자번호</span><input name="patientNumber" defaultValue={medical.hospital.patientNumber} maxLength={50} placeholder="병원에서 발급한 번호" /></label>
      <button className="primary-button" type="submit">건강·연결 정보 저장</button>
    </form>
    <details className="pet-record-entry">
      <summary>＋ 진료기록 직접 등록</summary>
      <form className="pet-feature-form" onSubmit={addVisit}>
        <label><span>진료일</span><input name="visitDate" type="date" required defaultValue={today()} /></label>
        <label><span>병원</span><input name="recordHospital" required maxLength={80} defaultValue={medical.hospital.hospitalName} placeholder="병원명" /></label>
        <label className="full"><span>진단/진료 항목</span><input name="diagnosis" required maxLength={120} placeholder="예: 정기 건강검진" /></label>
        <label className="full"><span>처치·처방</span><textarea name="treatment" maxLength={300} placeholder="검사, 처치, 처방 내용을 적어주세요." /></label>
        <label className="full"><span>메모</span><textarea name="note" maxLength={500} placeholder="수의사 안내나 특이사항" /></label>
        <label><span>다음 방문일</span><input name="nextVisitDate" type="date" /></label>
        <button className="primary-button" type="submit">진료기록 저장</button>
      </form>
    </details>
    <section className="pet-record-list" aria-label="진료기록">
      <header><strong>진료기록</strong><span>{medical.records.length}건</span></header>
      {medical.records.length ? medical.records.map((record) => <article key={record.id}>
        <time>{formatDate(record.visitDate)}</time><div><strong>{record.diagnosis}</strong><small>{record.hospitalName} · {record.source === "hospital" ? "병원 동기화" : "직접 등록"}</small><p>{record.treatment || record.note || "상세 메모 없음"}</p>{record.nextVisitDate && <em>다음 방문 {formatDate(record.nextVisitDate)}</em>}</div>
        <button type="button" aria-label={`${record.diagnosis} 기록 삭제`} onClick={() => { if (window.confirm("이 진료기록을 삭제할까요?")) removeRecord(record.id); }}>×</button>
      </article>) : <p className="pet-feature-empty">아직 저장된 진료기록이 없어요.</p>}
    </section>
    <p className="pet-sensitive-note">의료기록은 민감정보입니다. 로그인한 계정에 분리 저장되며, 응급 상황이나 의학적 판단에는 반드시 실제 동물병원 기록과 수의사의 안내를 따르세요.</p>
  </div>;
}

export function PetDiaryOverlay() {
  const profile = useGameStore((state) => state.profile);
  const memories = useGameStore((state) => state.petMemories);
  const addMemory = useGameStore((state) => state.addPetMemory);
  const removeMemory = useGameStore((state) => state.removePetMemory);
  const [photoDataUrl, setPhotoDataUrl] = useState("");
  const [photoName, setPhotoName] = useState("");
  const [photoError, setPhotoError] = useState("");
  const [processing, setProcessing] = useState(false);

  const selectPhoto = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setProcessing(true);
    setPhotoError("");
    try {
      setPhotoDataUrl(await compressMemoryPhoto(file));
      setPhotoName(file.name);
    } catch (error) {
      setPhotoDataUrl("");
      setPhotoName("");
      setPhotoError(error instanceof Error ? error.message : "사진을 읽지 못했어요.");
    } finally {
      setProcessing(false);
      event.target.value = "";
    }
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!photoDataUrl) {
      setPhotoError("대표사진 한 장을 선택해주세요.");
      return;
    }
    const form = event.currentTarget;
    const data = new FormData(form);
    addMemory({ title: String(data.get("title") ?? "").trim(), memoryDate: String(data.get("memoryDate") ?? ""), note: String(data.get("note") ?? "").trim(), photoDataUrl });
    form.reset();
    setPhotoDataUrl("");
    setPhotoName("");
  };

  return <div className="pet-feature pet-diary" data-testid="pet-diary-overlay">
    <FeatureHeader eyebrow="PET MEMORY BOOK" title={`${profile.name}의 펫 일기`} copy="대표사진 한 장과 짧은 이야기로 함께한 순간을 남겨요." />
    <form className="pet-feature-form diary-form" onSubmit={submit}>
      <label className={`memory-photo-picker${photoDataUrl ? " has-photo" : ""}`}>
        {photoDataUrl ? <img src={photoDataUrl} alt="대표사진 미리보기" /> : <span aria-hidden="true">＋<small>대표사진</small></span>}
        <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => void selectPhoto(event)} />
      </label>
      <div className="memory-fields">
        <label><span>추억 제목</span><input name="title" required maxLength={60} placeholder="예: 처음 함께 간 바다" /></label>
        <label><span>날짜</span><input name="memoryDate" required type="date" defaultValue={today()} /></label>
      </div>
      <label className="full"><span>함께한 이야기</span><textarea name="note" maxLength={500} placeholder="그날의 기분과 기억을 간단히 적어주세요." /></label>
      <div className="photo-file-state" aria-live="polite">{processing ? "사진을 저장용으로 다듬는 중..." : photoError || (photoName ? `${photoName} · 안전하게 압축됨` : "사진은 계정 저장을 위해 작은 JPEG로 압축됩니다.")}</div>
      <button className="primary-button" type="submit" disabled={processing}>추억 등록</button>
    </form>
    <section className="memory-grid" aria-label="펫 일기 목록">
      {memories.length ? memories.map((memory) => <article key={memory.id}>
        <img src={memory.photoDataUrl} alt={`${memory.title} 대표사진`} />
        <div><time>{formatDate(memory.memoryDate)}</time><strong>{memory.title}</strong><p>{memory.note || `${profile.name}와 함께한 소중한 날`}</p></div>
        <button type="button" aria-label={`${memory.title} 추억 삭제`} onClick={() => { if (window.confirm("이 추억을 삭제할까요?")) removeMemory(memory.id); }}>×</button>
      </article>) : <p className="pet-feature-empty">첫 번째 대표사진과 추억을 등록해보세요.</p>}
    </section>
  </div>;
}

export function PetExplorationOverlay() {
  const profile = useGameStore((state) => state.profile);
  const explorations = useGameStore((state) => state.petExplorations);
  const addExploration = useGameStore((state) => state.addPetExploration);
  const removeExploration = useGameStore((state) => state.removePetExploration);
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [locationMessage, setLocationMessage] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(explorations[0]?.id ?? null);
  const selected = explorations.find((place) => place.id === selectedId) ?? explorations[0];
  const mapUrl = useMemo(() => selected ? openStreetMapEmbed(selected) : "", [selected]);

  const requestCurrentLocation = async () => {
    setLocationMessage("현재 위치를 확인하는 중...");
    try {
      const position = await locationProvider.current();
      setLatitude(position.latitude.toFixed(6));
      setLongitude(position.longitude.toFixed(6));
      setLocationMessage("현재 위치를 입력했어요.");
    } catch (error) {
      setLocationMessage(error instanceof Error && error.message === "unsupported" ? "이 기기는 위치 기능을 지원하지 않아요." : "위치 권한이 허용되지 않았어요. 위도와 경도를 직접 입력할 수 있어요.");
    }
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const lat = Number(latitude);
    const lng = Number(longitude);
    if (!Number.isFinite(lat) || lat < -90 || lat > 90 || !Number.isFinite(lng) || lng < -180 || lng > 180) {
      setLocationMessage("올바른 위도와 경도를 입력해주세요.");
      return;
    }
    addExploration({ placeName: String(data.get("placeName") ?? "").trim(), visitDate: String(data.get("visitDate") ?? ""), note: String(data.get("note") ?? "").trim(), latitude: lat, longitude: lng });
    form.reset();
    setLatitude("");
    setLongitude("");
    setLocationMessage("");
    setSelectedId(null);
  };

  return <div className="pet-feature pet-exploration" data-testid="pet-exploration-overlay">
    <FeatureHeader eyebrow="PET EXPLORATION MAP" title={`${profile.name}의 탐험`} copy="함께 다녀온 장소를 지도 위에 하나씩 모아보세요." />
    <section className="exploration-map">
      {selected ? <iframe title={`${selected.placeName} 지도`} src={mapUrl} loading="lazy" referrerPolicy="no-referrer" /> : <div className="map-empty"><span aria-hidden="true">⌖</span><strong>아직 지도에 표시할 장소가 없어요.</strong><small>현재 위치 또는 위도·경도를 입력해 첫 장소를 등록하세요.</small></div>}
      {selected && <div className="map-caption"><span>⌖</span><div><strong>{selected.placeName}</strong><small>{selected.latitude.toFixed(4)}, {selected.longitude.toFixed(4)}</small></div><a href={`https://www.openstreetmap.org/?mlat=${selected.latitude}&mlon=${selected.longitude}#map=15/${selected.latitude}/${selected.longitude}`} target="_blank" rel="noreferrer">큰 지도</a></div>}
    </section>
    <details className="exploration-entry" open={!explorations.length}>
      <summary>＋ 함께한 장소 등록</summary>
      <form className="pet-feature-form" onSubmit={submit}>
        <label className="full"><span>장소 이름</span><input name="placeName" required maxLength={80} placeholder="예: 한강공원 반포지구" /></label>
        <label><span>방문일</span><input name="visitDate" required type="date" defaultValue={today()} /></label>
        <button className="location-button" type="button" onClick={() => void requestCurrentLocation()}>⌖ 현재 위치 사용</button>
        <label><span>위도</span><input name="latitude" required inputMode="decimal" value={latitude} onChange={(event) => setLatitude(event.target.value)} placeholder="37.5665" /></label>
        <label><span>경도</span><input name="longitude" required inputMode="decimal" value={longitude} onChange={(event) => setLongitude(event.target.value)} placeholder="126.9780" /></label>
        <label className="full"><span>탐험 메모</span><textarea name="note" maxLength={500} placeholder="함께 무엇을 했는지 기록해보세요." /></label>
        {locationMessage && <p className="location-message" role="status">{locationMessage}</p>}
        <button className="primary-button" type="submit">지도에 장소 저장</button>
      </form>
    </details>
    <section className="exploration-list" aria-label="탐험 장소 목록">
      {explorations.length ? explorations.map((place, index) => <article key={place.id} className={selected?.id === place.id ? "active" : ""}>
        <button type="button" className="place-select" onClick={() => setSelectedId(place.id)}><b>{String(explorations.length - index).padStart(2, "0")}</b><span><strong>{place.placeName}</strong><small>{formatDate(place.visitDate)} · {place.note || "함께한 장소"}</small></span></button>
        <button type="button" className="place-remove" aria-label={`${place.placeName} 장소 삭제`} onClick={() => { if (window.confirm("이 탐험 장소를 삭제할까요?")) removeExploration(place.id); }}>×</button>
      </article>) : null}
    </section>
    <p className="pet-sensitive-note">지도는 OpenStreetMap을 사용합니다. 위치 등록은 사용자가 버튼을 누른 경우에만 요청하며, 정확한 집 주소처럼 민감한 위치는 저장하지 않는 것을 권장합니다.</p>
  </div>;
}

function today(): string {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}

function formatDate(value: string): string {
  if (!value) return "날짜 미정";
  return new Date(`${value}T00:00:00`).toLocaleDateString("ko-KR", { year: "numeric", month: "short", day: "numeric" });
}

function openStreetMapEmbed(place: PetExploration): string {
  const latDelta = 0.012;
  const lngDelta = 0.018;
  const bbox = [place.longitude - lngDelta, place.latitude - latDelta, place.longitude + lngDelta, place.latitude + latDelta].join(",");
  return `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(bbox)}&layer=mapnik&marker=${place.latitude}%2C${place.longitude}`;
}

async function compressMemoryPhoto(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("JPG, PNG 또는 WebP 사진만 등록할 수 있어요.");
  if (file.size > 12 * 1024 * 1024) throw new Error("12MB 이하의 사진을 선택해주세요.");
  const source = await cameraProvider.readImage(file);
  const image = await cameraProvider.loadImage(source);
  const targetWidth = 600;
  const targetHeight = 400;
  const sourceRatio = image.width / image.height;
  const targetRatio = targetWidth / targetHeight;
  const cropWidth = sourceRatio > targetRatio ? image.height * targetRatio : image.width;
  const cropHeight = sourceRatio > targetRatio ? image.height : image.width / targetRatio;
  const cropX = (image.width - cropWidth) / 2;
  const cropY = (image.height - cropHeight) / 2;
  const canvas = document.createElement("canvas");
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("사진 처리 기능을 사용할 수 없어요.");
  context.drawImage(image, cropX, cropY, cropWidth, cropHeight, 0, 0, targetWidth, targetHeight);
  let quality = 0.78;
  let output = canvas.toDataURL("image/jpeg", quality);
  while (output.length > 330_000 && quality > 0.42) {
    quality -= 0.08;
    output = canvas.toDataURL("image/jpeg", quality);
  }
  if (output.length > 350_000) throw new Error("사진을 더 작은 크기로 다시 선택해주세요.");
  return output;
}
