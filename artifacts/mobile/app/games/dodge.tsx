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
const BALL_SPEED = 640;
const LIVES_MAX = 4;
const SPAWN_BASE_INTERVAL = 2000;
const MIN_SPAWN_INTERVAL = 650;
const OPP_SPEED_MIN = 52;
const OPP_SPEED_MAX = 88;

/* ── Power ball constants ── */
const POWER_BALL_R = 14;
const POWER_BALL_SPEED = 68;
const POWER_BALL_BASE_INTERVAL = 26000;
const POWER_BALL_MIN_INTERVAL = 11000;
const TRIPLE_SHOT_DURATION = 60000; // 1 minute ms
const TRIPLE_DX = 90; // horizontal px/s spread for side balls

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
type FlyingBall = { id: number; x: number; y: number; dx: number };
type PowerBall = { id: number; x: number; y: number };

function clamp(v: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, v)); }

/* ── Stick figure component ── */
function StickFigure({
  color, headColor, hasBall = false, tripleShot = false,
}: { color: string; headColor: string; hasBall?: boolean; tripleShot?: boolean }) {
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
          backgroundColor: tripleShot ? "#FFD700" : "#FFD700",
          borderWidth: 2, borderColor: tripleShot ? "#fff" : "#cc9900",
          shadowColor: tripleShot ? "#FFD700" : "transparent",
          shadowOpacity: tripleShot ? 1 : 0,
          shadowRadius: tripleShot ? 8 : 0,
        }} />
      )}
      <View style={{ position: "absolute", top: HEAD_R * 2 + BODY_H, left: CHAR_W / 2 - BODY_W, width: LEG_W, height: LEG_H, backgroundColor: color, borderRadius: 3, transform: [{ rotate: "-12deg" }] }} />
      <View style={{ position: "absolute", top: HEAD_R * 2 + BODY_H, left: CHAR_W / 2 + 2, width: LEG_W, height: LEG_H, backgroundColor: color, borderRadius: 3, transform: [{ rotate: "12deg" }] }} />
    </View>
  );
}

/* ── Glowing Power Ball ── */
function GlowingPowerBall({ x, y, glowAnim }: { x: number; y: number; glowAnim: Animated.Value }) {
  return (
    <View style={{ position: "absolute", left: x - POWER_BALL_R * 2, top: y - POWER_BALL_R * 2, width: POWER_BALL_R * 4, height: POWER_BALL_R * 4, alignItems: "center", justifyContent: "center" }}>
      {/* Outer glow ring */}
      <Animated.View style={{
        position: "absolute",
        width: POWER_BALL_R * 3.6,
        height: POWER_BALL_R * 3.6,
        borderRadius: POWER_BALL_R * 1.8,
        backgroundColor: "rgba(255,215,0,0.18)",
        opacity: glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }),
        transform: [{ scale: glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1.15] }) }],
      }} />
      {/* Inner glow */}
      <Animated.View style={{
        position: "absolute",
        width: POWER_BALL_R * 2.6,
        height: POWER_BALL_R * 2.6,
        borderRadius: POWER_BALL_R * 1.3,
        backgroundColor: "rgba(255,215,0,0.35)",
        opacity: glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] }),
      }} />
      {/* Core ball */}
      <View style={{
        width: POWER_BALL_R * 2,
        height: POWER_BALL_R * 2,
        borderRadius: POWER_BALL_R,
        backgroundColor: "#FFD700",
        borderWidth: 2.5,
        borderColor: "#fff8c0",
        shadowColor: "#FFD700",
        shadowOpacity: 1,
        shadowRadius: 10,
        elevation: 8,
        alignItems: "center",
        justifyContent: "center",
      }}>
        <Text style={{ fontSize: 10, lineHeight: 14 }}>⚡</Text>
      </View>
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
      flexDirection: "row", justifyContent: "space-between",
      alignItems: "center", paddingHorizontal: 20,
    },
    hudText: { color: "#fff", fontSize: 15, fontWeight: "700" },
    tripleShotBadge: {
      flexDirection: "row", alignItems: "center", gap: 4,
      backgroundColor: "rgba(255,215,0,0.18)",
      borderWidth: 1, borderColor: "#FFD700",
      borderRadius: 10, paddingHorizontal: 9, paddingVertical: 3,
    },
    tripleShotText: { color: "#FFD700", fontSize: 12, fontWeight: "800", letterSpacing: 0.5 },
    livesRow: { flexDirection: "row", gap: 5 },
    heart: { fontSize: 16 },
    ball: {
      position: "absolute", width: BALL_R * 2, height: BALL_R * 2,
      borderRadius: BALL_R, backgroundColor: "#FFD700",
      borderWidth: 2, borderColor: "#cc9900",
      shadowColor: "#FFD700", shadowOpacity: 0.8, shadowRadius: 6,
    },
    tripleBall: {
      position: "absolute", width: BALL_R * 2, height: BALL_R * 2,
      borderRadius: BALL_R, backgroundColor: "#FFD700",
      borderWidth: 2, borderColor: "#ffffff",
      shadowColor: "#FFD700", shadowOpacity: 1, shadowRadius: 10,
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
  const [flyingBalls, setFlyingBalls] = useState<FlyingBall[]>([]);
  const [powerBalls, setPowerBalls] = useState<PowerBall[]>([]);
  const [isHolding, setIsHolding] = useState(false);
  const [awardedXp, setAwardedXp] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [tripleShotSecsLeft, setTripleShotSecsLeft] = useState(0);

  /* ── Animations ── */
  const chargeAnim = useRef(new Animated.Value(0)).current;
  const chargeAnimHandle = useRef<Animated.CompositeAnimation | null>(null);
  const powerGlowAnim = useRef(new Animated.Value(0)).current;
  const powerGlowLoop = useRef<Animated.CompositeAnimation | null>(null);

  /* Start power glow loop */
  useEffect(() => {
    powerGlowLoop.current = Animated.loop(Animated.sequence([
      Animated.timing(powerGlowAnim, { toValue: 1, duration: 550, useNativeDriver: true }),
      Animated.timing(powerGlowAnim, { toValue: 0, duration: 550, useNativeDriver: true }),
    ]));
    powerGlowLoop.current.start();
    return () => powerGlowLoop.current?.stop();
  }, [powerGlowAnim]);

  /* ── Refs for game loop ── */
  const phaseRef = useRef<Phase>("idle");
  const playerXRef = useRef(SCREEN_W / 2);
  const opponentsRef = useRef<Opponent[]>([]);
  const flyingBallsRef = useRef<FlyingBall[]>([]);
  const powerBallsRef = useRef<PowerBall[]>([]);
  const scoreRef = useRef(0);
  const livesRef = useRef(LIVES_MAX);
  const lastFrameRef = useRef(0);
  const rafRef = useRef<number>(0);
  const nextSpawnRef = useRef(800);
  const idCounterRef = useRef(0);
  const holdingRef = useRef(false);
  const tripleShotRef = useRef(false);
  const tripleShotEndsAtRef = useRef(0);
  const nextPowerBallRef = useRef(POWER_BALL_BASE_INTERVAL);
  const tripleShotSecsRef = useRef(0); // track last displayed secs to avoid excess setState

  /* ── Spawn opponent ── */
  const spawnOpponent = useCallback(() => {
    const x = clamp(Math.random() * SCREEN_W, CHAR_W / 2 + 12, SCREEN_W - CHAR_W / 2 - 12);
    const speed = OPP_SPEED_MIN + Math.random() * (OPP_SPEED_MAX - OPP_SPEED_MIN) + scoreRef.current * 2.5;
    const dx = (Math.random() - 0.5) * 35;
    const opp: Opponent = {
      id: idCounterRef.current++,
      x, y: -CHAR_TOTAL_H - 5, speed,
      colorIdx: Math.floor(Math.random() * OPP_COLORS.length), dx,
    };
    opponentsRef.current = [...opponentsRef.current, opp];
    setOpponents([...opponentsRef.current]);
    nextSpawnRef.current = Math.max(MIN_SPAWN_INTERVAL, SPAWN_BASE_INTERVAL - scoreRef.current * 75);
  }, []);
  const spawnRef = useRef(spawnOpponent);
  useEffect(() => { spawnRef.current = spawnOpponent; }, [spawnOpponent]);

  /* ── Spawn power ball ── */
  const spawnPowerBall = useCallback(() => {
    if (powerBallsRef.current.length > 0) return; // only one at a time
    const x = clamp(Math.random() * SCREEN_W, POWER_BALL_R * 3, SCREEN_W - POWER_BALL_R * 3);
    const pb: PowerBall = { id: idCounterRef.current++, x, y: -POWER_BALL_R * 2 };
    powerBallsRef.current = [pb];
    setPowerBalls([pb]);
    // Reset timer for next spawn (quicker as game progresses)
    nextPowerBallRef.current = Math.max(
      POWER_BALL_MIN_INTERVAL,
      POWER_BALL_BASE_INTERVAL - scoreRef.current * 300,
    );
  }, []);
  const spawnPowerRef = useRef(spawnPowerBall);
  useEffect(() => { spawnPowerRef.current = spawnPowerBall; }, [spawnPowerBall]);

  /* ── Activate triple shot ── */
  const activateTripleShot = useCallback(() => {
    tripleShotRef.current = true;
    tripleShotEndsAtRef.current = Date.now() + TRIPLE_SHOT_DURATION;
    setTripleShotSecsLeft(Math.ceil(TRIPLE_SHOT_DURATION / 1000));
  }, []);
  const activateTSRef = useRef(activateTripleShot);
  useEffect(() => { activateTSRef.current = activateTripleShot; }, [activateTripleShot]);

  /* ── Throw ball ── */
  const throwBall = useCallback(() => {
    if (flyingBallsRef.current.length > 0 || phaseRef.current !== "playing") return;
    const baseX = playerXRef.current;
    const y = PLAYER_Y - BALL_R - 2;
    const newBalls: FlyingBall[] = tripleShotRef.current
      ? [
          { id: idCounterRef.current++, x: baseX, y, dx: -TRIPLE_DX },
          { id: idCounterRef.current++, x: baseX, y, dx: 0 },
          { id: idCounterRef.current++, x: baseX, y, dx: TRIPLE_DX },
        ]
      : [{ id: idCounterRef.current++, x: baseX, y, dx: 0 }];
    flyingBallsRef.current = newBalls;
    setFlyingBalls([...newBalls]);
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
      if (nx < CHAR_W / 2 + 10) nx = CHAR_W / 2 + 10;
      if (nx > SCREEN_W - CHAR_W / 2 - 10) nx = SCREEN_W - CHAR_W / 2 - 10;
      return { ...o, x: nx, y: o.y + o.speed * (dt / 1000) };
    });

    /* Move flying balls & collision with opponents */
    let newFlyingBalls: FlyingBall[] = [];
    for (const b of flyingBallsRef.current) {
      const ny = b.y - BALL_SPEED * (dt / 1000);
      const nx = b.x + b.dx * (dt / 1000);
      if (ny < -BALL_R * 2 || nx < -BALL_R * 2 || nx > SCREEN_W + BALL_R * 2) continue; // off screen
      let hitSomething = false;
      for (const o of newOpps) {
        if (hitIds.has(o.id)) continue;
        const headCY = o.y + HEAD_R;
        const dx = nx - o.x;
        const dy = ny - headCY;
        const hit = BALL_R + HEAD_R + 6;
        if (dx * dx + dy * dy < hit * hit) {
          hitIds.add(o.id);
          hitSomething = true;
          break;
        }
      }
      if (!hitSomething) newFlyingBalls.push({ ...b, x: nx, y: ny });
    }

    /* Update score for hits */
    if (hitIds.size > 0) {
      const ns = scoreRef.current + hitIds.size;
      scoreRef.current = ns;
      setScore(ns);
    }

    flyingBallsRef.current = newFlyingBalls;
    setFlyingBalls([...newFlyingBalls]);

    /* Move power balls & check player collection */
    let collectedPowerBall = false;
    const newPowerBalls = powerBallsRef.current
      .map(pb => ({ ...pb, y: pb.y + POWER_BALL_SPEED * (dt / 1000) }))
      .filter(pb => {
        // Auto-collect when golden ball reaches player level
        if (pb.y >= PLAYER_Y - POWER_BALL_R * 2) {
          const dx = Math.abs(pb.x - playerXRef.current);
          if (dx < CHAR_W * 1.2) {
            collectedPowerBall = true;
            return false; // remove
          }
          // Not close enough — disappear anyway when past player line
          if (pb.y >= PLAYER_Y + CHAR_TOTAL_H) return false;
        }
        return pb.y < ARENA_H + POWER_BALL_R * 2;
      });

    powerBallsRef.current = newPowerBalls;
    setPowerBalls([...newPowerBalls]);

    if (collectedPowerBall) {
      activateTSRef.current();
    }

    /* Check triple shot expiry */
    if (tripleShotRef.current) {
      const remaining = tripleShotEndsAtRef.current - Date.now();
      if (remaining <= 0) {
        tripleShotRef.current = false;
        setTripleShotSecsLeft(0);
        tripleShotSecsRef.current = 0;
      } else {
        const secs = Math.ceil(remaining / 1000);
        if (secs !== tripleShotSecsRef.current) {
          tripleShotSecsRef.current = secs;
          setTripleShotSecsLeft(secs);
        }
      }
    }

    /* Filter hit / dangerous opponents */
    let liveLost = false;
    newOpps = newOpps.filter(o => {
      if (hitIds.has(o.id)) return false;
      if (o.y >= DANGER_Y) { liveLost = true; return false; }
      return true;
    });
    opponentsRef.current = newOpps;
    setOpponents([...newOpps]);

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

    /* Spawn opponents */
    nextSpawnRef.current -= dt;
    if (nextSpawnRef.current <= 0) spawnRef.current();

    /* Spawn power balls */
    nextPowerBallRef.current -= dt;
    if (nextPowerBallRef.current <= 0) spawnPowerRef.current();

    rafRef.current = requestAnimationFrame(tick);
  }, [DANGER_Y, ARENA_H, PLAYER_Y]);

  /* ── Start / restart ── */
  const startGame = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    flyingBallsRef.current = [];
    powerBallsRef.current = [];
    scoreRef.current = 0;
    livesRef.current = LIVES_MAX;
    opponentsRef.current = [];
    nextSpawnRef.current = 700;
    nextPowerBallRef.current = POWER_BALL_BASE_INTERVAL;
    playerXRef.current = SCREEN_W / 2;
    holdingRef.current = false;
    tripleShotRef.current = false;
    tripleShotEndsAtRef.current = 0;
    tripleShotSecsRef.current = 0;
    chargeAnimHandle.current?.stop();
    chargeAnim.setValue(0);

    setFlyingBalls([]);
    setPowerBalls([]);
    setPlayerX(SCREEN_W / 2);
    setScore(0);
    setLives(LIVES_MAX);
    setAwardedXp(0);
    setOpponents([]);
    setIsHolding(false);
    setTripleShotSecsLeft(0);

    phaseRef.current = "playing";
    setPhase("playing");
    lastFrameRef.current = performance.now();
    rafRef.current = requestAnimationFrame(tick);
  }, [tick, chargeAnim]);

  /* ── Load high score ── */
  useEffect(() => {
    AsyncStorage.getItem("dodge_highscore").then(v => {
      if (v) setHighScore(parseInt(v, 10));
    });
  }, []);

  /* ── Award XP + save high score on game over ── */
  useEffect(() => {
    if (phase !== "dead") return;
    const xp = Math.floor(score * 2);
    setAwardedXp(xp);
    if (score > highScore) {
      setHighScore(score);
      AsyncStorage.setItem("dodge_highscore", String(score));
    }
  }, [phase]);

  /* ── Cleanup ── */
  useEffect(() => () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
  }, []);

  /* ── PanResponder ── */
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
  const hasFlying = flyingBalls.length > 0;

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

        {/* Opponents */}
        {phase === "playing" && opponents.map(o => {
          const col = OPP_COLORS[o.colorIdx];
          return (
            <View key={o.id} style={{ position: "absolute", left: o.x - CHAR_W / 2, top: o.y }}>
              <StickFigure color={col.body} headColor={col.head} />
            </View>
          );
        })}

        {/* Glowing power balls */}
        {phase === "playing" && powerBalls.map(pb => (
          <GlowingPowerBall key={pb.id} x={pb.x} y={pb.y} glowAnim={powerGlowAnim} />
        ))}

        {/* Flying balls */}
        {flyingBalls.map(b => (
          <View
            key={b.id}
            style={[
              tripleShotSecsLeft > 0 ? styles.tripleBall : styles.ball,
              { left: b.x - BALL_R, top: b.y - BALL_R },
            ]}
          />
        ))}

        {/* Player + charge ring */}
        {phase === "playing" && (
          <>
            {isHolding && (
              <Animated.View style={[styles.chargeRing, {
                left: playerX - 35,
                top: PLAYER_Y + CHAR_TOTAL_H / 2 - 35,
                opacity: chargeAnim.interpolate({ inputRange: [0, 1], outputRange: [0.2, 0.9] }),
                transform: [{ scale: chargeAnim.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1.4] }) }],
              }]} />
            )}
            <View style={{ position: "absolute", left: playerLeft, top: PLAYER_Y }}>
              <StickFigure
                color="#0B5E2F"
                headColor="#4ade80"
                hasBall={!hasFlying}
                tripleShot={tripleShotSecsLeft > 0}
              />
            </View>
          </>
        )}

        {/* HUD */}
        <View style={styles.hud}>
          <Text style={styles.hudText}>Hits: {score}</Text>
          {tripleShotSecsLeft > 0 && (
            <View style={styles.tripleShotBadge}>
              <Text style={styles.tripleShotText}>⚡ TRIPLE  {tripleShotSecsLeft}s</Text>
            </View>
          )}
          <View style={styles.livesRow}>
            {Array.from({ length: LIVES_MAX }).map((_, i) => (
              <Text key={i} style={styles.heart}>{i < lives ? "❤️" : "🖤"}</Text>
            ))}
          </View>
        </View>

        {/* Hold hint */}
        {phase === "playing" && !isHolding && !hasFlying && (
          <View style={styles.holdHint}>
            <Text style={styles.holdHintText}>
              {tripleShotSecsLeft > 0 ? "⚡ TRIPLE SHOT ACTIVE — HOLD & RELEASE" : "HOLD & RELEASE TO THROW"}
            </Text>
          </View>
        )}

        {/* Overlays: idle / dead */}
        {phase !== "playing" && (
          <View style={styles.overlay}>
            {phase === "idle" && (
              <>
                <Text style={styles.overlayTitle}>DODGEBALL</Text>
                <Text style={styles.overlaySub}>
                  Opponents fall from above — don't let them reach you!{"\n\n"}
                  Hold anywhere to aim, then release to throw.{"\n"}
                  Catch the ⚡ golden ball for triple shot power!{"\n"}
                  You have 4 lives. Good luck.
                </Text>
                {highScore > 0 && (
                  <Text style={styles.overlaySub}>🏆 Best: {highScore} hits</Text>
                )}
              </>
            )}
            {phase === "dead" && (
              <>
                <Text style={styles.overlayTitle}>GAME OVER</Text>
                <Text style={styles.overlaySub}>
                  You hit {score} opponent{score !== 1 ? "s" : ""}!
                  {score >= highScore && score > 0 ? "\n🏆 New high score!" : highScore > 0 ? `\nBest: ${highScore}` : ""}
                </Text>
                {awardedXp > 0 && (
                  <Text style={styles.xpLabel}>+{awardedXp} XP</Text>
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
