import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { COLLAR_COLORS, OUTFIT_COLORS, breedDefinition, furColorValue, petAccentColor, petDescription, type PetAppearance } from "../../domain/pet";
import { ITEM_BY_ID } from "../../domain/catalog";
import type { RoomId, WearableSlot } from "../../domain/types";
import { gameBridge } from "../../game/bridge/GameBridge";

type IndoorRoom = "studio" | "kitchen" | "bathroom" | "bedroom" | "wardrobe";

interface Home3DCanvasProps {
  currentRoom: IndoorRoom;
  appearance: PetAppearance;
  equipped: Record<WearableSlot, string | null>;
  reducedMotion: boolean;
  tired: boolean;
  onRoomChange(room: RoomId): void;
}

interface PetRig {
  root: THREE.Group;
  legs: [THREE.Group, THREE.Group, THREE.Group, THREE.Group];
  tail: THREE.Group;
  head: THREE.Group;
}

interface DoorView {
  id: string;
  target: RoomId;
  room: IndoorRoom;
  pivot: THREE.Group;
  panel: THREE.Mesh;
  hitZone: THREE.Mesh;
  x: number;
  z: number;
  open: boolean;
  desiredAngle: number;
}

interface HomeController {
  visit(room: RoomId): void;
}

const ROOM_LABEL: Record<IndoorRoom, string> = {
  studio: "거실",
  kitchen: "주방",
  bathroom: "욕실",
  bedroom: "침실",
  wardrobe: "옷장"
};

const ROOM_CENTER: Record<IndoorRoom, THREE.Vector3> = {
  studio: new THREE.Vector3(0, 0, 4.25),
  kitchen: new THREE.Vector3(-5.5, 0, -2.65),
  bathroom: new THREE.Vector3(-1.5, 0, -2.65),
  bedroom: new THREE.Vector3(2.5, 0, -2.65),
  wardrobe: new THREE.Vector3(6.5, 0, -2.65)
};

export function Home3DCanvas({ currentRoom, appearance, equipped, reducedMotion, tired, onRoomChange }: Home3DCanvasProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const controllerRef = useRef<HomeController | null>(null);
  const onRoomChangeRef = useRef(onRoomChange);
  const activeRoomRef = useRef<IndoorRoom>(currentRoom);
  const selfRoomUpdateRef = useRef<IndoorRoom | null>(null);
  const [message, setMessage] = useState("바닥을 눌러 걷고, 문을 눌러 열어보세요");

  useEffect(() => { onRoomChangeRef.current = onRoomChange; }, [onRoomChange]);
  useEffect(() => {
    if (selfRoomUpdateRef.current === currentRoom) {
      selfRoomUpdateRef.current = null;
      return;
    }
    if (activeRoomRef.current !== currentRoom) controllerRef.current?.visit(currentRoom);
  }, [currentRoom]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xcfe7e4);
    scene.fog = new THREE.FogExp2(0xbcd8d4, 0.017);

    const camera = new THREE.PerspectiveCamera(68, 1, 0.1, 80);
    camera.position.set(-0.8, 3.25, 6.6);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.domElement.setAttribute("aria-label", `3D 디하의 집: ${petDescription(appearance)}`);
    renderer.domElement.tabIndex = 0;
    host.appendChild(renderer.domElement);

    const world = new THREE.Group();
    scene.add(world);
    addLighting(scene);
    addOceanExterior(world);
    addHouseShell(world);
    addLivingRoom(world);
    addKitchen(world);
    addBathroom(world);
    addBedroom(world);
    addWardrobe(world);

    const doors = createDoors(world);
    const rig = createPetRig(appearance, equipped);
    const start = ROOM_CENTER[activeRoomRef.current];
    rig.root.position.copy(start);
    rig.root.rotation.y = 0;
    world.add(rig.root);

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const floor = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const target = new THREE.Vector3().copy(start);
    const path: THREE.Vector3[] = [];
    const keys = new Set<string>();
    const clock = new THREE.Clock();
    const forward = new THREE.Vector3(0, 0, -1);
    const cameraTarget = new THREE.Vector3();
    let moving = false;
    let stepTime = 0;
    let routeSpeed = 2.75;
    let disposed = false;
    let reaction: "eat" | "sleep" | "wash" | "happy" | "jump" | null = null;
    let reactionStartedAt = 0;
    const stopPetReaction = gameBridge.on("pet:react", ({ action }) => {
      reaction = action === "feed" ? "eat" : action === "sleep" ? "sleep" : action === "wash" ? "wash" : action === "play" ? "jump" : "happy";
      reactionStartedAt = performance.now();
      setMessage(action === "feed" ? "맛있게 먹는 중" : action === "sleep" ? "포근하게 쉬는 중" : action === "wash" ? "보송보송 씻는 중" : "기분 좋게 꼬리를 흔들어요");
    });

    const announceRoom = (room: IndoorRoom) => {
      if (activeRoomRef.current === room) return;
      activeRoomRef.current = room;
      selfRoomUpdateRef.current = room;
      setMessage(`${ROOM_LABEL[room]}에 들어왔어요`);
      onRoomChangeRef.current(room);
    };

    const setRouteThroughDoor = (door: DoorView, fast = false) => {
      routeSpeed = fast ? 7.5 : 2.75;
      const here = roomAt(rig.root.position);
      if (door.target === "wellness") {
        if (here !== "studio") return;
        path.splice(0, path.length, new THREE.Vector3(door.x, 0, 6.15), new THREE.Vector3(door.x, 0, 8.35));
        return;
      }
      if (here === "studio") {
        path.splice(0, path.length, new THREE.Vector3(door.x, 0, 0.78), new THREE.Vector3(door.x, 0, -1.25));
      } else if (here === door.room) {
        path.splice(0, path.length, new THREE.Vector3(door.x, 0, -0.78), new THREE.Vector3(door.x, 0, 1.35));
      }
    };

    const interactDoor = (door: DoorView, traverseOnOpen = false, fast = false) => {
      const here = roomAt(rig.root.position);
      if (door.target !== "wellness" && here !== "studio" && here !== door.room) return;
      if (door.target === "wellness" && here !== "studio") return;
      if (!door.open) {
        door.open = true;
        door.desiredAngle = door.x < 0 ? Math.PI * 0.48 : -Math.PI * 0.48;
        setMessage(`${door.target === "wellness" ? "Ocean 현관" : ROOM_LABEL[door.room]} 문이 열렸어요`);
        if (traverseOnOpen) window.setTimeout(() => setRouteThroughDoor(door, fast), reducedMotion ? 0 : 340);
        return;
      }
      setRouteThroughDoor(door, fast);
      setMessage(`${door.target === "wellness" ? "바다" : ROOM_LABEL[door.room]}로 걸어갑니다`);
    };

    const controller: HomeController = {
      visit(room) {
        const door = doors.find((item) => item.target === room);
        if (door) interactDoor(door, true, true);
        else if (room === "studio") {
          const here = roomAt(rig.root.position);
          const returnDoor = doors.find((item) => item.room === here);
          if (returnDoor) interactDoor(returnDoor, true, true);
          else { routeSpeed = 7.5; path.splice(0, path.length, ROOM_CENTER.studio.clone()); }
        }
      }
    };
    controllerRef.current = controller;

    const moveToFloorPoint = (point: THREE.Vector3) => {
      const here = roomAt(rig.root.position);
      const clamped = clampToRoom(point, here);
      target.copy(clamped);
      routeSpeed = 2.75;
      path.splice(0, path.length, clamped);
      setMessage(`${ROOM_LABEL[here]} 안을 걷는 중`);
    };

    const setPointer = (event: PointerEvent) => {
      const bounds = renderer.domElement.getBoundingClientRect();
      pointer.x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
      pointer.y = -((event.clientY - bounds.top) / bounds.height) * 2 + 1;
    };

    const onPointerDown = (event: PointerEvent) => {
      setPointer(event);
      raycaster.setFromCamera(pointer, camera);
      const doorHits = raycaster.intersectObjects(doors.flatMap((door) => [door.panel, door.hitZone]), false);
      const hitDoor = doorHits[0]?.object.userData.doorId as string | undefined;
      if (hitDoor) {
        const door = doors.find((item) => item.id === hitDoor);
        if (door && door.open && doorHits[0]?.object === door.panel) {
          door.open = false;
          door.desiredAngle = 0;
          path.length = 0;
          setMessage(`${door.target === "wellness" ? "Ocean 현관" : ROOM_LABEL[door.room]} 문을 닫았어요`);
        } else if (door) interactDoor(door);
        return;
      }
      const point = new THREE.Vector3();
      if (raycaster.ray.intersectPlane(floor, point)) moveToFloorPoint(point);
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "KeyW", "KeyA", "KeyS", "KeyD"].includes(event.code)) {
        event.preventDefault();
        keys.add(event.code);
      }
    };
    const onKeyUp = (event: KeyboardEvent) => keys.delete(event.code);
    renderer.domElement.addEventListener("pointerdown", onPointerDown);
    renderer.domElement.addEventListener("keydown", onKeyDown);
    renderer.domElement.addEventListener("keyup", onKeyUp);

    const resize = () => {
      const width = Math.max(1, host.clientWidth);
      const height = Math.max(1, host.clientHeight);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(host);
    resize();

    const updateDoors = (delta: number) => {
      const ease = reducedMotion ? 1 : Math.min(1, delta * 7.5);
      for (const door of doors) door.pivot.rotation.y = THREE.MathUtils.lerp(door.pivot.rotation.y, door.desiredAngle, ease);
    };

    const movePet = (delta: number) => {
      const keyboardDirection = new THREE.Vector3(
        Number(keys.has("ArrowRight") || keys.has("KeyD")) - Number(keys.has("ArrowLeft") || keys.has("KeyA")),
        0,
        Number(keys.has("ArrowDown") || keys.has("KeyS")) - Number(keys.has("ArrowUp") || keys.has("KeyW"))
      );
      let desired: THREE.Vector3 | null = null;
      if (keyboardDirection.lengthSq() > 0) {
        keyboardDirection.normalize();
        desired = rig.root.position.clone().addScaledVector(keyboardDirection, delta * 3.1);
        desired = constrainStep(rig.root.position, desired, doors);
        path.length = 0;
      } else if (path.length > 0) {
        desired = path[0] ?? null;
      }

      moving = false;
      if (desired) {
        const direction = desired.clone().sub(rig.root.position);
        direction.y = 0;
        const distance = direction.length();
        if (distance > 0.035) {
          direction.normalize();
          const step = Math.min(distance, delta * routeSpeed);
          rig.root.position.addScaledVector(direction, step);
          const desiredRotation = Math.atan2(-direction.x, -direction.z);
          rig.root.rotation.y = dampAngle(rig.root.rotation.y, desiredRotation, reducedMotion ? 1 : Math.min(1, delta * 10));
          forward.copy(direction);
          moving = true;
        } else if (path.length > 0) {
          path.shift();
        }
      }

      if (rig.root.position.z > 7.65) {
        onRoomChangeRef.current("wellness");
        return;
      }
      announceRoom(roomAt(rig.root.position));
      stepTime += delta * (moving ? 8.5 : 2.2);
      const stride = reducedMotion ? 0 : Math.sin(stepTime) * (moving ? 0.72 : 0.025);
      rig.legs[0].rotation.x = stride;
      rig.legs[1].rotation.x = -stride;
      rig.legs[2].rotation.x = -stride;
      rig.legs[3].rotation.x = stride;
      rig.tail.rotation.z = reducedMotion ? 0.45 : 0.45 + Math.sin(stepTime * (moving ? 1.7 : 1.1)) * (moving ? 0.35 : 0.18);
      rig.head.rotation.z = reducedMotion ? 0 : Math.sin(stepTime * 0.5) * (moving ? 0.025 : 0.055);
      rig.head.rotation.x = 0;
      rig.root.rotation.z = 0;
      let reactionLift = 0;
      if (reaction) {
        const elapsed = (performance.now() - reactionStartedAt) / 1000;
        if (elapsed > (reaction === "sleep" ? 3.2 : 1.8)) reaction = null;
        else if (reaction === "eat") rig.head.rotation.x = 0.72 + Math.sin(elapsed * 12) * 0.08;
        else if (reaction === "sleep") { rig.head.rotation.x = 0.35; rig.root.rotation.z = -0.11; }
        else if (reaction === "wash") rig.root.rotation.z = Math.sin(elapsed * 24) * 0.08;
        else if (reaction === "happy") rig.tail.rotation.z = 0.45 + Math.sin(elapsed * 18) * 0.62;
        else if (reaction === "jump") reactionLift = Math.abs(Math.sin(Math.min(1, elapsed) * Math.PI * 2)) * 0.34;
      } else if (tired && !moving) {
        rig.head.rotation.x = 0.3;
        rig.tail.rotation.z = 0.18;
        rig.root.rotation.z = -0.035;
      }
      rig.root.position.y = (reducedMotion ? 0 : Math.abs(Math.sin(stepTime * 2)) * (moving ? 0.035 : 0.008)) + reactionLift;
    };

    const updateCamera = (delta: number) => {
      const behind = forward.clone().multiplyScalar(-2.4);
      const shoulder = new THREE.Vector3(forward.z, 0, -forward.x).multiplyScalar(0.8);
      const desired = rig.root.position.clone().add(behind).add(shoulder).add(new THREE.Vector3(0, 3.25, 0));
      const currentRoom = roomAt(rig.root.position);
      if (currentRoom === "studio") desired.z = Math.min(desired.z, 6.62);
      else desired.z = Math.min(desired.z, -0.58);
      desired.x = THREE.MathUtils.clamp(desired.x, -9.8, 9.8);
      desired.z = THREE.MathUtils.clamp(desired.z, -7.6, 12.8);
      const alpha = 1 - Math.exp(-delta * (reducedMotion ? 20 : 4.8));
      camera.position.lerp(desired, alpha);
      cameraTarget.copy(rig.root.position).addScaledVector(forward, 1.45).setY(1.25);
      camera.lookAt(cameraTarget);
    };

    const animate = () => {
      if (disposed) return;
      const delta = Math.min(clock.getDelta(), 0.1);
      updateDoors(delta);
      movePet(delta);
      updateCamera(delta);
      renderer.render(scene, camera);
      requestAnimationFrame(animate);
    };
    animate();

    return () => {
      disposed = true;
      controllerRef.current = null;
      resizeObserver.disconnect();
      stopPetReaction();
      renderer.domElement.removeEventListener("pointerdown", onPointerDown);
      renderer.domElement.removeEventListener("keydown", onKeyDown);
      renderer.domElement.removeEventListener("keyup", onKeyUp);
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose();
          const materials = Array.isArray(object.material) ? object.material : [object.material];
          materials.forEach((material) => {
            const texture = (material as THREE.MeshStandardMaterial).map;
            if (texture) texture.dispose();
            material.dispose();
          });
        }
      });
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [appearance, equipped, reducedMotion, tired]);

  return <div
    ref={hostRef}
    className="home3d-host"
    data-testid="home-3d-canvas"
    data-species={appearance.species}
    data-breed={appearance.breed}
    data-fur-color={appearance.furColor}
    data-pattern={appearance.pattern}
    data-accessory={appearance.accessory}
    data-outfit={appearance.outfit}
  >
    <div className="home3d-compass" aria-live="polite"><span>3D HOME</span><strong>{ROOM_LABEL[currentRoom]}</strong><small>{message}</small></div>
    <div className="home3d-controls" aria-hidden="true"><kbd>WASD</kbd><span>또는 바닥 터치</span></div>
    {(["studio", "kitchen", "bathroom", "bedroom", "wardrobe", "wellness"] as const).map((room) => <button
      key={room}
      className="sr-only home3d-access-door"
      data-testid={`home3d-door-${room}`}
      onClick={() => controllerRef.current?.visit(room)}
    >{room === "wellness" ? "Ocean" : ROOM_LABEL[room]} 문 열고 이동</button>)}
  </div>;
}

function addLighting(scene: THREE.Scene): void {
  scene.add(new THREE.HemisphereLight(0xe8f8ff, 0x8f7255, 1.25));
  const sun = new THREE.DirectionalLight(0xfff1cf, 2.35);
  sun.position.set(-7, 12, 10);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -14;
  sun.shadow.camera.right = 14;
  sun.shadow.camera.top = 14;
  sun.shadow.camera.bottom = -14;
  sun.shadow.bias = -0.0004;
  scene.add(sun);
  const warm = new THREE.PointLight(0xffc980, 12, 12, 2);
  warm.position.set(2.5, 3.2, -2.4);
  scene.add(warm);
}

function createCanvasTexture(kind: "wood" | "tile" | "rug" | "water"): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const context = canvas.getContext("2d")!;
  if (kind === "wood") {
    context.fillStyle = "#b98657";
    context.fillRect(0, 0, 512, 512);
    for (let row = 0; row < 16; row += 1) {
      const y = row * 32;
      context.fillStyle = row % 3 === 0 ? "#c99667" : row % 3 === 1 ? "#ad784d" : "#bd895b";
      context.fillRect(0, y + 1, 512, 29);
      context.strokeStyle = "rgba(74,40,21,.25)";
      context.beginPath(); context.moveTo(0, y); context.lineTo(512, y); context.stroke();
      for (let x = (row % 2) * 92 - 92; x < 512; x += 184) { context.beginPath(); context.moveTo(x, y); context.lineTo(x, y + 32); context.stroke(); }
    }
  } else if (kind === "tile") {
    context.fillStyle = "#dce9e5"; context.fillRect(0, 0, 512, 512);
    context.strokeStyle = "rgba(76,112,111,.25)"; context.lineWidth = 5;
    for (let value = 0; value <= 512; value += 64) { context.beginPath(); context.moveTo(value, 0); context.lineTo(value, 512); context.stroke(); context.beginPath(); context.moveTo(0, value); context.lineTo(512, value); context.stroke(); }
  } else if (kind === "rug") {
    const gradient = context.createRadialGradient(256, 256, 30, 256, 256, 300);
    gradient.addColorStop(0, "#f0c986"); gradient.addColorStop(0.6, "#d89472"); gradient.addColorStop(1, "#8d5f67");
    context.fillStyle = gradient; context.fillRect(0, 0, 512, 512);
    context.strokeStyle = "rgba(255,255,255,.45)"; context.lineWidth = 11;
    for (let radius = 60; radius < 250; radius += 42) { context.beginPath(); context.arc(256, 256, radius, 0, Math.PI * 2); context.stroke(); }
  } else {
    const gradient = context.createLinearGradient(0, 0, 0, 512);
    gradient.addColorStop(0, "#68c9e7"); gradient.addColorStop(0.45, "#2e9fbe"); gradient.addColorStop(1, "#0e5a75");
    context.fillStyle = gradient; context.fillRect(0, 0, 512, 512);
    context.strokeStyle = "rgba(255,255,255,.35)"; context.lineWidth = 4;
    for (let y = 35; y < 512; y += 42) { context.beginPath(); context.moveTo(0, y); context.bezierCurveTo(130, y - 16, 280, y + 16, 512, y - 4); context.stroke(); }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(kind === "wood" ? 4 : 2, kind === "wood" ? 5 : 2);
  texture.anisotropy = 8;
  return texture;
}

function addHouseShell(world: THREE.Group): void {
  const wood = createCanvasTexture("wood");
  const tile = createCanvasTexture("tile");
  const floorMaterial = new THREE.MeshStandardMaterial({ map: wood, roughness: 0.72, metalness: 0.02 });
  const tileMaterial = new THREE.MeshStandardMaterial({ map: tile, roughness: 0.5, metalness: 0.03 });
  const livingFloor = new THREE.Mesh(new THREE.BoxGeometry(16, 0.24, 7), floorMaterial);
  livingFloor.position.set(0, -0.12, 3.5); livingFloor.receiveShadow = true; world.add(livingFloor);
  const innerFloor = new THREE.Mesh(new THREE.BoxGeometry(16, 0.24, 5), tileMaterial);
  innerFloor.position.set(0, -0.12, -2.5); innerFloor.receiveShadow = true; world.add(innerFloor);

  const wallMaterial = new THREE.MeshStandardMaterial({ color: 0xf4ead9, roughness: 0.88 });
  const accentMaterial = new THREE.MeshStandardMaterial({ color: 0xd5b790, roughness: 0.82 });
  const wall = (x: number, z: number, width: number, depth: number, height = 3.3, material = wallMaterial) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
    mesh.position.set(x, height / 2, z); mesh.castShadow = true; mesh.receiveShadow = true; world.add(mesh); return mesh;
  };
  wall(-8.1, 1, 0.22, 12, 3.3); wall(8.1, 1, 0.22, 12, 3.3);
  wall(0, -5.1, 16.4, 0.22, 3.3);
  for (const [from, to] of [[-8, -6.3], [-4.7, -2.3], [-0.7, 1.7], [3.3, 5.7], [7.3, 8]] as Array<[number, number]>) wall((from + to) / 2, 0, to - from, 0.2, 3.3);
  wall(-3, -2.5, 0.18, 5, 3.3); wall(0, -2.5, 0.18, 5, 3.3); wall(5, -2.5, 0.18, 5, 3.3);
  wall(-4.35, 7, 7.3, 0.2, 3.3); wall(4.35, 7, 7.3, 0.2, 3.3);
  wall(0, 7, 1.55, 0.2, 0.52, accentMaterial).position.y = 3.04;
  for (const z of [-4.95, 0.12, 6.88]) wall(0, z, 16.1, 0.08, 0.14, accentMaterial).position.y = 0.11;
}

function addOceanExterior(world: THREE.Group): void {
  const water = new THREE.Mesh(new THREE.PlaneGeometry(48, 30), new THREE.MeshStandardMaterial({ map: createCanvasTexture("water"), roughness: 0.34, metalness: 0.12 }));
  water.rotation.x = -Math.PI / 2; water.position.set(0, -0.08, 19); water.receiveShadow = true; world.add(water);
  const sand = new THREE.Mesh(new THREE.PlaneGeometry(25, 8), new THREE.MeshStandardMaterial({ color: 0xe8cf9e, roughness: 1 }));
  sand.rotation.x = -Math.PI / 2; sand.position.set(0, -0.05, 9.2); world.add(sand);
  const sky = new THREE.Mesh(new THREE.PlaneGeometry(45, 18), new THREE.MeshBasicMaterial({ color: 0x85d1eb }));
  sky.position.set(0, 7, 27); world.add(sky);
  for (const x of [-5.8, 5.8]) {
    const frame = new THREE.Mesh(new THREE.BoxGeometry(3.5, 2.35, 0.1), new THREE.MeshStandardMaterial({ color: 0xf8f2df, roughness: 0.55 }));
    frame.position.set(x, 1.75, 6.86); world.add(frame);
    const glass = new THREE.Mesh(new THREE.PlaneGeometry(3.18, 2.05), new THREE.MeshPhysicalMaterial({ color: 0x91d9e8, transmission: 0.45, transparent: true, opacity: 0.5, roughness: 0.12 }));
    glass.position.set(x, 1.75, 6.8); glass.rotation.y = Math.PI; world.add(glass);
  }
}

function addLivingRoom(world: THREE.Group): void {
  const rug = new THREE.Mesh(new THREE.PlaneGeometry(5.7, 3.2), new THREE.MeshStandardMaterial({ map: createCanvasTexture("rug"), roughness: 0.92 }));
  rug.rotation.x = -Math.PI / 2; rug.position.set(0, 0.012, 3.8); rug.receiveShadow = true; world.add(rug);
  addSofa(world, -3.25, 4.25, Math.PI / 2, 0x6f9b8f);
  addSofa(world, 3.25, 4.25, -Math.PI / 2, 0xd59b78);
  const table = furnitureBox(0x8d5b36, 2.7, 0.22, 1.35, 0.42); table.position.set(0, 0.55, 2.55); world.add(table);
  for (const x of [-1.05, 1.05]) for (const z of [2.05, 3.05]) { const leg = furnitureBox(0x5d3b28, 0.12, 0.5, 0.12, 0.5); leg.position.set(x, 0.25, z); world.add(leg); }
  addPlant(world, -6.9, 5.7, 1.25); addPlant(world, 6.8, 5.65, 1.1);
  const mediaWall = new THREE.Group(); mediaWall.position.set(-7.76, 0, 3.35); mediaWall.rotation.y = Math.PI / 2;
  const consoleTable = furnitureBox(0x715643, 3.7, 0.8, 0.45, 0.6); consoleTable.position.set(0, 0.55, 0); mediaWall.add(consoleTable);
  const television = furnitureBox(0x172d35, 3.1, 1.65, 0.12, 0.2); television.position.set(0, 1.75, -0.18); mediaWall.add(television);
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(2.8, 1.38), new THREE.MeshBasicMaterial({ color: 0x3aa7b4 })); screen.position.set(0, 1.75, -0.245); screen.rotation.y = Math.PI; mediaWall.add(screen);
  world.add(mediaWall);
}

function addKitchen(world: THREE.Group): void {
  const cabinet = new THREE.MeshStandardMaterial({ color: 0xb87945, roughness: 0.64 });
  const stone = new THREE.MeshStandardMaterial({ color: 0xf2e4ce, roughness: 0.38 });
  for (const x of [-7.3, -6.2, -5.1, -4]) {
    const base = new THREE.Mesh(new THREE.BoxGeometry(0.98, 0.95, 0.68), cabinet); base.position.set(x, 0.48, -4.55); base.castShadow = true; world.add(base);
    const top = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.12, 0.78), stone); top.position.set(x, 1.02, -4.55); top.castShadow = true; world.add(top);
  }
  const fridge = furnitureBox(0xc7d1d0, 1.25, 2.55, 0.82, 0.24); fridge.position.set(-7.2, 1.28, -1.2); fridge.userData.action = "fridge"; world.add(fridge);
  const handle = furnitureBox(0x536a6c, 0.06, 0.88, 0.08, 0.12); handle.position.set(-6.55, 1.45, -0.8); world.add(handle);
  const island = furnitureBox(0xd0a06c, 2.75, 0.9, 1.2, 0.52); island.position.set(-5.4, 0.48, -2.55); world.add(island);
  const islandTop = furnitureBox(0xf7ead5, 2.95, 0.13, 1.35, 0.28); islandTop.position.set(-5.4, 0.99, -2.55); world.add(islandTop);
  for (const x of [-6.2, -4.6]) addPendant(world, x, -2.55, 0xf3bd66);
  addPlant(world, -3.65, -4.3, 0.55);
}

function addBathroom(world: THREE.Group): void {
  const tub = new THREE.Mesh(new THREE.CapsuleGeometry(0.55, 1.2, 8, 18), new THREE.MeshPhysicalMaterial({ color: 0xf8fbf7, roughness: 0.28, clearcoat: 0.5 }));
  tub.rotation.z = Math.PI / 2; tub.scale.set(1, 1, 0.7); tub.position.set(-1.5, 0.55, -3.65); tub.castShadow = true; world.add(tub);
  const water = new THREE.Mesh(new THREE.CapsuleGeometry(0.45, 1.05, 8, 18), new THREE.MeshPhysicalMaterial({ color: 0x69d2d2, transmission: 0.45, transparent: true, opacity: 0.66, roughness: 0.12 }));
  water.rotation.z = Math.PI / 2; water.scale.set(1, 1, 0.55); water.position.set(-1.5, 0.83, -3.65); world.add(water);
  const vanity = furnitureBox(0xb98c65, 0.68, 0.82, 1.55, 0.45); vanity.position.set(-2.55, 0.46, -2.2); world.add(vanity);
  const sink = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.34, 0.2, 24), new THREE.MeshPhysicalMaterial({ color: 0xf5fbfa, roughness: 0.25 })); sink.position.set(-2.55, 0.96, -2.2); world.add(sink);
  const mirror = new THREE.Mesh(new THREE.CircleGeometry(0.62, 32), new THREE.MeshPhysicalMaterial({ color: 0x9fc9cd, metalness: 0.62, roughness: 0.08 })); mirror.position.set(-2.89, 1.9, -2.2); mirror.rotation.y = Math.PI / 2; world.add(mirror);
  addPlant(world, -2.55, -4.15, 0.5);
}

function addBedroom(world: THREE.Group): void {
  const bedBase = furnitureBox(0x8b715f, 3.3, 0.48, 2.35, 0.58); bedBase.position.set(2.5, 0.28, -3.35); world.add(bedBase);
  const mattress = furnitureBox(0xf6eee3, 3.15, 0.42, 2.25, 0.62); mattress.position.set(2.5, 0.7, -3.25); world.add(mattress);
  const blanket = furnitureBox(0x7189b7, 3.18, 0.13, 1.35, 0.7); blanket.position.set(2.5, 0.96, -3.55); world.add(blanket);
  for (const x of [1.72, 3.28]) { const pillow = furnitureBox(0xfdf9ef, 1.2, 0.22, 0.62, 0.75); pillow.position.set(x, 0.98, -2.45); world.add(pillow); }
  const headboard = furnitureBox(0x9e6d53, 3.45, 1.6, 0.2, 0.62); headboard.position.set(2.5, 1.1, -4.7); world.add(headboard);
  for (const x of [0.55, 4.45]) { const side = furnitureBox(0x9d7657, 0.7, 0.7, 0.65, 0.55); side.position.set(x, 0.36, -3.7); world.add(side); addPendant(world, x, -3.7, 0xffca78, 1.5); }
}

function addWardrobe(world: THREE.Group): void {
  for (const x of [5.55, 6.5, 7.45]) {
    const wardrobe = furnitureBox(0xb88963, 0.88, 2.7, 0.72, 0.5); wardrobe.position.set(x, 1.36, -4.55); world.add(wardrobe);
    const mirror = new THREE.Mesh(new THREE.PlaneGeometry(0.58, 2.2), new THREE.MeshPhysicalMaterial({ color: 0xb8d7d8, metalness: 0.48, roughness: 0.12 })); mirror.position.set(x, 1.4, -4.18); world.add(mirror);
  }
  const bench = furnitureBox(0x77928b, 2.1, 0.48, 0.75, 0.72); bench.position.set(6.5, 0.3, -2.25); world.add(bench);
  const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.2, 10), new THREE.MeshStandardMaterial({ color: 0xb99b64, metalness: 0.75, roughness: 0.22 })); rail.rotation.z = Math.PI / 2; rail.position.set(6.5, 1.75, -1.1); world.add(rail);
  for (let index = 0; index < 5; index += 1) {
    const garment = new THREE.Mesh(new THREE.ConeGeometry(0.34, 1.05, 4), new THREE.MeshStandardMaterial({ color: [0xd67d6d, 0x7194a7, 0xe4c16e, 0x799f8b, 0xb184a5][index] }));
    garment.position.set(5.7 + index * 0.4, 1.2, -1.1); garment.rotation.y = Math.PI / 4; world.add(garment);
  }
}

function createDoors(world: THREE.Group): DoorView[] {
  const specs: Array<{ id: string; target: RoomId; room: IndoorRoom; x: number; z: number; color: number }> = [
    { id: "kitchen", target: "kitchen", room: "kitchen", x: -5.5, z: 0, color: 0xc28a58 },
    { id: "bathroom", target: "bathroom", room: "bathroom", x: -1.5, z: 0, color: 0x7fb1aa },
    { id: "bedroom", target: "bedroom", room: "bedroom", x: 2.5, z: 0, color: 0x7e8eac },
    { id: "wardrobe", target: "wardrobe", room: "wardrobe", x: 6.5, z: 0, color: 0xb18360 },
    { id: "ocean", target: "wellness", room: "studio", x: 0, z: 7, color: 0x4e9ca3 }
  ];
  return specs.map((spec) => {
    const pivot = new THREE.Group();
    pivot.position.set(spec.x - 0.75, 0, spec.z);
    const panel = new THREE.Mesh(new THREE.BoxGeometry(1.5, 2.65, 0.11), new THREE.MeshStandardMaterial({ color: spec.color, roughness: 0.56, metalness: 0.03 }));
    panel.position.set(0.75, 1.325, 0); panel.castShadow = true; panel.userData.doorId = spec.id; pivot.add(panel);
    const inset = new THREE.Mesh(new THREE.BoxGeometry(1.08, 1.8, 0.05), new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.12, roughness: 0.45 })); inset.position.set(0.75, 1.42, -0.075); inset.userData.doorId = spec.id; pivot.add(inset);
    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.085, 16, 12), new THREE.MeshStandardMaterial({ color: 0xf1cb62, metalness: 0.78, roughness: 0.22 })); knob.position.set(1.28, 1.28, -0.12); knob.userData.doorId = spec.id; pivot.add(knob);
    world.add(pivot);
    const hitZone = new THREE.Mesh(new THREE.BoxGeometry(1.72, 2.82, 0.3), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }));
    hitZone.position.set(spec.x, 1.41, spec.z); hitZone.userData.doorId = spec.id; world.add(hitZone);
    const frameMaterial = new THREE.MeshStandardMaterial({ color: 0xfbf6e9, roughness: 0.58 });
    for (const [x, y, width, height] of [[spec.x - 0.87, 1.38, 0.14, 2.9], [spec.x + 0.87, 1.38, 0.14, 2.9], [spec.x, 2.8, 1.86, 0.14]] as Array<[number, number, number, number]>) {
      const frame = new THREE.Mesh(new THREE.BoxGeometry(width, height, 0.2), frameMaterial); frame.position.set(x, y, spec.z); frame.castShadow = true; world.add(frame);
    }
    return { ...spec, pivot, panel, hitZone, open: false, desiredAngle: 0 };
  });
}

function createPetRig(appearance: PetAppearance, equipped: Record<WearableSlot, string | null>): PetRig {
  const root = new THREE.Group();
  const renderedAppearance: PetAppearance = appearance.accessory === "none" && equipped.accessory ? { ...appearance, accessory: "round" } : appearance;
  const breed = breedDefinition(appearance.breed);
  const size = breed.size === "large" ? 1.18 : breed.size === "small" ? 0.88 : 1;
  root.scale.setScalar(size);
  const fur = new THREE.MeshStandardMaterial({ color: furColorValue(appearance.furColor), roughness: breed.coat === "short" ? 0.58 : 0.9 });
  const accent = new THREE.MeshStandardMaterial({ color: petAccentColor(appearance), roughness: 0.82 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x25363b, roughness: 0.35 });
  const topColor = equipped.top ? ITEM_BY_ID[equipped.top]?.color : undefined;
  const outfitColor = topColor ?? (appearance.outfit === "none" ? null : OUTFIT_COLORS[appearance.outfit]);

  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.34, 0.68, 8, 20), fur);
  body.rotation.x = Math.PI / 2; body.position.set(0, 0.66, 0.05); body.scale.set(1.08, 1, 0.94); body.castShadow = true; root.add(body);
  if (outfitColor) {
    const clothing = new THREE.Mesh(new THREE.CapsuleGeometry(0.355, 0.43, 8, 20), new THREE.MeshStandardMaterial({ color: outfitColor, roughness: 0.68 }));
    clothing.rotation.x = Math.PI / 2; clothing.position.set(0, 0.67, 0.17); clothing.scale.set(1.09, 1, 0.96); clothing.castShadow = true; root.add(clothing);
  }
  const bottomColor = equipped.bottom ? ITEM_BY_ID[equipped.bottom]?.color : undefined;
  if (bottomColor) { const rearWear = new THREE.Mesh(new THREE.SphereGeometry(0.37, 20, 14), new THREE.MeshStandardMaterial({ color: bottomColor, roughness: 0.72 })); rearWear.scale.set(1.05, 0.82, 0.9); rearWear.position.set(0, 0.67, 0.35); rearWear.castShadow = true; root.add(rearWear); }

  if (appearance.pattern !== "solid") {
    const mark = new THREE.Mesh(new THREE.SphereGeometry(0.22, 18, 14), accent); mark.scale.set(1.15, 0.35, 0.75); mark.position.set(-0.18, 0.94, -0.02); root.add(mark);
    if (appearance.pattern === "tabby") for (const z of [-0.08, 0.12, 0.3]) { const stripe = new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.025, 8, 24, Math.PI), accent); stripe.rotation.x = Math.PI / 2; stripe.position.set(0, 0.72, z); root.add(stripe); }
  }

  const head = new THREE.Group(); head.position.set(0, 0.91, -0.59); root.add(head);
  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.38, 26, 20), fur); skull.scale.set(1, 0.96, breed.muzzle === "short" ? 0.86 : 0.96); skull.castShadow = true; head.add(skull);
  const muzzleLength = breed.muzzle === "long" ? 0.31 : breed.muzzle === "medium" ? 0.24 : 0.19;
  const muzzle = new THREE.Mesh(new THREE.SphereGeometry(0.2, 18, 14), new THREE.MeshStandardMaterial({ color: 0xf2e7d6, roughness: 0.8 })); muzzle.scale.set(1.18, 0.72, muzzleLength / 0.2); muzzle.position.set(0, -0.08, -0.32); muzzle.castShadow = true; head.add(muzzle);
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.065, 14, 10), dark); nose.scale.set(1.15, 0.78, 0.68); nose.position.set(0, -0.035, -0.5 - (muzzleLength - 0.19) * 0.55); head.add(nose);

  const eyeMaterial = new THREE.MeshStandardMaterial({ color: appearance.species === "cat" ? 0x3d796c : 0x20383e, roughness: 0.2, metalness: 0.05 });
  for (const x of [-0.14, 0.14]) { const eye = new THREE.Mesh(new THREE.SphereGeometry(0.043, 12, 10), eyeMaterial); eye.position.set(x, 0.08, -0.33); head.add(eye); const glint = new THREE.Mesh(new THREE.SphereGeometry(0.012, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffffff })); glint.position.set(x - 0.012, 0.097, -0.37); head.add(glint); }
  addPetEars(head, appearance, fur, accent);
  addPetCoat(head, appearance, fur);
  addPetAccessories(head, renderedAppearance);

  if (appearance.collar !== "none") {
    const collar = new THREE.Mesh(new THREE.TorusGeometry(0.29, 0.035, 10, 28), new THREE.MeshStandardMaterial({ color: COLLAR_COLORS[appearance.collar], roughness: 0.52 }));
    collar.position.set(0, 0.68, -0.42); collar.rotation.x = Math.PI / 2; root.add(collar);
    const tag = new THREE.Mesh(new THREE.SphereGeometry(0.055, 12, 8), new THREE.MeshStandardMaterial({ color: 0xf0c851, metalness: 0.55, roughness: 0.3 })); tag.position.set(0, 0.55, -0.67); root.add(tag);
  }

  const makeLeg = (x: number, z: number) => {
    const pivot = new THREE.Group(); pivot.position.set(x, 0.56, z);
    const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.095, 0.36, 6, 12), fur); leg.position.y = -0.25; leg.castShadow = true; pivot.add(leg);
    const shoeColor = equipped.shoes ? ITEM_BY_ID[equipped.shoes]?.color : undefined;
    const pawMaterial = shoeColor ? new THREE.MeshStandardMaterial({ color: shoeColor, roughness: 0.6 }) : appearance.pattern === "points" ? accent : fur;
    const paw = new THREE.Mesh(new THREE.SphereGeometry(0.12, 14, 10), pawMaterial); paw.scale.set(1.08, 0.62, 1.25); paw.position.set(0, -0.51, -0.035); paw.castShadow = true; pivot.add(paw); root.add(pivot); return pivot;
  };
  const legs: PetRig["legs"] = [makeLeg(-0.26, -0.31), makeLeg(0.26, -0.31), makeLeg(-0.26, 0.36), makeLeg(0.26, 0.36)];

  const tail = new THREE.Group(); tail.position.set(0, 0.79, 0.58); tail.rotation.z = 0.45; root.add(tail);
  const tailMesh = new THREE.Mesh(new THREE.CapsuleGeometry(appearance.species === "cat" ? 0.07 : 0.11, appearance.species === "cat" ? 0.72 : 0.5, 7, 14), fur); tailMesh.position.y = 0.34; tailMesh.rotation.z = appearance.species === "cat" ? -0.25 : -0.45; tailMesh.castShadow = true; tail.add(tailMesh);
  const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.64, 32), new THREE.MeshBasicMaterial({ color: 0x14333a, transparent: true, opacity: 0.22, depthWrite: false })); shadow.scale.set(1, 1.45, 1); shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.012; root.add(shadow);
  return { root, legs, tail, head };
}

function addPetEars(head: THREE.Group, appearance: PetAppearance, fur: THREE.Material, accent: THREE.Material): void {
  const breed = breedDefinition(appearance.breed);
  for (const side of [-1, 1]) {
    const geometry = breed.ears === "drop" ? new THREE.CapsuleGeometry(0.11, 0.37, 6, 12) : new THREE.ConeGeometry(0.17, breed.ears === "round" ? 0.28 : 0.42, breed.ears === "round" ? 18 : 4);
    const ear = new THREE.Mesh(geometry, fur); ear.position.set(side * 0.27, breed.ears === "drop" ? -0.01 : 0.3, breed.ears === "drop" ? -0.01 : -0.01); ear.rotation.z = side * (breed.ears === "drop" ? -0.35 : -0.15); ear.castShadow = true; head.add(ear);
    if (breed.ears !== "drop") { const inner = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.26, breed.ears === "round" ? 14 : 4), accent); inner.position.set(side * 0.27, 0.3, -0.05); inner.rotation.z = side * -0.15; inner.scale.set(0.8, 0.8, 0.45); head.add(inner); }
  }
}

function addPetCoat(head: THREE.Group, appearance: PetAppearance, fur: THREE.Material): void {
  const coat = breedDefinition(appearance.breed).coat;
  if (coat !== "curly" && coat !== "fluffy" && coat !== "long") return;
  for (let index = 0; index < (coat === "curly" ? 13 : 9); index += 1) {
    const angle = (index / (coat === "curly" ? 13 : 9)) * Math.PI * 2;
    const tuft = new THREE.Mesh(new THREE.SphereGeometry(coat === "curly" ? 0.11 : 0.09, 10, 8), fur); tuft.position.set(Math.cos(angle) * 0.34, Math.sin(angle) * 0.31, 0.01); head.add(tuft);
  }
}

function addPetAccessories(head: THREE.Group, appearance: PetAppearance): void {
  if (appearance.accessory !== "none" && appearance.accessory !== "bandana") {
    const frame = new THREE.MeshStandardMaterial({ color: 0x294954, metalness: 0.42, roughness: 0.3 });
    const lens = appearance.accessory === "sunglasses" ? new THREE.MeshStandardMaterial({ color: 0x163640, transparent: true, opacity: 0.78, roughness: 0.18 }) : frame;
    for (const x of [-0.14, 0.14]) { const rim = new THREE.Mesh(new THREE.TorusGeometry(0.105, 0.014, 8, appearance.accessory === "square" ? 4 : 20), lens); rim.position.set(x, 0.07, -0.37); head.add(rim); }
    const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.018, 0.018), frame); bridge.position.set(0, 0.07, -0.38); head.add(bridge);
  }
  if (appearance.accessory === "bandana") { const bandana = new THREE.Mesh(new THREE.ConeGeometry(0.25, 0.38, 3), new THREE.MeshStandardMaterial({ color: 0xef7c6e, roughness: 0.72 })); bandana.rotation.x = Math.PI; bandana.position.set(0, -0.28, 0.03); head.add(bandana); }
  if (appearance.hat === "none") return;
  const color = appearance.hat === "cap" ? 0x3b8490 : appearance.hat === "beanie" ? 0xef7c6e : 0xe5c270;
  const hat = new THREE.Mesh(appearance.hat === "sunhat" ? new THREE.CylinderGeometry(0.48, 0.48, 0.07, 24) : new THREE.SphereGeometry(0.31, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color, roughness: 0.75 }));
  hat.position.set(0, 0.36, 0); hat.castShadow = true; head.add(hat);
  if (appearance.hat === "beanie") { const pom = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 9), hat.material); pom.position.set(0, 0.65, 0); head.add(pom); }
}

function furnitureBox(color: number, width: number, height: number, depth: number, roughness: number): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth, 2, 2, 2), new THREE.MeshStandardMaterial({ color, roughness }));
  mesh.castShadow = true; mesh.receiveShadow = true; return mesh;
}

function addSofa(world: THREE.Group, x: number, z: number, rotation: number, color: number): void {
  const group = new THREE.Group(); group.position.set(x, 0, z); group.rotation.y = rotation;
  const seat = furnitureBox(color, 2.7, 0.5, 0.92, 0.82); seat.position.y = 0.45; group.add(seat);
  const back = furnitureBox(color, 2.75, 1.15, 0.28, 0.82); back.position.set(0, 1.05, 0.36); group.add(back);
  for (const xOffset of [-0.88, 0, 0.88]) { const cushion = furnitureBox(0xdfe5d8, 0.75, 0.26, 0.68, 0.94); cushion.position.set(xOffset, 0.78, -0.04); group.add(cushion); }
  world.add(group);
}

function addPlant(world: THREE.Group, x: number, z: number, scale: number): void {
  const group = new THREE.Group(); group.position.set(x, 0, z); group.scale.setScalar(scale);
  const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.22, 0.55, 18), new THREE.MeshStandardMaterial({ color: 0xb96f4f, roughness: 0.84 })); pot.position.y = 0.28; pot.castShadow = true; group.add(pot);
  const stemMaterial = new THREE.MeshStandardMaterial({ color: 0x3e7753, roughness: 0.88 });
  const leafMaterial = new THREE.MeshStandardMaterial({ color: 0x4f9368, roughness: 0.78, side: THREE.DoubleSide });
  for (let index = 0; index < 8; index += 1) {
    const angle = (index / 8) * Math.PI * 2;
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.025, 0.8, 7), stemMaterial); stem.position.set(Math.cos(angle) * 0.12, 0.85, Math.sin(angle) * 0.12); stem.rotation.z = Math.cos(angle) * 0.35; group.add(stem);
    const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 8), leafMaterial); leaf.scale.set(0.55, 1.35, 0.3); leaf.position.set(Math.cos(angle) * 0.38, 1.18 + (index % 2) * 0.12, Math.sin(angle) * 0.38); leaf.rotation.z = -angle; group.add(leaf);
  }
  world.add(group);
}

function addPendant(world: THREE.Group, x: number, z: number, color: number, height = 2.75): void {
  const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.8, 7), new THREE.MeshStandardMaterial({ color: 0x4e4138, roughness: 0.7 })); cord.position.set(x, height + 0.35, z); world.add(cord);
  const shade = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.42, 20, 1, true), new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.18, roughness: 0.62, side: THREE.DoubleSide })); shade.position.set(x, height, z); world.add(shade);
  const light = new THREE.PointLight(color, 3.8, 4, 2); light.position.set(x, height - 0.2, z); world.add(light);
}

function roomAt(position: THREE.Vector3): IndoorRoom {
  if (position.z >= -0.05) return "studio";
  if (position.x < -3) return "kitchen";
  if (position.x < 0) return "bathroom";
  if (position.x < 5) return "bedroom";
  return "wardrobe";
}

function clampToRoom(point: THREE.Vector3, room: IndoorRoom): THREE.Vector3 {
  if (room === "studio") return new THREE.Vector3(THREE.MathUtils.clamp(point.x, -7.35, 7.35), 0, THREE.MathUtils.clamp(point.z, 0.55, 6.35));
  const ranges: Record<Exclude<IndoorRoom, "studio">, [number, number]> = { kitchen: [-7.45, -3.55], bathroom: [-2.55, -0.45], bedroom: [0.55, 4.45], wardrobe: [5.55, 7.45] };
  const range = ranges[room];
  return new THREE.Vector3(THREE.MathUtils.clamp(point.x, range[0], range[1]), 0, THREE.MathUtils.clamp(point.z, -4.45, -0.65));
}

function constrainStep(from: THREE.Vector3, desired: THREE.Vector3, doors: DoorView[]): THREE.Vector3 {
  const room = roomAt(from);
  if (room === "studio") {
    desired.x = THREE.MathUtils.clamp(desired.x, -7.45, 7.45);
    desired.z = THREE.MathUtils.clamp(desired.z, 0.3, 7.4);
    if (desired.z < 0.3) {
      const door = doors.find((item) => item.target !== "wellness" && item.open && Math.abs(item.x - desired.x) < 0.7);
      if (!door) desired.z = 0.3;
    }
    if (desired.z > 6.65) {
      const ocean = doors.find((item) => item.target === "wellness" && item.open && Math.abs(desired.x) < 0.7);
      if (!ocean) desired.z = 6.65;
    }
    return desired;
  }
  const clamped = clampToRoom(desired, room);
  if (desired.z > -0.3) {
    const door = doors.find((item) => item.room === room && item.open && Math.abs(item.x - desired.x) < 0.7);
    if (door) return desired.setY(0);
  }
  return clamped;
}

function dampAngle(current: number, target: number, alpha: number): number {
  const delta = Math.atan2(Math.sin(target - current), Math.cos(target - current));
  return current + delta * alpha;
}
