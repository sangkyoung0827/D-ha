import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { appendExplorationTrackPoint, distanceBetweenTrackPoints } from "../../domain/exploration";
import type { ExplorationTrackPoint, PetExploration, PetMedicalProfile } from "../../domain/types";
import { breedDefinition } from "../../domain/pet";
import { useGameStore } from "../../store/gameStore";
import { cameraProvider } from "../../platform/camera/CameraProvider";
import { locationProvider } from "../../platform/location/LocationProvider";
import { placeGeocoder, PlaceGeocoderError } from "../../platform/location/PlaceGeocoder";

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
  const [locationMessage, setLocationMessage] = useState("");
  const [placeSearching, setPlaceSearching] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(explorations[0]?.id ?? null);
  const [tracking, setTracking] = useState(false);
  const [liveRoute, setLiveRoute] = useState<ExplorationTrackPoint[]>([]);
  const [trackingName, setTrackingName] = useState(`${profile.name}와의 탐험`);
  const [trackingNote, setTrackingNote] = useState("");
  const [trackingMessage, setTrackingMessage] = useState("탐험을 시작하면 이동 경로가 실시간으로 지도에 표시돼요.");
  const [trackingSeconds, setTrackingSeconds] = useState(0);
  const [liveDistance, setLiveDistance] = useState(0);
  const liveRouteRef = useRef<ExplorationTrackPoint[]>([]);
  const liveDistanceRef = useRef(0);
  const trackingStartedAtRef = useRef<number | null>(null);
  const stopLocationWatchRef = useRef<(() => void) | null>(null);
  const selected = explorations.find((place) => place.id === selectedId) ?? explorations[0];
  const mapBounds = useMemo(() => explorationMapBounds(explorations, liveRoute[0]), [explorations, liveRoute]);
  const mapUrl = useMemo(() => mapBounds ? openStreetMapEmbed(mapBounds, liveRoute[0] ?? selected) : "", [mapBounds, liveRoute, selected]);
  const activeLocation = liveRoute.at(-1) ?? selected;

  useEffect(() => () => {
    stopLocationWatchRef.current?.();
    stopLocationWatchRef.current = null;
  }, []);

  useEffect(() => {
    if (!tracking || trackingStartedAtRef.current === null) return;
    const updateDuration = () => setTrackingSeconds(Math.max(0, Math.floor((Date.now() - trackingStartedAtRef.current!) / 1_000)));
    updateDuration();
    const timer = window.setInterval(updateDuration, 1_000);
    return () => window.clearInterval(timer);
  }, [tracking]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (placeSearching) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    const placeName = String(data.get("placeName") ?? "").trim();
    setPlaceSearching(true);
    setLocationMessage(`‘${placeName}’ 위치를 지도에서 찾는 중이에요.`);
    try {
      const location = await placeGeocoder.search(placeName);
      addExploration({
        placeName,
        visitDate: String(data.get("visitDate") ?? ""),
        note: String(data.get("note") ?? "").trim(),
        latitude: location.latitude,
        longitude: location.longitude,
        route: [],
        distanceMeters: 0,
        durationSeconds: 0
      });
      form.reset();
      setLocationMessage(`‘${location.displayName}’ 위치를 찾아 저장했어요.`);
      setSelectedId(null);
    } catch (error) {
      setLocationMessage(error instanceof PlaceGeocoderError && error.code === "not-found"
        ? "장소를 찾지 못했어요. 시·구 이름을 함께 입력해주세요."
        : "지도 검색 연결이 원활하지 않아요. 잠시 후 다시 시도해주세요.");
    } finally {
      setPlaceSearching(false);
    }
  };

  const startExploration = () => {
    if (tracking) return;
    stopLocationWatchRef.current?.();
    stopLocationWatchRef.current = null;
    liveRouteRef.current = [];
    liveDistanceRef.current = 0;
    setLiveDistance(0);
    trackingStartedAtRef.current = Date.now();
    setLiveRoute([]);
    setTrackingSeconds(0);
    setTracking(true);
    setTrackingMessage("위치 권한을 확인하고 있어요. 잠시만 기다려주세요.");
    try {
      const stopWatch = locationProvider.watch((point) => {
        const previousRoute = liveRouteRef.current;
        const nextRoute = appendExplorationTrackPoint(previousRoute, point);
        if (nextRoute === previousRoute) return;
        const previousPoint = previousRoute.at(-1);
        if (previousPoint) liveDistanceRef.current += distanceBetweenTrackPoints(previousPoint, point);
        setLiveDistance(liveDistanceRef.current);
        liveRouteRef.current = nextRoute;
        setLiveRoute(nextRoute);
        setTrackingMessage(`GPS 연결됨 · 현재 정확도 약 ${Math.round(point.accuracy)}m`);
      }, (error) => {
        if (error === "permission-denied") {
          stopLocationWatchRef.current?.();
          stopLocationWatchRef.current = null;
          setTracking(false);
          trackingStartedAtRef.current = null;
        }
        setTrackingMessage(`${trackingErrorMessage(error)}${error === "permission-denied" ? "" : " 기존 경로는 유지하며 GPS 연결을 기다리고 있어요."}`);
      });
      if (trackingStartedAtRef.current === null) stopWatch();
      else stopLocationWatchRef.current = stopWatch;
    } catch {
      setTracking(false);
      setTrackingMessage("이 기기 또는 브라우저에서는 실시간 위치 기능을 사용할 수 없어요.");
    }
  };

  const finishExploration = () => {
    stopLocationWatchRef.current?.();
    stopLocationWatchRef.current = null;
    setTracking(false);
    const route = liveRouteRef.current;
    const startedAt = trackingStartedAtRef.current;
    trackingStartedAtRef.current = null;
    if (!route.length || startedAt === null) {
      setTrackingMessage("위치를 한 번 이상 확인한 뒤 탐험을 저장할 수 있어요.");
      return;
    }
    const firstPoint = route[0];
    if (!firstPoint) return;
    const savedDistance = liveDistanceRef.current;
    const durationSeconds = Math.min(604_800, Math.max(1, Math.floor((Date.now() - startedAt) / 1_000)));
    addExploration({
      placeName: trackingName.trim() || `${profile.name}와의 탐험`,
      visitDate: today(),
      note: trackingNote.trim(),
      latitude: firstPoint.latitude,
      longitude: firstPoint.longitude,
      route,
      distanceMeters: Math.round(liveDistanceRef.current),
      durationSeconds
    });
    setSelectedId(null);
    setTrackingMessage(`${formatDistance(savedDistance)}의 탐험 경로를 이 계정에 저장했어요.`);
    setLiveRoute([]);
    liveRouteRef.current = [];
    liveDistanceRef.current = 0;
    setLiveDistance(0);
    setTrackingSeconds(0);
    setTrackingNote("");
  };

  return <div className="pet-feature pet-exploration" data-testid="pet-exploration-overlay">
    <FeatureHeader eyebrow="PET EXPLORATION MAP" title={`${profile.name}의 탐험`} copy="함께 걷는 경로를 실시간으로 기록하고 지도에 차곡차곡 모아보세요." />
    <section className={`live-exploration-card${tracking ? " tracking" : ""}`} data-testid="live-exploration-card">
      <header><span aria-hidden="true">⌖</span><div><strong>{tracking ? "탐험 기록 중" : "실시간 탐험"}</strong><small>{tracking ? "이 화면을 켜둔 채 함께 움직여주세요." : "버튼을 누를 때만 위치 권한을 사용합니다."}</small></div><i aria-hidden="true" /></header>
      <label><span>탐험 이름</span><input aria-label="실시간 탐험 이름" value={trackingName} onChange={(event) => setTrackingName(event.target.value)} maxLength={80} disabled={tracking} /></label>
      <label><span>탐험 메모</span><input aria-label="경로 기록 메모" value={trackingNote} onChange={(event) => setTrackingNote(event.target.value)} maxLength={500} placeholder="선택 입력" /></label>
      <div className="live-exploration-stats" aria-live="polite">
        <span><b data-testid="live-exploration-point-count">{liveRoute.length}</b><small>위치 기록</small></span>
        <span><b data-testid="live-exploration-distance">{formatDistance(liveDistance)}</b><small>이동 거리</small></span>
        <span><b>{formatDuration(trackingSeconds)}</b><small>탐험 시간</small></span>
      </div>
      <p role="status">{trackingMessage}</p>
      {tracking
        ? <button className="finish-exploration-button" type="button" onClick={finishExploration}>탐험 종료 및 저장</button>
        : <button className="start-exploration-button" type="button" onClick={startExploration}>탐험 시작</button>}
    </section>
    <section className="exploration-map">
      {mapUrl && mapBounds ? <div className="exploration-map-canvas"><iframe title={liveRoute.length ? "실시간 탐험 지도" : selected ? `${selected.placeName} 지도` : "누적 탐험 지도"} src={mapUrl} loading="lazy" referrerPolicy="no-referrer" /><ExplorationRouteOverlay explorations={explorations} liveRoute={liveRoute} selectedId={selected?.id ?? null} bounds={mapBounds} /></div> : <div className="map-empty"><span aria-hidden="true">⌖</span><strong>아직 지도에 표시할 탐험이 없어요.</strong><small>탐험 시작으로 경로를 기록하거나, 장소 이름을 검색해 등록해보세요.</small></div>}
      {activeLocation && <div className="map-caption"><span>⌖</span><div><strong>{liveRoute.length ? "지금 이동 중" : selected?.placeName}</strong><small>{activeLocation.latitude.toFixed(4)}, {activeLocation.longitude.toFixed(4)} · 누적 {explorations.length}개</small></div><a href={`https://www.openstreetmap.org/?mlat=${activeLocation.latitude}&mlon=${activeLocation.longitude}#map=15/${activeLocation.latitude}/${activeLocation.longitude}`} target="_blank" rel="noreferrer">큰 지도</a></div>}
    </section>
    <details className="exploration-entry" open={!explorations.length}>
      <summary>＋ 함께한 장소 등록</summary>
      <form className="pet-feature-form" onSubmit={submit}>
        <label className="full"><span>장소 이름</span><input name="placeName" required maxLength={80} placeholder="예: 반포한강공원" /><small className="geocode-hint">장소 이름만 입력하면 지도에서 위치를 자동으로 찾아요.</small></label>
        <label className="full"><span>방문일</span><input name="visitDate" required type="date" defaultValue={today()} /></label>
        <label className="full"><span>탐험 메모</span><textarea name="note" maxLength={500} placeholder="함께 무엇을 했는지 기록해보세요. (선택)" /></label>
        {locationMessage && <p className="location-message" role="status">{locationMessage}</p>}
        <button className="primary-button full" type="submit" disabled={placeSearching}>{placeSearching ? "지도에서 장소 찾는 중..." : "장소 찾아 저장"}</button>
      </form>
    </details>
    <section className="exploration-list" aria-label="탐험 장소 목록">
      {explorations.length ? explorations.map((place, index) => <article key={place.id} className={`${selected?.id === place.id ? "active " : ""}${place.route.length ? "has-route" : ""}`.trim()}>
        <button type="button" className="place-select" onClick={() => setSelectedId(place.id)}><b>{String(explorations.length - index).padStart(2, "0")}</b><span><strong>{place.placeName}</strong><small>{formatDate(place.visitDate)} · {place.note || "함께한 장소"}</small></span></button>
        {place.route.length > 0 && <span className="route-summary">{formatDistance(place.distanceMeters)} · {formatDuration(place.durationSeconds)}</span>}
        <button type="button" className="place-remove" aria-label={`${place.placeName} 장소 삭제`} onClick={() => { if (window.confirm("이 탐험 장소를 삭제할까요?")) removeExploration(place.id); }}>×</button>
      </article>) : null}
    </section>
    <p className="pet-sensitive-note">장소 이름 검색과 지도는 OpenStreetMap을 사용합니다. 실시간 위치는 사용자가 ‘탐험 시작’을 누른 동안에만 수집하며, 저장한 장소와 종료한 경로는 현재 로그인한 계정에 분리 저장됩니다. 정확한 집 주소처럼 민감한 위치에서 기록을 시작하지 않는 것을 권장합니다.</p>
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

interface ExplorationMapBounds {
  minLatitude: number;
  maxLatitude: number;
  minLongitude: number;
  maxLongitude: number;
}

function ExplorationRouteOverlay({ explorations, liveRoute, selectedId, bounds }: {
  explorations: PetExploration[];
  liveRoute: ExplorationTrackPoint[];
  selectedId: string | null;
  bounds: ExplorationMapBounds;
}) {
  const routes = explorations.map((exploration) => ({
    id: exploration.id,
    points: exploration.route.length ? exploration.route : [{ latitude: exploration.latitude, longitude: exploration.longitude }],
    selected: exploration.id === selectedId
  }));
  return <svg className="exploration-route-overlay" viewBox="0 0 1000 600" preserveAspectRatio="none" aria-label="저장된 탐험 경로 누적 표시">
    {routes.map((route) => route.points.length > 1
      ? <polyline key={route.id} className={route.selected ? "saved-route selected" : "saved-route"} points={route.points.map((point) => mapPoint(point, bounds)).join(" ")} />
      : <circle key={route.id} className={route.selected ? "saved-place selected" : "saved-place"} {...mapCirclePoint(route.points[0]!, bounds)} r={route.selected ? 11 : 8} />)}
    {liveRoute.length > 1 && <polyline className="live-route" points={liveRoute.map((point) => mapPoint(point, bounds)).join(" ")} />}
    {liveRoute.length > 0 && <circle className="live-position-pulse" {...mapCirclePoint(liveRoute.at(-1)!, bounds)} r="13" />}
  </svg>;
}

function explorationMapBounds(explorations: PetExploration[], liveStart?: ExplorationTrackPoint): ExplorationMapBounds | null {
  const points = explorations.flatMap((exploration) => exploration.route.length
    ? exploration.route
    : [{ latitude: exploration.latitude, longitude: exploration.longitude }]);
  if (liveStart) points.push(liveStart);
  if (!points.length) return null;
  const latitudes = points.map((point) => point.latitude);
  const longitudes = points.map((point) => point.longitude);
  const latitudeCenter = (Math.min(...latitudes) + Math.max(...latitudes)) / 2;
  const longitudeCenter = (Math.min(...longitudes) + Math.max(...longitudes)) / 2;
  const latitudeSpan = Math.max(0.018, Math.max(...latitudes) - Math.min(...latitudes));
  const longitudeSpan = Math.max(0.028, Math.max(...longitudes) - Math.min(...longitudes));
  return {
    minLatitude: latitudeCenter - latitudeSpan * 0.65,
    maxLatitude: latitudeCenter + latitudeSpan * 0.65,
    minLongitude: longitudeCenter - longitudeSpan * 0.65,
    maxLongitude: longitudeCenter + longitudeSpan * 0.65
  };
}

function openStreetMapEmbed(bounds: ExplorationMapBounds, marker?: Pick<PetExploration, "latitude" | "longitude">): string {
  const bbox = [bounds.minLongitude, bounds.minLatitude, bounds.maxLongitude, bounds.maxLatitude].join(",");
  const markerQuery = marker ? `&marker=${marker.latitude}%2C${marker.longitude}` : "";
  return `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(bbox)}&layer=mapnik${markerQuery}`;
}

function mapPoint(point: Pick<ExplorationTrackPoint, "latitude" | "longitude">, bounds: ExplorationMapBounds): string {
  const { cx, cy } = mapCirclePoint(point, bounds);
  return `${cx},${cy}`;
}

function mapCirclePoint(point: Pick<ExplorationTrackPoint, "latitude" | "longitude">, bounds: ExplorationMapBounds): { cx: number; cy: number } {
  return {
    cx: ((point.longitude - bounds.minLongitude) / (bounds.maxLongitude - bounds.minLongitude)) * 1000,
    cy: (1 - (point.latitude - bounds.minLatitude) / (bounds.maxLatitude - bounds.minLatitude)) * 600
  };
}

function formatDistance(distanceMeters: number): string {
  if (distanceMeters < 1_000) return `${Math.round(distanceMeters)}m`;
  return `${(distanceMeters / 1_000).toFixed(distanceMeters >= 10_000 ? 1 : 2)}km`;
}

function formatDuration(durationSeconds: number): string {
  const hours = Math.floor(durationSeconds / 3_600);
  const minutes = Math.floor((durationSeconds % 3_600) / 60);
  const seconds = Math.max(0, durationSeconds % 60);
  if (hours) return `${hours}시간 ${minutes}분`;
  if (minutes) return `${minutes}분 ${seconds}초`;
  return `${seconds}초`;
}

function trackingErrorMessage(error: string): string {
  if (error === "permission-denied") return "위치 권한이 꺼져 있어요. 브라우저 설정에서 위치를 허용한 뒤 다시 시작해주세요.";
  if (error === "position-unavailable") return "현재 GPS 위치를 확인하지 못했어요. 하늘이 보이는 곳에서 다시 시도해주세요.";
  if (error === "timeout") return "GPS 응답이 늦어지고 있어요. 네트워크와 위치 설정을 확인해주세요.";
  return "이 기기에서는 실시간 위치 기능을 사용할 수 없어요.";
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
