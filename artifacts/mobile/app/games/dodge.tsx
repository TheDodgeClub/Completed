import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  PanResponder,
  Pressable,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/context/ThemeContext";
import { awardGameXp } from "@/lib/api";

const PLAYER_W = 52;
const PLAYER_H = 28;
const BALL_R = 18;
const LIVES_MAX = 3;
const BALL_SPEED_BASE = 220;
const BALL_SPEED_SCALE = 60;
const SPAWN_INTERVAL_BASE = 1400;
const SPAWN_INTERVAL_MIN = 600;

type Ball = { id: number; x: number; y: number; vx: number; vy: number };
type Phase = "idle" | "playing" | "dead";

function makeStyles(C: ReturnType<typeof useColors>, insets: ReturnType<typeof import("react-native-safe-area-context").useSafeAreaInsets>) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: "#0D0D0D" },
    header: {
      flexDirection: "row",
      alignItems: "center",
      paddingTop: insets.top + 8,
      paddingHorizontal: 16,
      paddingBottom: 12,
    },
    backBtn: {
      width: 36, height: 36,
      borderRadius: 18,
      backgroundColor: "#1a1a1a",
      alignItems: "center", justifyContent: "center",
    },
    title: { flex: 1, textAlign: "center", color: "#FFD700", fontWeight: "700", fontSize: 18 },
    arena: { flex: 1, overflow: "hidden" },
    hud: {
      position: "absolute", top: 12, left: 0, right: 0,
      flexDirection: "row", justifyContent: "space-between",
      paddingHorizontal: 20,
    },
    hudText: { color: "#fff", fontSize: 15, fontWeight: "600" },
    livesRow: { flexDirection: "row", gap: 6 },
    heart: { fontSize: 18 },
    player: {
      position: "absolute",
      width: PLAYER_W, height: PLAYER_H,
      borderRadius: 6,
      backgroundColor: C.primary ?? "#0B5E2F",
      alignItems: "center", justifyContent: "center",
    },
    playerText: { color: "#fff", fontSize: 10, fontWeight: "700" },
    ball: {
      position: "absolute",
      width: BALL_R * 2, height: BALL_R * 2,
      borderRadius: BALL_R,
      backgroundColor: "#FFD700",
      borderWidth: 2, borderColor: "#cc9900",
    },
    overlay: {
      position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
      alignItems: "center", justifyContent: "center",
      backgroundColor: "rgba(0,0,0,0.7)",
    },
    overlayTitle: { color: "#FFD700", fontSize: 30, fontWeight: "800", marginBottom: 8 },
    overlayBody: { color: "#ccc", fontSize: 15, textAlign: "center", marginBottom: 6 },
    xpLabel: { color: "#FFD700", fontSize: 18, fontWeight: "700", marginVertical: 6 },
    startBtn: {
      marginTop: 20, paddingVertical: 14, paddingHorizontal: 48,
      backgroundColor: "#0B5E2F", borderRadius: 10,
    },
    startBtnText: { color: "#FFD700", fontWeight: "800", fontSize: 16 },
  });
}

export default function DodgeGame() {
  const insets = useSafeAreaInsets();
  const Colors = useColors();
  const styles = useMemo(() => makeStyles(Colors, insets), [Colors, insets]);

  const [phase, setPhase] = useState<Phase>("idle");
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(LIVES_MAX);
  const [awardedXp, setAwardedXp] = useState(0);
  const [balls, setBalls] = useState<Ball[]>([]);

  const WIN = Dimensions.get("window");
  const ARENA_W = WIN.width;
  const HEADER_H = insets.top + 60;
  const ARENA_H = WIN.height - HEADER_H;
  const PLAYER_Y = ARENA_H - PLAYER_H - 20;

  const playerXRef = useRef(ARENA_W / 2 - PLAYER_W / 2);
  const [playerX, setPlayerX] = useState(playerXRef.current);
  const phaseRef = useRef<Phase>("idle");
  const livesRef = useRef(LIVES_MAX);
  const scoreRef = useRef(0);
  const ballsRef = useRef<Ball[]>([]);
  const nextBallId = useRef(0);
  const lastFrameRef = useRef(0);
  const lastSpawnRef = useRef(0);
  const spawnIntervalRef = useRef(SPAWN_INTERVAL_BASE);
  const rafRef = useRef<number>(0);

  const clampPlayerX = (x: number) => Math.max(0, Math.min(ARENA_W - PLAYER_W, x));

  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => phaseRef.current === "playing",
    onMoveShouldSetPanResponder: () => phaseRef.current === "playing",
    onPanResponderMove: (_, gs) => {
      const nx = clampPlayerX(gs.moveX - PLAYER_W / 2);
      playerXRef.current = nx;
      setPlayerX(nx);
    },
  }), [ARENA_W]);

  const spawnBall = useCallback((now: number) => {
    const x = BALL_R + Math.random() * (ARENA_W - BALL_R * 2);
    const speedMult = 1 + (scoreRef.current / 30) * BALL_SPEED_SCALE / BALL_SPEED_BASE;
    const vy = (BALL_SPEED_BASE + scoreRef.current * 2) * speedMult / 1000;
    const vx = (Math.random() - 0.5) * 0.15;
    ballsRef.current = [
      ...ballsRef.current,
      { id: nextBallId.current++, x, y: -BALL_R * 2, vx, vy },
    ];
    const interval = Math.max(SPAWN_INTERVAL_MIN, SPAWN_INTERVAL_BASE - scoreRef.current * 8);
    spawnIntervalRef.current = interval;
    lastSpawnRef.current = now;
  }, [ARENA_W]);

  const gameStartRef = useRef(0);

  const tick = useCallback((now: number) => {
    if (phaseRef.current !== "playing") return;
    const dt = Math.min(now - lastFrameRef.current, 50);
    lastFrameRef.current = now;

    const elapsed = (now - gameStartRef.current) / 1000;
    scoreRef.current = elapsed;
    setScore(elapsed);

    if (now - lastSpawnRef.current > spawnIntervalRef.current) {
      spawnBall(now);
    }

    const px = playerXRef.current;
    let hitThisFrame = false;

    const nextBalls: Ball[] = [];
    for (const b of ballsRef.current) {
      const nx = b.x + b.vx * dt;
      const ny = b.y + b.vy * dt;

      if (ny > ARENA_H + BALL_R * 2) continue;

      const closestX = Math.max(px, Math.min(nx, px + PLAYER_W));
      const closestY = Math.max(PLAYER_Y, Math.min(ny, PLAYER_Y + PLAYER_H));
      const distX = nx - closestX;
      const distY = ny - closestY;
      const hit = distX * distX + distY * distY < BALL_R * BALL_R;

      if (hit) {
        hitThisFrame = true;
      } else {
        nextBalls.push({ ...b, x: nx, y: ny });
      }
    }

    ballsRef.current = nextBalls;
    setBalls([...nextBalls]);

    if (hitThisFrame) {
      const newLives = livesRef.current - 1;
      livesRef.current = newLives;
      setLives(newLives);
      if (newLives <= 0) {
        phaseRef.current = "dead";
        setPhase("dead");
        const earned = Math.min(Math.floor(scoreRef.current * 2), 50);
        setAwardedXp(earned);
        awardGameXp(earned).catch(() => {});
        return;
      }
    }

    rafRef.current = requestAnimationFrame(tick);
  }, [ARENA_H, PLAYER_Y, spawnBall]);

  const startGame = useCallback(() => {
    ballsRef.current = [];
    playerXRef.current = ARENA_W / 2 - PLAYER_W / 2;
    setPlayerX(playerXRef.current);
    livesRef.current = LIVES_MAX;
    scoreRef.current = 0;
    setBalls([]);
    setLives(LIVES_MAX);
    setScore(0);
    setAwardedXp(0);
    phaseRef.current = "playing";
    setPhase("playing");
    const now = performance.now();
    lastFrameRef.current = now;
    lastSpawnRef.current = now;
    gameStartRef.current = now;
    spawnIntervalRef.current = SPAWN_INTERVAL_BASE;
    rafRef.current = requestAnimationFrame(tick);
  }, [ARENA_W, tick]);

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const displayScore = Math.floor(typeof score === "number" ? score : 0);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={18} color="#fff" />
        </Pressable>
        <Text style={styles.title}>DODGE!</Text>
        <View style={{ width: 36 }} />
      </View>

      <View style={styles.arena} {...panResponder.panHandlers}>
        {balls.map(b => (
          <View
            key={b.id}
            style={[styles.ball, { left: b.x - BALL_R, top: b.y - BALL_R }]}
          />
        ))}

        {phase === "playing" && (
          <View style={[styles.player, { left: playerX, top: PLAYER_Y }]}>
            <Text style={styles.playerText}>YOU</Text>
          </View>
        )}

        <View style={styles.hud}>
          <Text style={styles.hudText}>{displayScore}s</Text>
          <View style={styles.livesRow}>
            {Array.from({ length: LIVES_MAX }).map((_, i) => (
              <Text key={i} style={styles.heart}>{i < lives ? "❤️" : "🖤"}</Text>
            ))}
          </View>
        </View>

        {phase !== "playing" && (
          <View style={styles.overlay}>
            {phase === "idle" && (
              <>
                <Text style={styles.overlayTitle}>DODGE!</Text>
                <Text style={styles.overlayBody}>
                  Slide left & right to dodge the balls.{"\n"}Survive as long as you can!
                </Text>
                <Text style={styles.overlayBody}>Earn up to +50 XP per game</Text>
              </>
            )}
            {phase === "dead" && (
              <>
                <Text style={styles.overlayTitle}>GAME OVER</Text>
                <Text style={styles.overlayBody}>You survived {displayScore} seconds</Text>
                {awardedXp > 0 && (
                  <Text style={styles.xpLabel}>+{awardedXp} XP earned!</Text>
                )}
                {awardedXp === 0 && (
                  <Text style={styles.overlayBody}>Survive longer to earn XP</Text>
                )}
              </>
            )}
            <Pressable style={styles.startBtn} onPress={startGame}>
              <Text style={styles.startBtnText}>
                {phase === "idle" ? "PLAY" : "PLAY AGAIN"}
              </Text>
            </Pressable>
          </View>
        )}
      </View>
    </View>
  );
}
