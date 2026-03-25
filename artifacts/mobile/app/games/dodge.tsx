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
import { useColors } from "@/context/ThemeContext";
import { awardGameXp } from "@/lib/api";

const WIN = Dimensions.get("window");
const SCREEN_W = WIN.width;
const SCREEN_H = WIN.height;

const CHAR_W = 70;
const CHAR_H = 26;
const BALL_R = 13;
const LIVES_MAX = 3;
const BALL_SPEED = 480;
const THROW_COOLDOWN = 700;

type Ball = { id: number; x: number; y: number; vy: number; owner: 1 | 2 };
type Phase = "idle" | "playing" | "ended";

function clamp(val: number, min: number, max: number) {
  return Math.max(min, Math.min(max, val));
}

function makeStyles(
  C: ReturnType<typeof useColors>,
  insets: ReturnType<typeof import("react-native-safe-area-context").useSafeAreaInsets>
) {
  const HALF = SCREEN_H / 2;
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: "#0D0D0D" },
    arena: { width: SCREEN_W, height: SCREEN_H, overflow: "hidden" },
    divider: {
      position: "absolute",
      left: 0, right: 0,
      top: HALF - 1,
      height: 2,
      backgroundColor: "#FFD700",
      opacity: 0.5,
    },
    exitBtn: {
      position: "absolute",
      top: insets.top + 8,
      right: 12,
      width: 32, height: 32,
      borderRadius: 16,
      backgroundColor: "rgba(0,0,0,0.6)",
      alignItems: "center", justifyContent: "center",
      zIndex: 20,
    },
    exitBtnP2: {
      top: "auto",
      bottom: insets.bottom + 8,
      right: 12,
    },
    exitText: { color: "#fff", fontWeight: "700", fontSize: 14 },
    zone: {
      position: "absolute",
      left: 0,
      width: SCREEN_W,
      height: HALF,
    },
    zoneP1: { top: HALF, backgroundColor: "#0a0a18" },
    zoneP2: { top: 0, backgroundColor: "#180a0a", transform: [{ rotate: "180deg" }] },
    throwBtn: {
      position: "absolute",
      bottom: 0, left: 0, right: 0,
      height: 56,
      backgroundColor: C.primary ?? "#0B5E2F",
      alignItems: "center", justifyContent: "center",
    },
    throwBtnText: { color: "#FFD700", fontWeight: "800", fontSize: 16, letterSpacing: 2 },
    throwBtnDisabled: { backgroundColor: "#1a2a1a" },
    char1: {
      position: "absolute",
      width: CHAR_W, height: CHAR_H,
      borderRadius: 8,
      backgroundColor: "#1A8C4E",
      borderWidth: 2, borderColor: "#FFD700",
      alignItems: "center", justifyContent: "center",
    },
    char2: {
      position: "absolute",
      width: CHAR_W, height: CHAR_H,
      borderRadius: 8,
      backgroundColor: "#8C1A1A",
      borderWidth: 2, borderColor: "#FFD700",
      alignItems: "center", justifyContent: "center",
    },
    charText: { color: "#fff", fontWeight: "700", fontSize: 10 },
    ball1: {
      position: "absolute",
      width: BALL_R * 2, height: BALL_R * 2,
      borderRadius: BALL_R,
      backgroundColor: "#1A8C4E",
      borderWidth: 2, borderColor: "#4ade80",
    },
    ball2: {
      position: "absolute",
      width: BALL_R * 2, height: BALL_R * 2,
      borderRadius: BALL_R,
      backgroundColor: "#8C1A1A",
      borderWidth: 2, borderColor: "#f87171",
    },
    hud1: {
      position: "absolute",
      top: 12, left: 0, right: 0,
      flexDirection: "row",
      justifyContent: "space-between",
      paddingHorizontal: 16,
    },
    hud2: {
      position: "absolute",
      top: 12, left: 0, right: 0,
      flexDirection: "row",
      justifyContent: "space-between",
      paddingHorizontal: 16,
    },
    hudLabel: { color: "#fff", fontWeight: "700", fontSize: 13 },
    hearts: { flexDirection: "row", gap: 4 },
    heart: { fontSize: 15 },
    overlay: {
      position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: "rgba(0,0,0,0.82)",
      alignItems: "center", justifyContent: "center",
      zIndex: 30,
    },
    overlayTitle: { color: "#FFD700", fontSize: 30, fontWeight: "800", marginBottom: 8 },
    overlaySub: { color: "#ccc", fontSize: 15, textAlign: "center", marginBottom: 6 },
    xpText: { color: "#FFD700", fontSize: 18, fontWeight: "700", marginVertical: 8 },
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

  const HALF = SCREEN_H / 2;
  const THROW_BTN_H = 56;

  const P1_Y = SCREEN_H - THROW_BTN_H - CHAR_H / 2 - 10;
  const P2_Y_SCREEN = THROW_BTN_H + CHAR_H / 2 + 10;

  const [phase, setPhase] = useState<Phase>("idle");
  const [winner, setWinner] = useState<1 | 2 | null>(null);
  const [awardedXp, setAwardedXp] = useState(0);
  const [p1X, setP1X] = useState(SCREEN_W / 2 - CHAR_W / 2);
  const [p2X, setP2X] = useState(SCREEN_W / 2 - CHAR_W / 2);
  const [p1Lives, setP1Lives] = useState(LIVES_MAX);
  const [p2Lives, setP2Lives] = useState(LIVES_MAX);
  const [balls, setBalls] = useState<Ball[]>([]);
  const [p1CanThrow, setP1CanThrow] = useState(true);
  const [p2CanThrow, setP2CanThrow] = useState(true);

  const phaseRef = useRef<Phase>("idle");
  const p1XRef = useRef(SCREEN_W / 2 - CHAR_W / 2);
  const p2XRef = useRef(SCREEN_W / 2 - CHAR_W / 2);
  const p1LivesRef = useRef(LIVES_MAX);
  const p2LivesRef = useRef(LIVES_MAX);
  const ballsRef = useRef<Ball[]>([]);
  const nextBallId = useRef(0);
  const lastFrameRef = useRef(0);
  const rafRef = useRef<number>(0);
  const p1ThrowCooldownRef = useRef(false);
  const p2ThrowCooldownRef = useRef(false);

  const endGame = useCallback((w: 1 | 2) => {
    phaseRef.current = "ended";
    setPhase("ended");
    setWinner(w);
    const earned = Math.min(30, 50);
    setAwardedXp(earned);
    awardGameXp(earned).catch(() => {});
  }, []);

  const panP1 = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => phaseRef.current === "playing",
    onMoveShouldSetPanResponder: () => phaseRef.current === "playing",
    onPanResponderMove: (_, gs) => {
      const nx = clamp(gs.moveX - CHAR_W / 2, 0, SCREEN_W - CHAR_W);
      p1XRef.current = nx;
      setP1X(nx);
    },
  }), []);

  const panP2 = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => phaseRef.current === "playing",
    onMoveShouldSetPanResponder: () => phaseRef.current === "playing",
    onPanResponderMove: (_, gs) => {
      const mirroredX = SCREEN_W - gs.moveX;
      const nx = clamp(mirroredX - CHAR_W / 2, 0, SCREEN_W - CHAR_W);
      p2XRef.current = nx;
      setP2X(nx);
    },
  }), []);

  const throwBallP1 = useCallback(() => {
    if (phaseRef.current !== "playing" || p1ThrowCooldownRef.current) return;
    p1ThrowCooldownRef.current = true;
    setP1CanThrow(false);
    const bx = p1XRef.current + CHAR_W / 2;
    ballsRef.current = [...ballsRef.current, { id: nextBallId.current++, x: bx, y: P1_Y - CHAR_H, vy: -BALL_SPEED, owner: 1 }];
    setBalls([...ballsRef.current]);
    setTimeout(() => { p1ThrowCooldownRef.current = false; setP1CanThrow(true); }, THROW_COOLDOWN);
  }, [P1_Y]);

  const throwBallP2 = useCallback(() => {
    if (phaseRef.current !== "playing" || p2ThrowCooldownRef.current) return;
    p2ThrowCooldownRef.current = true;
    setP2CanThrow(false);
    const bx = p2XRef.current + CHAR_W / 2;
    ballsRef.current = [...ballsRef.current, { id: nextBallId.current++, x: bx, y: P2_Y_SCREEN + CHAR_H, vy: BALL_SPEED, owner: 2 }];
    setBalls([...ballsRef.current]);
    setTimeout(() => { p2ThrowCooldownRef.current = false; setP2CanThrow(true); }, THROW_COOLDOWN);
  }, [P2_Y_SCREEN]);

  const tick = useCallback((now: number) => {
    if (phaseRef.current !== "playing") return;
    const dt = Math.min(now - lastFrameRef.current, 50);
    lastFrameRef.current = now;

    const px1 = p1XRef.current;
    const px2 = p2XRef.current;
    let p1Hit = false;
    let p2Hit = false;

    const next: Ball[] = [];
    for (const b of ballsRef.current) {
      const ny = b.y + b.vy * (dt / 1000);

      if (b.owner === 1) {
        if (ny < -BALL_R * 2) continue;
        const nearP2 = ny - BALL_R <= P2_Y_SCREEN + CHAR_H / 2 && ny + BALL_R >= P2_Y_SCREEN - CHAR_H / 2;
        if (nearP2) {
          const hitX = b.x >= px2 && b.x <= px2 + CHAR_W;
          if (hitX) { p2Hit = true; continue; }
        }
      } else {
        if (ny > SCREEN_H + BALL_R * 2) continue;
        const nearP1 = ny + BALL_R >= P1_Y - CHAR_H / 2 && ny - BALL_R <= P1_Y + CHAR_H / 2;
        if (nearP1) {
          const hitX = b.x >= px1 && b.x <= px1 + CHAR_W;
          if (hitX) { p1Hit = true; continue; }
        }
      }

      next.push({ ...b, y: ny });
    }

    ballsRef.current = next;
    setBalls([...next]);

    if (p2Hit) {
      const nl = p2LivesRef.current - 1;
      p2LivesRef.current = nl;
      setP2Lives(nl);
      if (nl <= 0) { endGame(1); return; }
    }
    if (p1Hit) {
      const nl = p1LivesRef.current - 1;
      p1LivesRef.current = nl;
      setP1Lives(nl);
      if (nl <= 0) { endGame(2); return; }
    }

    rafRef.current = requestAnimationFrame(tick);
  }, [P1_Y, P2_Y_SCREEN, endGame]);

  const startGame = useCallback(() => {
    ballsRef.current = [];
    p1XRef.current = SCREEN_W / 2 - CHAR_W / 2;
    p2XRef.current = SCREEN_W / 2 - CHAR_W / 2;
    p1LivesRef.current = LIVES_MAX;
    p2LivesRef.current = LIVES_MAX;
    p1ThrowCooldownRef.current = false;
    p2ThrowCooldownRef.current = false;
    setBalls([]);
    setP1X(SCREEN_W / 2 - CHAR_W / 2);
    setP2X(SCREEN_W / 2 - CHAR_W / 2);
    setP1Lives(LIVES_MAX);
    setP2Lives(LIVES_MAX);
    setP1CanThrow(true);
    setP2CanThrow(true);
    setAwardedXp(0);
    setWinner(null);
    phaseRef.current = "playing";
    setPhase("playing");
    const now = performance.now();
    lastFrameRef.current = now;
    rafRef.current = requestAnimationFrame(tick);
  }, [tick]);

  useEffect(() => () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); }, []);

  const p1Balls = balls.filter(b => b.owner === 1);
  const p2Balls = balls.filter(b => b.owner === 2);

  return (
    <View style={styles.root}>
      <View style={styles.arena}>

        {/* P2 zone — top half, rotated so P2 holds phone upside down */}
        <View style={[styles.zone, styles.zoneP2]} {...panP2.panHandlers}>
          <View style={styles.hud2}>
            <Text style={styles.hudLabel}>P2</Text>
            <View style={styles.hearts}>
              {Array.from({ length: LIVES_MAX }).map((_, i) => (
                <Text key={i} style={styles.heart}>{i < p2Lives ? "❤️" : "🖤"}</Text>
              ))}
            </View>
          </View>
          {phase === "playing" && (
            <View style={[styles.char2, {
              left: SCREEN_W - p2X - CHAR_W,
              top: HALF - CHAR_H - 12,
            }]}>
              <Text style={styles.charText}>P2</Text>
            </View>
          )}
          {phase === "playing" && (
            <Pressable
              style={[styles.throwBtn, !p2CanThrow && styles.throwBtnDisabled]}
              onPress={throwBallP2}
            >
              <Text style={styles.throwBtnText}>
                {p2CanThrow ? "THROW!" : "·  ·  ·"}
              </Text>
            </Pressable>
          )}
        </View>

        {/* P1 zone — bottom half */}
        <View style={[styles.zone, styles.zoneP1]} {...panP1.panHandlers}>
          <View style={styles.hud1}>
            <Text style={styles.hudLabel}>P1</Text>
            <View style={styles.hearts}>
              {Array.from({ length: LIVES_MAX }).map((_, i) => (
                <Text key={i} style={styles.heart}>{i < p1Lives ? "❤️" : "🖤"}</Text>
              ))}
            </View>
          </View>
          {phase === "playing" && (
            <View style={[styles.char1, {
              position: "absolute",
              left: p1X,
              bottom: THROW_BTN_H + 10,
            }]}>
              <Text style={styles.charText}>P1</Text>
            </View>
          )}
          {phase === "playing" && (
            <Pressable
              style={[styles.throwBtn, { position: "absolute", bottom: 0 }, !p1CanThrow && styles.throwBtnDisabled]}
              onPress={throwBallP1}
            >
              <Text style={styles.throwBtnText}>
                {p1CanThrow ? "THROW!" : "·  ·  ·"}
              </Text>
            </Pressable>
          )}
        </View>

        {/* Balls rendered in absolute screen coords on top of both zones */}
        {p1Balls.map(b => (
          <View key={b.id} style={[styles.ball1, { left: b.x - BALL_R, top: b.y - BALL_R }]} />
        ))}
        {p2Balls.map(b => (
          <View key={b.id} style={[styles.ball2, { left: b.x - BALL_R, top: b.y - BALL_R }]} />
        ))}

        {/* Divider */}
        <View style={styles.divider} />

        {/* Exit button (P1 side) */}
        <Pressable style={styles.exitBtn} onPress={() => router.back()}>
          <Text style={styles.exitText}>✕</Text>
        </Pressable>

        {/* Overlay */}
        {phase !== "playing" && (
          <View style={styles.overlay}>
            {phase === "idle" && (
              <>
                <Text style={styles.overlayTitle}>PVP DODGEBALL</Text>
                <Text style={styles.overlaySub}>
                  Two players, one phone.{"\n"}
                  P1 holds the bottom — P2 holds the top (upside down).{"\n"}
                  Slide to dodge. Tap THROW! to attack.{"\n"}
                  3 hits and you're out!
                </Text>
                <Pressable style={styles.startBtn} onPress={startGame}>
                  <Text style={styles.startBtnText}>START GAME</Text>
                </Pressable>
              </>
            )}
            {phase === "ended" && (
              <>
                <Text style={styles.overlayTitle}>
                  {winner === 1 ? "PLAYER 1 WINS!" : "PLAYER 2 WINS!"}
                </Text>
                <Text style={styles.overlaySub}>
                  {winner === 1 ? "P1 is the dodgeball champion 🏆" : "P2 is the dodgeball champion 🏆"}
                </Text>
                {awardedXp > 0 && (
                  <Text style={styles.xpText}>Winner earns +{awardedXp} XP!</Text>
                )}
                <Pressable style={styles.startBtn} onPress={startGame}>
                  <Text style={styles.startBtnText}>PLAY AGAIN</Text>
                </Pressable>
                <Pressable onPress={() => router.back()} style={{ marginTop: 14 }}>
                  <Text style={{ color: "#888", fontSize: 14 }}>Back to home</Text>
                </Pressable>
              </>
            )}
          </View>
        )}
      </View>
    </View>
  );
}
