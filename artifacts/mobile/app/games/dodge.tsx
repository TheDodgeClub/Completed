import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  PanResponder,
  Pressable,
  Animated,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";


const WIN = Dimensions.get("window");
const SCREEN_W = WIN.width;

/* ── Character dimensions ── */
const HEAD_R = 13;
const BODY_W = 7;
const BODY_H = 22;
const ARM_W = 17;
const ARM_H = 5;
const LEG_W = 5;
const LEG_H = 15;
const CHAR_TOTAL_H = HEAD_R * 2 + BODY_H + LEG_H;
const CHAR_W = ARM_W * 2 + BODY_W + 10;

/* ── Game constants ── */
const BALL_R = 10;
const LIVES_MAX = 4;
const BALL_SPEED = 640;
const SPAWN_BASE_INTERVAL = 2000;
const MIN_SPAWN_INTERVAL = 650;
const OPP_SPEED_MIN = 52;
const OPP_SPEED_MAX = 88;

const OPP_COLORS = [
  { body: "#cc2222", head: "#f87171" },
  { body: "#b45309", head: "#fbbf24" },
  { body: "#7e22ce", head: "#c084fc" },
  { body: "#0e7490", head: "#22d3ee" },
  { body: "#be185d", head: "#f9a8d4" },
  { body: "#166534", head: "#86efac" },
];

type Phase = "idle" | "playing" | "dead";
type Opponent = { id: number; x: number; y: number; speed: number; colorIdx: number; dx: number };

function clamp(v: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, v)); }

/* ── Stick figure component ── */
function StickFigure({
  color, headColor, hasBall = false,
}: { color: string; headColor: string; hasBall?: boolean }) {
  return (
    <View style={{ width: CHAR_W, height: CHAR_TOTAL_H }}>
      <View style={{
        alignSelf: "center", width: HEAD_R * 2, height: HEAD_R * 2,
        borderRadius: HEAD_R, backgroundColor: headColor, borderWidth: 2, borderColor: color,
      }} />
      <View style={{ alignSelf: "center", width: BODY_W, height: BODY_H, backgroundColor: color }} />
      <View style={{ position: "absolute", top: HEAD_R * 2 + 3, left: 0, width: ARM_W, height: ARM_H, backgroundColor: color, borderRadius: 3 }} />
      <View style={{ position: "absolute", top: HEAD_R * 2 + 3, right: 0, width: ARM_W, height: ARM_H, backgroundColor: color, borderRadius: 3 }} />
      {hasBall && (
        <View style={{
          position: "absolute", top: HEAD_R * 2 + 3 - BALL_R + ARM_H / 2, right: -BALL_R,
          width: BALL_R * 2, height: BALL_R * 2, borderRadius: BALL_R,
          backgroundColor: "#FFD700", borderWidth: 2, borderColor: "#cc9900",
        }} />
      )}
      <View style={{ position: "absolute", top: HEAD_R * 2 + BODY_H, left: CHAR_W / 2 - BODY_W, width: LEG_W, height: LEG_H, backgroundColor: color, borderRadius: 3, transform: [{ rotate: "-12deg" }] }} />
      <View style={{ position: "absolute", top: HEAD_R * 2 + BODY_H, left: CHAR_W / 2 + 2, width: LEG_W, height: LEG_H, backgroundColor: color, borderRadius: 3, transform: [{ rotate: "12deg" }] }} />
    </View>
  );
}

/* ── Styles ── */
function makeStyles(insets: ReturnType<typeof import("react-native-safe-area-context").useSafeAreaInsets>) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: "#080808" },
    header: {
      flexDirection: "row", alignItems: "center",
      paddingTop: insets.top + 8, paddingHorizontal: 16, paddingBottom: 12,
    },
    backBtn: {
      width: 36, height: 36, borderRadius: 18,
      backgroundColor: "#1a1a1a", alignItems: "center", justifyContent: "center",
    },
    title: { flex: 1, textAlign: "center", color: "#FFD700", fontWeight: "800", fontSize: 17, letterSpacing: 2 },
    arena: { flex: 1, overflow: "hidden" },
    dangerLine: {
      position: "absolute", left: 0, right: 0, height: 1,
      backgroundColor: "rgba(255,60,60,0.25)",
    },
    hud: {
      position: "absolute", top: 12, left: 0, right: 0,
      flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 20,
    },
    hudText: { color: "#fff", fontSize: 15, fontWeight: "700" },
    livesRow: { flexDirection: "row", gap: 5 },
    heart: { fontSize: 16 },
    ball: {
      position: "absolute", width: BALL_R * 2, height: BALL_R * 2,
      borderRadius: BALL_R, backgroundColor: "#FFD700",
      borderWidth: 2, borderColor: "#cc9900",
      shadowColor: "#FFD700", shadowOpacity: 0.8, shadowRadius: 6,
    },
    chargeRing: {
      position: "absolute",
      width: 70, height: 70, borderRadius: 35,
      borderWidth: 2.5, borderColor: "#FFD700",
      backgroundColor: "rgba(255,215,0,0.08)",
    },
    holdHint: {
      position: "absolute", bottom: 24, left: 0, right: 0, alignItems: "center",
    },
    holdHintText: {
      color: "rgba(255,255,255,0.3)", fontSize: 10, fontWeight: "600", letterSpacing: 2,
    },
    overlay: {
      position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: "rgba(0,0,0,0.85)",
      alignItems: "center", justifyContent: "center",
    },
    overlayTitle: { color: "#FFD700", fontSize: 30, fontWeight: "800", marginBottom: 10, letterSpacing: 1 },
    overlaySub: {
      color: "#bbb", fontSize: 14, textAlign: "center",
      marginBottom: 8, paddingHorizontal: 36, lineHeight: 21,
    },
    xpLabel: { color: "#FFD700", fontSize: 22, fontWeight: "800", marginVertical: 10 },
    startBtn: {
      marginTop: 22, paddingVertical: 14, paddingHorizontal: 52,
      backgroundColor: "#0B5E2F", borderRadius: 10,
    },
    startBtnText: { color: "#FFD700", fontWeight: "800", fontSize: 16, letterSpacing: 1 },
  });
}

/* ── Game component ── */
export default function DodgeGame() {
  const insets = useSafeAreaInsets();
  const Colors = useColors();
  const styles = useMemo(() => makeStyles(insets), [insets]);

  const { refreshUser } = useAuth();
  const refreshUserRef = useRef(refreshUser);
  useEffect(() => { refreshUserRef.current = refreshUser; }, [refreshUser]);

  const HEADER_H = insets.top + 56;
  const ARENA_H = WIN.height - HEADER_H;
  const PLAYER_Y = ARENA_H - CHAR_TOTAL_H - 20;
  const DANGER_Y = PLAYER_Y - 4;

  /* ── State ── */
  const [phase, setPhase] = useState<Phase>("idle");
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(LIVES_MAX);
  const [playerX, setPlayerX] = useState(SCREEN_W / 2);
  const [opponents, setOpponents] = useState<Opponent[]>([]);
  const [ballPos, setBallPos] = useState<{ x: number; y: number } | null>(null);
  const [isHolding, setIsHolding] = useState(false);
  const chargeAnim = useRef(new Animated.Value(0)).current;
  const chargeAnimHandle = useRef<Animated.CompositeAnimation | null>(null);

  /* ── Refs for game loop ── */
  const phaseRef = useRef<Phase>("idle");
  const playerXRef = useRef(SCREEN_W / 2);
  const opponentsRef = useRef<Opponent[]>([]);
  const ballPosRef = useRef<{ x: number; y: number } | null>(null);
  const ballFlyingRef = useRef(false);
  const scoreRef = useRef(0);
  const livesRef = useRef(LIVES_MAX);
  const lastFrameRef = useRef(0);
  const rafRef = useRef<number>(0);
  const nextSpawnRef = useRef(800);
  const idCounterRef = useRef(0);
  const holdingRef = useRef(false);

  /* ── Spawn opponent ── */
  const spawnOpponent = useCallback(() => {
    const x = clamp(
      Math.random() * SCREEN_W,
      CHAR_W / 2 + 12,
      SCREEN_W - CHAR_W / 2 - 12,
    );
    const speed = OPP_SPEED_MIN
      + Math.random() * (OPP_SPEED_MAX - OPP_SPEED_MIN)
      + scoreRef.current * 2.5;
    const dx = (Math.random() - 0.5) * 35;
    const opp: Opponent = {
      id: idCounterRef.current++,
      x,
      y: -CHAR_TOTAL_H - 5,
      speed,
      colorIdx: Math.floor(Math.random() * OPP_COLORS.length),
      dx,
    };
    opponentsRef.current = [...opponentsRef.current, opp];
    setOpponents([...opponentsRef.current]);
    nextSpawnRef.current = Math.max(
      MIN_SPAWN_INTERVAL,
      SPAWN_BASE_INTERVAL - scoreRef.current * 75,
    );
  }, []);
  const spawnRef = useRef(spawnOpponent);
  useEffect(() => { spawnRef.current = spawnOpponent; }, [spawnOpponent]);

  /* ── Throw ball ── */
  const throwBall = useCallback(() => {
    if (ballFlyingRef.current || phaseRef.current !== "playing") return;
    ballFlyingRef.current = true;
    const pos = { x: playerXRef.current, y: PLAYER_Y - BALL_R - 2 };
    ballPosRef.current = pos;
    setBallPos(pos);
  }, [PLAYER_Y]);
  const throwRef = useRef(throwBall);
  useEffect(() => { throwRef.current = throwBall; }, [throwBall]);

  /* ── Game loop ── */
  const tick = useCallback((now: number) => {
    if (phaseRef.current !== "playing") return;
    const dt = Math.min(now - lastFrameRef.current, 50);
    lastFrameRef.current = now;

    /* Move opponents */
    let hitIds = new Set<number>();
    let newOpps = opponentsRef.current.map(o => {
      let nx = o.x + o.dx * (dt / 1000);
      if (nx < CHAR_W / 2 + 10) { nx = CHAR_W / 2 + 10; }
      if (nx > SCREEN_W - CHAR_W / 2 - 10) { nx = SCREEN_W - CHAR_W / 2 - 10; }
      return { ...o, x: nx, y: o.y + o.speed * (dt / 1000) };
    });

    /* Move ball & collision */
    if (ballFlyingRef.current && ballPosRef.current) {
      const bp = ballPosRef.current;
      const ny = bp.y - BALL_SPEED * (dt / 1000);

      if (ny < -BALL_R * 2) {
        /* Ball left screen — disappear, no life lost */
        ballFlyingRef.current = false;
        ballPosRef.current = null;
        setBallPos(null);
      } else {
        for (const o of newOpps) {
          const headCY = o.y + HEAD_R;
          const dx = bp.x - o.x;
          const dy = ny - headCY;
          const hit = BALL_R + HEAD_R + 6;
          if (dx * dx + dy * dy < hit * hit) {
            hitIds.add(o.id);
          }
        }
        if (hitIds.size > 0) {
          ballFlyingRef.current = false;
          ballPosRef.current = null;
          setBallPos(null);
          const ns = scoreRef.current + hitIds.size;
          scoreRef.current = ns;
          setScore(ns);
        } else {
          ballPosRef.current = { x: bp.x, y: ny };
          setBallPos({ x: bp.x, y: ny });
        }
      }
    }

    /* Filter hit/dangerous opponents */
    let liveLost = false;
    newOpps = newOpps.filter(o => {
      if (hitIds.has(o.id)) return false;
      if (o.y >= DANGER_Y) { liveLost = true; return false; }
      return true;
    });

    opponentsRef.current = newOpps;
    setOpponents([...newOpps]);

    /* Handle life loss */
    if (liveLost) {
      const nl = livesRef.current - 1;
      livesRef.current = nl;
      setLives(nl);
      if (nl <= 0) {
        phaseRef.current = "dead";
        setPhase("dead");
        return;
      }
    }

    /* Spawn */
    nextSpawnRef.current -= dt;
    if (nextSpawnRef.current <= 0) {
      spawnRef.current();
    }

    rafRef.current = requestAnimationFrame(tick);
  }, [DANGER_Y]);

  /* ── Start / restart ── */
  const startGame = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    ballFlyingRef.current = false;
    ballPosRef.current = null;
    scoreRef.current = 0;
    livesRef.current = LIVES_MAX;
    opponentsRef.current = [];
    nextSpawnRef.current = 700;
    playerXRef.current = SCREEN_W / 2;
    holdingRef.current = false;
    chargeAnimHandle.current?.stop();
    chargeAnim.setValue(0);

    setBallPos(null);
    setPlayerX(SCREEN_W / 2);
    setScore(0);
    setLives(LIVES_MAX);
    setAwardedXp(0);
    setOpponents([]);
    setIsHolding(false);

    phaseRef.current = "playing";
    setPhase("playing");
    lastFrameRef.current = performance.now();
    rafRef.current = requestAnimationFrame(tick);
  }, [tick, chargeAnim]);

  /* ── Cleanup ── */
  useEffect(() => () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
  }, []);

  /* ── PanResponder: aim by dragging, throw on release ── */
  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => phaseRef.current === "playing",
    onMoveShouldSetPanResponder: () => phaseRef.current === "playing",

    onPanResponderGrant: (e) => {
      const nx = clamp(e.nativeEvent.locationX, CHAR_W / 2, SCREEN_W - CHAR_W / 2);
      playerXRef.current = nx;
      setPlayerX(nx);
      holdingRef.current = true;
      setIsHolding(true);
      chargeAnimHandle.current?.stop();
      chargeAnim.setValue(0);
      chargeAnimHandle.current = Animated.timing(chargeAnim, {
        toValue: 1, duration: 500, useNativeDriver: true,
      });
      chargeAnimHandle.current.start();
    },

    onPanResponderMove: (e) => {
      const nx = clamp(e.nativeEvent.locationX, CHAR_W / 2, SCREEN_W - CHAR_W / 2);
      playerXRef.current = nx;
      setPlayerX(nx);
    },

    onPanResponderRelease: () => {
      if (!holdingRef.current) return;
      holdingRef.current = false;
      setIsHolding(false);
      chargeAnimHandle.current?.stop();
      chargeAnim.setValue(0);
      throwRef.current();
    },

    onPanResponderTerminate: () => {
      holdingRef.current = false;
      setIsHolding(false);
      chargeAnimHandle.current?.stop();
      chargeAnim.setValue(0);
    },
  }), [chargeAnim]);

  /* ── Render ── */
  const playerLeft = playerX - CHAR_W / 2;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={18} color="#fff" />
        </Pressable>
        <Text style={styles.title}>DODGEBALL</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Arena */}
      <View style={styles.arena} {...panResponder.panHandlers}>

        {/* Danger line */}
        {phase === "playing" && (
          <View style={[styles.dangerLine, { top: PLAYER_Y }]} />
        )}

        {/* Opponents falling from top */}
        {phase === "playing" && opponents.map(o => {
          const col = OPP_COLORS[o.colorIdx];
          return (
            <View
              key={o.id}
              style={{ position: "absolute", left: o.x - CHAR_W / 2, top: o.y }}
            >
              <StickFigure color={col.body} headColor={col.head} />
            </View>
          );
        })}

        {/* Flying ball */}
        {ballPos && (
          <View style={[styles.ball, { left: ballPos.x - BALL_R, top: ballPos.y - BALL_R }]} />
        )}

        {/* Player + charge ring */}
        {phase === "playing" && (
          <>
            {isHolding && (
              <Animated.View style={[styles.chargeRing, {
                left: playerX - 35,
                top: PLAYER_Y + CHAR_TOTAL_H / 2 - 35,
                opacity: chargeAnim.interpolate({ inputRange: [0, 1], outputRange: [0.2, 0.9] }),
                transform: [{
                  scale: chargeAnim.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1.4] }),
                }],
              }]} />
            )}
            <View style={{ position: "absolute", left: playerLeft, top: PLAYER_Y }}>
              <StickFigure
                color="#0B5E2F"
                headColor="#4ade80"
                hasBall={!ballFlyingRef.current}
              />
            </View>
          </>
        )}

        {/* HUD */}
        <View style={styles.hud}>
          <Text style={styles.hudText}>Hits: {score}</Text>
          <View style={styles.livesRow}>
            {Array.from({ length: LIVES_MAX }).map((_, i) => (
              <Text key={i} style={styles.heart}>{i < lives ? "❤️" : "🖤"}</Text>
            ))}
          </View>
        </View>

        {/* Hold hint */}
        {phase === "playing" && !isHolding && !ballFlyingRef.current && (
          <View style={styles.holdHint}>
            <Text style={styles.holdHintText}>HOLD & RELEASE TO THROW</Text>
          </View>
        )}

        {/* Overlay: idle / dead */}
        {phase !== "playing" && (
          <View style={styles.overlay}>
            {phase === "idle" && (
              <>
                <Text style={styles.overlayTitle}>DODGEBALL</Text>
                <Text style={styles.overlaySub}>
                  Opponents fall from above — don't let them reach you!{"\n\n"}
                  Hold anywhere to aim, then release to throw.{"\n"}
                  You have 4 lives. Good luck.
                </Text>
              </>
            )}
            {phase === "dead" && (
              <>
                <Text style={styles.overlayTitle}>GAME OVER</Text>
                <Text style={styles.overlaySub}>
                  You hit {score} opponent{score !== 1 ? "s" : ""}!
                </Text>
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
