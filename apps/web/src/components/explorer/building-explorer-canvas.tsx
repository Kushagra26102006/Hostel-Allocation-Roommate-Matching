"use client";

import React, { useRef, useEffect } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Html, Center } from "@react-three/drei";
import * as THREE from "three";

type OrbitControlsImpl = React.ComponentRef<typeof OrbitControls>;
import { type Building3DModel, type Room3DData, STATUS_COLORS, STATUS_LABELS } from "./types";

interface CanvasProps {
  model: Building3DModel;
  selectedFloor: number | null; // null = all floors
  selectedRoom: Room3DData | null;
  onSelectRoom: (room: Room3DData) => void;
  hoveredRoom: Room3DData | null;
  onHoverRoom: (room: Room3DData | null) => void;
}

/**
 * Camera Controller that performs smooth fly-to lerping when a room is selected.
 */
function SmoothCameraController({
  selectedRoom,
  model,
}: {
  selectedRoom: Room3DData | null;
  model: Building3DModel;
}) {
  const { camera } = useThree();
  const controlsRef = useRef<OrbitControlsImpl>(null);

  // Target camera coordinates
  const targetCamPos = useRef<THREE.Vector3>(
    new THREE.Vector3(
      model.bounds.width * 1.2,
      model.bounds.height * 1.5,
      model.bounds.depth * 1.8,
    ),
  );
  const targetLookAt = useRef<THREE.Vector3>(new THREE.Vector3(0, model.bounds.height * 0.4, 0));
  const isTransitioning = useRef<boolean>(false);

  useEffect(() => {
    if (selectedRoom) {
      const [rx, ry, rz] = selectedRoom.position;
      targetLookAt.current.set(rx, ry, rz);
      // Position camera offset facing the front of the room
      targetCamPos.current.set(rx + 6, ry + 4, rz + 8);
      isTransitioning.current = true;
    } else {
      // Return to overall building perspective
      targetLookAt.current.set(0, model.bounds.height * 0.4, 0);
      targetCamPos.current.set(
        model.bounds.width * 1.1,
        model.bounds.height * 1.4,
        model.bounds.depth * 1.6,
      );
      isTransitioning.current = true;
    }
  }, [selectedRoom, model]);

  useFrame((_, delta) => {
    if (isTransitioning.current && controlsRef.current) {
      const step = Math.min(delta * 4, 0.1);
      camera.position.lerp(targetCamPos.current, step);
      controlsRef.current.target.lerp(targetLookAt.current, step);
      controlsRef.current.update();

      if (
        camera.position.distanceTo(targetCamPos.current) < 0.1 &&
        controlsRef.current.target.distanceTo(targetLookAt.current) < 0.1
      ) {
        isTransitioning.current = false;
      }
    }
  });

  return (
    <OrbitControls
      ref={controlsRef}
      enableDamping
      dampingFactor={0.08}
      minDistance={4}
      maxDistance={120}
      maxPolarAngle={Math.PI / 2 + 0.05} // Do not go under ground
    />
  );
}

/**
 * Individual 3D Room Box Mesh with occupancy material, hover glow, and floor slicing
 */
function RoomMesh({
  room,
  isSelected,
  isHovered,
  isSlicedOut,
  onSelect,
  onHover,
}: {
  room: Room3DData;
  isSelected: boolean;
  isHovered: boolean;
  isSlicedOut: boolean;
  onSelect: () => void;
  onHover: (hovered: boolean) => void;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const baseColor = STATUS_COLORS[room.status];

  // If floor is sliced out, lift higher and become transparent
  const currentY = isSlicedOut ? room.position[1] + 16 : room.position[1];
  const opacity = isSlicedOut ? 0.08 : 1.0;

  return (
    <group position={[room.position[0], currentY, room.position[2]]}>
      <mesh
        ref={meshRef}
        onClick={(e) => {
          e.stopPropagation();
          onSelect();
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          onHover(true);
        }}
        onPointerOut={() => {
          onHover(false);
        }}
      >
        <boxGeometry args={room.size} />
        <meshStandardMaterial
          color={baseColor}
          transparent={isSlicedOut || isSelected}
          opacity={opacity}
          roughness={0.35}
          metalness={0.1}
          emissive={isSelected ? "#3b82f6" : isHovered ? "#ffffff" : "#000000"}
          emissiveIntensity={isSelected ? 0.6 : isHovered ? 0.3 : 0}
        />
      </mesh>

      {/* Wireframe Outline accent for colorblind accessibility & structure definition */}
      <lineSegments>
        <edgesGeometry args={[new THREE.BoxGeometry(...room.size)]} />
        <lineBasicMaterial
          color={isSelected ? "#60a5fa" : isHovered ? "#ffffff" : "#1e293b"}
          linewidth={isSelected ? 2 : 1}
          transparent
          opacity={isSlicedOut ? 0.05 : 0.6}
        />
      </lineSegments>

      {/* Floating Room Label when selected or hovered */}
      {(isHovered || isSelected) && !isSlicedOut && (
        <Html position={[0, room.size[1] / 2 + 0.6, 0]} center distanceFactor={14}>
          <div className="pointer-events-none whitespace-nowrap rounded-md bg-black/90 px-2 py-1 text-[11px] font-mono font-bold text-white shadow-xl backdrop-blur-xs border border-white/20">
            <span className="text-primary mr-1">R{room.roomNumber}</span>
            <span>
              ({room.occupiedCount}/{room.capacity} Beds)
            </span>
          </div>
        </Html>
      )}
    </group>
  );
}

/**
 * Structural Floor Slab beneath each floor level
 */
function FloorSlab({
  floorNumber,
  elevationY,
  bounds,
  isSlicedOut,
}: {
  floorNumber: number;
  elevationY: number;
  bounds: Building3DModel["bounds"];
  isSlicedOut: boolean;
}) {
  const currentY = isSlicedOut ? elevationY + 16 : elevationY - 0.1;
  const opacity = isSlicedOut ? 0.05 : 0.95;

  return (
    <group position={[0, currentY, 0]}>
      <mesh>
        <boxGeometry args={[bounds.width + 4, 0.25, bounds.depth + 4]} />
        <meshStandardMaterial
          color="#334155"
          roughness={0.8}
          transparent={isSlicedOut}
          opacity={opacity}
        />
      </mesh>
      {/* Floor elevation label */}
      {!isSlicedOut && (
        <Html position={[-(bounds.width / 2 + 3), 0.3, 0]} center distanceFactor={20}>
          <div className="pointer-events-none rounded-md bg-slate-900/90 px-2 py-0.5 text-[10px] font-mono font-bold text-slate-200 border border-slate-700 shadow-md">
            {floorNumber === 0 ? "GROUND FLOOR" : `FLOOR ${floorNumber}`}
          </div>
        </Html>
      )}
    </group>
  );
}

export function BuildingExplorerCanvas({
  model,
  selectedFloor,
  selectedRoom,
  onSelectRoom,
  hoveredRoom,
  onHoverRoom,
}: CanvasProps) {
  return (
    <div className="relative w-full h-full min-h-[550px] bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 rounded-2xl overflow-hidden border border-border/80 shadow-2xl">
      <Canvas
        camera={{
          position: [model.bounds.width * 1.1, model.bounds.height * 1.4, model.bounds.depth * 1.6],
          fov: 42,
          near: 0.1,
          far: 500,
        }}
        gl={{ antialias: true, powerPreference: "high-performance" }}
      >
        <ambientLight intensity={0.7} />
        <directionalLight position={[25, 40, 20]} intensity={1.3} castShadow />
        <directionalLight position={[-20, 25, -20]} intensity={0.5} />
        <pointLight position={[0, model.bounds.height + 5, 0]} intensity={0.8} />

        <Center>
          <group>
            {/* Ground / Foundation base */}
            <mesh position={[0, -0.6, 0]}>
              <boxGeometry args={[model.bounds.width + 12, 0.8, model.bounds.depth + 12]} />
              <meshStandardMaterial color="#0f172a" roughness={0.9} />
            </mesh>

            {/* Floor Slabs and Rooms */}
            {model.floors.map((floor) => {
              const isFloorSlicedOut = selectedFloor !== null && floor.floorNumber > selectedFloor;

              return (
                <group key={floor.floorNumber}>
                  <FloorSlab
                    floorNumber={floor.floorNumber}
                    elevationY={floor.elevationY}
                    bounds={model.bounds}
                    isSlicedOut={isFloorSlicedOut}
                  />

                  {floor.wings.map((wing) =>
                    wing.rooms.map((room) => (
                      <RoomMesh
                        key={room.id}
                        room={room}
                        isSelected={selectedRoom?.id === room.id}
                        isHovered={hoveredRoom?.id === room.id}
                        isSlicedOut={isFloorSlicedOut}
                        onSelect={() => onSelectRoom(room)}
                        onHover={(hover) => onHoverRoom(hover ? room : null)}
                      />
                    )),
                  )}
                </group>
              );
            })}
          </group>
        </Center>

        <SmoothCameraController selectedRoom={selectedRoom} model={model} />
      </Canvas>

      {/* Floating 3D Legend & Interaction Hint */}
      <div className="absolute top-4 left-4 pointer-events-none flex flex-col gap-1.5 p-3 rounded-xl bg-black/60 backdrop-blur-md border border-white/10 text-white text-xs">
        <span className="font-bold font-mono text-[11px] text-primary tracking-wider uppercase">
          3D Explorer Controls
        </span>
        <span className="text-[10px] text-slate-300">• Left click + drag: Rotate camera</span>
        <span className="text-[10px] text-slate-300">• Right click + drag: Pan</span>
        <span className="text-[10px] text-slate-300">• Scroll: Zoom in/out</span>
        <span className="text-[10px] text-slate-300">• Click any room box: Fly to & inspect</span>
      </div>

      <div className="absolute bottom-4 left-4 pointer-events-none hidden md:flex items-center gap-3 p-2 rounded-lg bg-black/60 backdrop-blur-md border border-white/10 text-[11px] text-white">
        {Object.entries(STATUS_LABELS).map(([status, label]) => (
          <div key={status} className="flex items-center gap-1.5">
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: STATUS_COLORS[status as keyof typeof STATUS_COLORS] }}
            />
            <span className="text-slate-300 text-[10px]">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
