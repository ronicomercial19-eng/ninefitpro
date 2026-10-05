import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Text } from "@react-three/drei";
import * as THREE from "three";
import { WeeklyRadar } from "./WeeklyRadar";

interface Props {
  current: { treino: number | null; nutri: number | null; sono: number | null; mob: number | null; hidr: number | null };
  previous?: { treino: number | null; nutri: number | null; sono: number | null; mob: number | null; hidr: number | null };
}

const AXES = ["TREINO", "NUTRI", "SONO", "MOB", "HIDR"] as const;

function getPoints(values: number[], radius = 2): THREE.Vector3[] {
  return values.map((v, i) => {
    const angle = (i / values.length) * Math.PI * 2 - Math.PI / 2;
    const r = (Math.max(0, Math.min(100, v)) / 100) * radius;
    return new THREE.Vector3(Math.cos(angle) * r, Math.sin(angle) * r, 0);
  });
}

function RadarLine({
  geometry,
  color,
  opacity = 1,
}: {
  geometry: THREE.BufferGeometry;
  color: string;
  opacity?: number;
}) {
  const line = useMemo(() => {
    const material = new THREE.LineBasicMaterial({
      color,
      opacity,
      transparent: opacity < 1,
    });
    return new THREE.Line(geometry, material);
  }, [color, geometry, opacity]);

  useEffect(() => {
    return () => {
      (line.material as THREE.Material).dispose();
    };
  }, [line]);

  return <primitive object={line} />;
}

function RadarMesh({
  values,
  color,
  opacity = 0.45,
  emissive = 0.6,
}: {
  values: number[];
  color: string;
  opacity?: number;
  emissive?: number;
}) {
  const meshRef = useRef<THREE.Mesh>(null);

  const geometry = useMemo(() => {
    const pts = getPoints(values);
    const shape = new THREE.Shape();
    pts.forEach((p, i) => (i === 0 ? shape.moveTo(p.x, p.y) : shape.lineTo(p.x, p.y)));
    shape.closePath();
    return new THREE.ShapeGeometry(shape);
  }, [values]);

  const edgesGeometry = useMemo(() => {
    const pts = getPoints(values);
    const geo = new THREE.BufferGeometry().setFromPoints([...pts, pts[0]]);
    return geo;
  }, [values]);

  return (
    <group>
      <mesh ref={meshRef} geometry={geometry}>
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={emissive}
          transparent
          opacity={opacity}
          side={THREE.DoubleSide}
        />
      </mesh>
      <RadarLine geometry={edgesGeometry} color={color} />
      {getPoints(values).map((p, i) => (
        <mesh key={i} position={p}>
          <sphereGeometry args={[0.08, 16, 16]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.2} />
        </mesh>
      ))}
    </group>
  );
}

function GridRings() {
  return (
    <group>
      {[0.5, 1, 1.5, 2].map((r) => {
        const pts = Array.from({ length: 6 }).map((_, i) => {
          const angle = (i / 5) * Math.PI * 2 - Math.PI / 2;
          return new THREE.Vector3(Math.cos(angle) * r, Math.sin(angle) * r, 0);
        });
        const geo = new THREE.BufferGeometry().setFromPoints(pts);
        return (
          <RadarLine key={r} geometry={geo} color="#ffffff" opacity={0.08} />
        );
      })}
      {AXES.map((_, i) => {
        const angle = (i / AXES.length) * Math.PI * 2 - Math.PI / 2;
        const geo = new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(0, 0, 0),
          new THREE.Vector3(Math.cos(angle) * 2, Math.sin(angle) * 2, 0),
        ]);
        return (
          <RadarLine key={i} geometry={geo} color="#ffffff" opacity={0.1} />
        );
      })}
    </group>
  );
}

function Labels({ values }: { values: number[] }) {
  return (
    <group>
      {AXES.map((label, i) => {
        const angle = (i / AXES.length) * Math.PI * 2 - Math.PI / 2;
        const r = 2.45;
        const x = Math.cos(angle) * r;
        const y = Math.sin(angle) * r;
        return (
          <Text
            key={label}
            position={[x, y, 0]}
            fontSize={0.18}
            color="#8A8A8E"
            anchorX="center"
            anchorY="middle"
            letterSpacing={0.15}
          >
            {label}
          </Text>
        );
      })}
    </group>
  );
}

function Scene({ values, prev }: { values: number[]; prev?: number[] }) {
  const groupRef = useRef<THREE.Group>(null);
  useFrame((_, delta) => {
    if (groupRef.current) groupRef.current.rotation.z += delta * 0.05;
  });

  return (
    <>
      <ambientLight intensity={0.6} />
      <pointLight position={[5, 5, 5]} intensity={1.2} color="#F05C1A" />
      <pointLight position={[-3, -3, 3]} intensity={0.6} color="#4DA3FF" />
      <group ref={groupRef}>
        <GridRings />
        {prev && <RadarMesh values={prev} color="#444444" opacity={0.15} emissive={0.1} />}
        <RadarMesh values={values} color="#F05C1A" opacity={0.5} />
        <Labels values={values} />
      </group>
    </>
  );
}

export function WeeklyRadar3D({ current, previous }: Props) {
  const [error, setError] = useState(false);
  const rawValues = [current.treino, current.nutri, current.sono, current.mob, current.hidr];
  const values = rawValues.map((value) => value ?? 0);
  const completeCurrent = rawValues.every((value): value is number => value !== null);
  const rawPrevious = previous ? [previous.treino, previous.nutri, previous.sono, previous.mob, previous.hidr] : undefined;
  const prevValues = previous
    ? [previous.treino, previous.nutri, previous.sono, previous.mob, previous.hidr].map((value) => value ?? 0)
    : undefined;

  if (error) {
    return <WeeklyRadar current={current} previous={previous} />;
  }

  return (
    <div className="surface-card p-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-label">RADAR 5D · SEMANA</p>
        <p className="text-[9px] tracking-[0.2em] uppercase text-muted-foreground">3D · INTERATIVO</p>
      </div>
      <div className="w-full h-64 rounded-xl bg-black/40 overflow-hidden">
        <Suspense fallback={<div className="w-full h-full animate-pulse bg-white/5" />}>
          <Canvas
            camera={{ position: [0, 0, 6], fov: 45 }}
            onCreated={({ gl }) => {
              try {
                gl.setClearColor("#000000", 0);
              } catch {
                setError(true);
              }
            }}
          >
          {completeCurrent && <Scene values={values} prev={prevValues && rawPrevious?.every((value): value is number => value !== null) ? prevValues : undefined} />}
          {!completeCurrent && <FallbackAxes />}
            <OrbitControls
              enableZoom={false}
              enablePan={false}
              autoRotate
              autoRotateSpeed={0.4}
              maxPolarAngle={Math.PI / 1.5}
              minPolarAngle={Math.PI / 3}
            />
          </Canvas>
        </Suspense>
      </div>
      {!completeCurrent && <p className="mt-2 text-center text-[11px] text-muted-foreground">O radar 3D aparece quando todos os eixos tiverem registros; eixos sem dados não são tratados como zero.</p>}
      <div className="grid grid-cols-5 gap-1 mt-3">
        {AXES.map((label, i) => (
          <div key={label} className="text-center">
            <p className="text-[8px] tracking-[0.2em] uppercase text-muted-foreground">{label}</p>
            <p className="text-xs font-display text-foreground">{rawValues[i] === null ? "—" : Math.round(rawValues[i]!)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function FallbackAxes() {
  return <div className="h-64 grid grid-cols-2 place-content-center gap-2 rounded-xl bg-black/40 text-center text-xs text-muted-foreground">Registre seus dados para formar o radar 3D.</div>;
}
