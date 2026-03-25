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

const LAUNCHER_W = 60;
const LAUNCHER_H = 24;
const BALL_R = 14;
const TARGET_R = 30;
const LIVES_MAX = 3;
const BALL_SPEED = 520;
const TARGET_BASE_SPEED = 140;
const TARGET_ACCEL = 12;

type Ball = { id: number; x: number; y: number };
type Phase = "idle" | "playing" | "dead";

const WIN = Dimensions.get("window");
const ARENA_W = WIN.width;

function makeStyles(
  C: ReturnType<typeof useColors>,
  insets: ReturnType<typeof import("react-native-safe-area-context").useSafeAreaInsets>
) {
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
      width: 36, height: 36, borderRadius: 18,
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
    target: {
      position: "absolute",
      width: TARGET_R * 2, height: TARGET_R * 2,
      borderRadius: TARGET_R,
      backgroundColor: "#ff3333",
      borderWidth: 3, borderColor: "#ff7777",
      alignItems: "center", justifyContent: "center",
    },
    targetInner: {
      width: TARGET_R * 0.8, height: TARGET_R * 0.8,
      borderRadius: TARGET_R * 0.4,
      backgroundColor: "#fff",
      opacity: 0.7,
    },
    ball: {
      position: "absolute",
      width: BALL_R * 2, height: BALL_R * 2,
      borderRadius: BALL_R,
      backgroundColor: "#FFD700",
      borderWidth: 2, borderColor: "#cc9900",
    },
    launcher: {
      position: "absolute",
      width: LAUNCHER_W, height: LAUNCHER_H,
      borderRadius: 8,
      backgroundColor: "#0B5E2F",
      borderWidth: 2, borderColor: "#1A8C4E",
      alignItems: "center", justifyContent: "center",
    },
    launcherLine: {
      position: "absolute",
      width: 2, backgroundColor: "rgba(255,215,0,0.25)",
    },
    throwBtn: {
      position: "absolute",
      bottom: 0, left: 0, right: 0,
      paddingVertical: 16,
      alignItems: "center",
      backgroundColor: "#0B5E2F",
    },
    throwBtnText: { color: "#FFD700", fontWeight: "800", fontSize: 17, letterSpacing: 2 },
    overlay: {
      position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
      alignItems: "center", justifyContent: "center",
      backgroundColor: "rgba(0,0,0,0.75)",
    },
    overlayTitle: { color: "#FFD700", fontSize: 30, fontWeight: "800", marginBottom: 8 },
    overlayBody: { color: "#ccc", fontSize: 15, textAlign: "center", marginBottom: 6 },
    xpLabel: { color: "#FFD700", fontSize: 20, fontWeight: "700", marginVertical: 8 },
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

  const HEADER_H = insets.top + 60;
  const THROW_BTN_H = 56;
  const ARENA_H = WIN.height - HEADER_H;
  const LAUNCHER_Y = ARENA_H - THROW_BTN_H - LAUNCHER_H - 16;
  const TARGET_Y = 60;

  const [phase, setPhase] = useState<Phase>("idle");
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(LIVES_MAX);
  const [awardedXp, setAwardedXp] = useState(0);
  const [balls, setBalls] = useState<Ball[]>([]);
  const [targetX, setTargetX] = useState(ARENA_W / 2);
  const [launcherX, setLauncherX] = useState(ARENA_W / 2 - LAUNCHER_W / 2);

  const phaseRef = useRef<Phase>("idle");
  const livesRef = useRef(LIVES_MAX);
  const scoreRef = useRef(0);
  const ballsRef = useRef<Ball[]>([]);
  const targetXRef = useRef(ARENA_W / 2);
  const targetVelRef = useRef(TARGET_BASE_SPEED);
  const launcherXRef = useRef(ARENA_W / 2 - LAUNCHER_W / 2);
  const nextBallId = useRef(0);
  const lastFrameRef = useRef(0);
  const rafRef = useRef<number>(0);

  const clampLauncher = (x: number) => Math.max(0, Math.min(ARENA_W - LAUNCHER_W, x));

  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => phaseRef.current === "playing",
    onMoveShouldSetPanResponder: () => phaseRef.current === "playing",
    onPanResponderMove: (_, gs) => {
      const nx = clampLauncher(gs.moveX - LAUNCHER_W / 2);
      launcherXRef.current = nx;
      setLauncherX(nx);
    },
  }), []);

  const throwBall = useCallback(() => {
    if (phaseRef.current !== "playing") return;
    const ballX = launcherXRef.current + LAUNCHER_W / 2;
    const ballY = LAUNCHER_Y - BALL_R;
    ballsRef.current = [
      ...ballsRef.current,
      { id: nextBallId.current++, x: ballX, y: ballY },
    ];
    setBalls([...ballsRef.current]);
  }, [LAUNCHER_Y]);

  const tick = useCallback((now: number) => {
    if (phaseRef.current !== "playing") return;
    const dt = Math.min(now - lastFrameRef.current, 50);
    lastFrameRef.current = now;

    let tx = targetXRef.current;
    let tv = targetVelRef.current;
    tx += tv * (dt / 1000);
    if (tx - TARGET_R < 0) { tx = TARGET_R; tv = Math.abs(tv); }
    if (tx + TARGET_R > ARENA_W) { tx = ARENA_W - TARGET_R; tv = -Math.abs(tv); }
    targetXRef.current = tx;
    targetVelRef.current = tv;
    setTargetX(tx);

    let missThisFrame = false;
    let hitThisFrame = false;

    const nextBalls: Ball[] = [];
    for (const b of ballsRef.current) {
      const ny = b.y - BALL_SPEED * (dt / 1000);

      if (ny + BALL_R < 0) {
        missThisFrame = true;
        continue;
      }

      if (ny - BALL_R <= TARGET_Y + TARGET_R && ny + BALL_R >= TARGET_Y - TARGET_R) {
        const dx = b.x - tx;
        const dy = ny - TARGET_Y;
        if (dx * dx + dy * dy < (BALL_R + TARGET_R) * (BALL_R + TARGET_R)) {
          hitThisFrame = true;
          continue;
        }
      }

      nextBalls.push({ ...b, y: ny });
    }

    ballsRef.current = nextBalls;
    setBalls([...nextBalls]);

    if (hitThisFrame) {
      const newScore = scoreRef.current + 1;
      scoreRef.current = newScore;
      setScore(newScore);
      const speedUp = TARGET_BASE_SPEED + newScore * TARGET_ACCEL;
      const dir = targetVelRef.current < 0 ? -1 : 1;
      targetVelRef.current = speedUp * dir;
    }

    if (missThisFrame) {
      const newLives = livesRef.current - 1;
      livesRef.current = newLives;
      setLives(newLives);
      if (newLives <= 0) {
        phaseRef.current = "dead";
        setPhase("dead");
        const earned = Math.min(scoreRef.current * 5, 50);
        setAwardedXp(earned);
        awardGameXp(earned).catch(() => {});
        return;
      }
    }

    rafRef.current = requestAnimationFrame(tick);
  }, [TARGET_Y]);

  const startGame = useCallback(() => {
    ballsRef.current = [];
    launcherXRef.current = ARENA_W / 2 - LAUNCHER_W / 2;
    targetXRef.current = ARENA_W / 2;
    targetVelRef.current = TARGET_BASE_SPEED;
    livesRef.current = LIVES_MAX;
    scoreRef.current = 0;
    setBalls([]);
    setLives(LIVES_MAX);
    setScore(0);
    setAwardedXp(0);
    setLauncherX(ARENA_W / 2 - LAUNCHER_W / 2);
    setTargetX(ARENA_W / 2);
    phaseRef.current = "playing";
    setPhase("playing");
    const now = performance.now();
    lastFrameRef.current = now;
    rafRef.current = requestAnimationFrame(tick);
  }, [tick]);

  useEffect(() => {
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={18} color="#fff" />
        </Pressable>
        <Text style={styles.title}>THROW!</Text>
        <View style={{ width: 36 }} />
      </View>

      <View style={styles.arena} {...panResponder.panHandlers}>
        {phase === "playing" && (
          <View
            style={[styles.target, {
              left: targetX - TARGET_R,
              top: TARGET_Y - TARGET_R,
            }]}
          >
            <View style={styles.targetInner} />
          </View>
        )}

        {balls.map(b => (
          <View
            key={b.id}
            style={[styles.ball, { left: b.x - BALL_R, top: b.y - BALL_R }]}
          />
        ))}

        {phase === "playing" && (
          <>
            <View style={[styles.launcherLine, {
              left: launcherX + LAUNCHER_W / 2 - 1,
              top: TARGET_Y + TARGET_R,
              height: LAUNCHER_Y - TARGET_Y - TARGET_R,
            }]} />
            <View style={[styles.launcher, { left: launcherX, top: LAUNCHER_Y }]} />
          </>
        )}

        <View style={styles.hud}>
          <Text style={styles.hudText}>Score: {score}</Text>
          <View style={styles.livesRow}>
            {Array.from({ length: LIVES_MAX }).map((_, i) => (
              <Text key={i} style={styles.heart}>{i < lives ? "❤️" : "🖤"}</Text>
            ))}
          </View>
        </View>

        {phase === "playing" && (
          <Pressable style={styles.throwBtn} onPress={throwBall}>
            <Text style={styles.throwBtnText}>THROW!</Text>
          </Pressable>
        )}

        {phase !== "playing" && (
          <View style={styles.overlay}>
            {phase === "idle" && (
              <>
                <Text style={styles.overlayTitle}>THROW!</Text>
                <Text style={styles.overlayBody}>
                  Slide left & right to aim.{"\n"}Tap THROW! to launch the ball.{"\n"}Hit the moving target!
                </Text>
                <Text style={styles.overlayBody}>Earn up to +50 XP per game</Text>
              </>
            )}
            {phase === "dead" && (
              <>
                <Text style={styles.overlayTitle}>GAME OVER</Text>
                <Text style={styles.overlayBody}>You hit the target {score} time{score !== 1 ? "s" : ""}</Text>
                {awardedXp > 0 ? (
                  <Text style={styles.xpLabel}>+{awardedXp} XP earned!</Text>
                ) : (
                  <Text style={styles.overlayBody}>Hit the target to earn XP</Text>
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
