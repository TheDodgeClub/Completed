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

const WIN = Dimensions.get("window");
const SCREEN_W = WIN.width;

const HEAD_R = 14;
const BODY_W = 8;
const BODY_H = 28;
const ARM_W = 22;
const ARM_H = 6;
const LEG_W = 6;
const LEG_H = 20;
const CHAR_TOTAL_H = HEAD_R * 2 + BODY_H + LEG_H;
const CHAR_VISUAL_W = ARM_W * 2 + BODY_W;

const BALL_R = 11;
const LIVES_MAX = 3;
const BALL_SPEED = 560;
const OPP_BASE_SPEED = 120;
const OPP_ACCEL = 18;
const THROW_COOLDOWN = 900;

type Phase = "idle" | "playing" | "dead";

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

type StickFigureProps = {
  color: string;
  headColor: string;
  flip?: boolean;
  hasBall?: boolean;
  ballColor?: string;
};

function StickFigure({ color, headColor, flip = false, hasBall = false, ballColor = "#FFD700" }: StickFigureProps) {
  const scaleY = flip ? -1 : 1;
  return (
    <View style={{ width: CHAR_VISUAL_W + 20, height: CHAR_TOTAL_H, transform: [{ scaleY }] }}>
      {/* Head */}
      <View style={{
        alignSelf: "center",
        width: HEAD_R * 2, height: HEAD_R * 2,
        borderRadius: HEAD_R,
        backgroundColor: headColor,
        borderWidth: 2, borderColor: color,
      }} />
      {/* Body */}
      <View style={{ alignSelf: "center", width: BODY_W, height: BODY_H, backgroundColor: color }} />
      {/* Arms */}
      <View style={{ position: "absolute", top: HEAD_R * 2 + 4, left: 0, width: ARM_W, height: ARM_H, backgroundColor: color, borderRadius: 3 }} />
      <View style={{ position: "absolute", top: HEAD_R * 2 + 4, right: 0, width: ARM_W, height: ARM_H, backgroundColor: color, borderRadius: 3 }} />
      {/* Ball held in right arm */}
      {hasBall && (
        <View style={{
          position: "absolute",
          top: HEAD_R * 2 + 4 - BALL_R + ARM_H / 2,
          right: -BALL_R,
          width: BALL_R * 2, height: BALL_R * 2,
          borderRadius: BALL_R,
          backgroundColor: ballColor,
          borderWidth: 2, borderColor: "#cc9900",
        }} />
      )}
      {/* Legs */}
      <View style={{ position: "absolute", top: HEAD_R * 2 + BODY_H, left: CHAR_VISUAL_W / 2 - BODY_W, width: LEG_W, height: LEG_H, backgroundColor: color, borderRadius: 3, transform: [{ rotate: "-12deg" }] }} />
      <View style={{ position: "absolute", top: HEAD_R * 2 + BODY_H, left: CHAR_VISUAL_W / 2 + 2, width: LEG_W, height: LEG_H, backgroundColor: color, borderRadius: 3, transform: [{ rotate: "12deg" }] }} />
    </View>
  );
}

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
    heart: { fontSize: 17 },
    ball: {
      position: "absolute",
      width: BALL_R * 2, height: BALL_R * 2,
      borderRadius: BALL_R,
      backgroundColor: "#FFD700",
      borderWidth: 2, borderColor: "#cc9900",
    },
    throwBtn: {
      position: "absolute",
      bottom: 0, left: 0, right: 0,
      height: 64,
      backgroundColor: "#0B5E2F",
      alignItems: "center", justifyContent: "center",
    },
    throwBtnReady: { backgroundColor: "#0B5E2F" },
    throwBtnCooldown: { backgroundColor: "#111" },
    throwBtnText: { color: "#FFD700", fontWeight: "800", fontSize: 18, letterSpacing: 3 },
    cooldownText: { color: "#444", fontWeight: "600", fontSize: 14 },
    overlay: {
      position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: "rgba(0,0,0,0.8)",
      alignItems: "center", justifyContent: "center",
    },
    overlayTitle: { color: "#FFD700", fontSize: 30, fontWeight: "800", marginBottom: 8 },
    overlaySub: { color: "#ccc", fontSize: 15, textAlign: "center", marginBottom: 6, paddingHorizontal: 32 },
    xpLabel: { color: "#FFD700", fontSize: 20, fontWeight: "700", marginVertical: 8 },
    startBtn: {
      marginTop: 20, paddingVertical: 14, paddingHorizontal: 48,
      backgroundColor: "#0B5E2F", borderRadius: 10,
    },
    startBtnText: { color: "#FFD700", fontWeight: "800", fontSize: 16 },
    hitFlash: { backgroundColor: "#ff000022" },
  });
}

export default function DodgeGame() {
  const insets = useSafeAreaInsets();
  const Colors = useColors();
  const styles = useMemo(() => makeStyles(Colors, insets), [Colors, insets]);

  const HEADER_H = insets.top + 60;
  const THROW_BTN_H = 64;
  const ARENA_H = WIN.height - HEADER_H;

  const OPP_CENTER_Y = 60 + CHAR_TOTAL_H / 2;
  const PLAYER_BOTTOM_Y = ARENA_H - THROW_BTN_H - CHAR_TOTAL_H - 8;
  const PLAYER_CENTER_Y = PLAYER_BOTTOM_Y + CHAR_TOTAL_H / 2;

  const [phase, setPhase] = useState<Phase>("idle");
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(LIVES_MAX);
  const [awardedXp, setAwardedXp] = useState(0);
  const [playerX, setPlayerX] = useState(SCREEN_W / 2);
  const [oppX, setOppX] = useState(SCREEN_W / 2);
  const [ballPos, setBallPos] = useState<{ x: number; y: number } | null>(null);
  const [canThrow, setCanThrow] = useState(true);
  const [oppHit, setOppHit] = useState(false);

  const phaseRef = useRef<Phase>("idle");
  const playerXRef = useRef(SCREEN_W / 2);
  const oppXRef = useRef(SCREEN_W / 2);
  const oppVelRef = useRef(OPP_BASE_SPEED);
  const scoreRef = useRef(0);
  const livesRef = useRef(LIVES_MAX);
  const ballPosRef = useRef<{ x: number; y: number } | null>(null);
  const ballFlyingRef = useRef(false);
  const cooldownRef = useRef(false);
  const lastFrameRef = useRef(0);
  const rafRef = useRef<number>(0);
  const hitFlashRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clampPlayer = (x: number) => clamp(x, CHAR_VISUAL_W / 2 + 20, SCREEN_W - CHAR_VISUAL_W / 2 - 20);
  const clampOpp = (x: number) => clamp(x, CHAR_VISUAL_W / 2 + 20, SCREEN_W - CHAR_VISUAL_W / 2 - 20);

  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => phaseRef.current === "playing",
    onMoveShouldSetPanResponder: () => phaseRef.current === "playing",
    onPanResponderMove: (_, gs) => {
      const nx = clampPlayer(gs.moveX);
      playerXRef.current = nx;
      setPlayerX(nx);
    },
  }), []);

  const throwBall = useCallback(() => {
    if (phaseRef.current !== "playing" || cooldownRef.current || ballFlyingRef.current) return;
    cooldownRef.current = true;
    ballFlyingRef.current = true;
    setCanThrow(false);
    const bx = playerXRef.current;
    const by = PLAYER_CENTER_Y - CHAR_TOTAL_H / 2 - BALL_R;
    ballPosRef.current = { x: bx, y: by };
    setBallPos({ x: bx, y: by });
  }, [PLAYER_CENTER_Y]);

  const tick = useCallback((now: number) => {
    if (phaseRef.current !== "playing") return;
    const dt = Math.min(now - lastFrameRef.current, 50);
    lastFrameRef.current = now;

    let ox = oppXRef.current;
    let ov = oppVelRef.current;
    ox += ov * (dt / 1000);
    const minOX = clampOpp(0);
    const maxOX = clampOpp(SCREEN_W);
    if (ox < minOX) { ox = minOX; ov = Math.abs(ov); }
    if (ox > maxOX) { ox = maxOX; ov = -Math.abs(ov); }
    oppXRef.current = ox;
    oppVelRef.current = ov;
    setOppX(ox);

    if (ballFlyingRef.current && ballPosRef.current) {
      const bp = ballPosRef.current;
      const ny = bp.y - BALL_SPEED * (dt / 1000);

      if (ny < -BALL_R * 2) {
        ballFlyingRef.current = false;
        ballPosRef.current = null;
        setBallPos(null);
        const nl = livesRef.current - 1;
        livesRef.current = nl;
        setLives(nl);
        if (nl <= 0) {
          phaseRef.current = "dead";
          setPhase("dead");
          const earned = Math.min(scoreRef.current * 5, 50);
          setAwardedXp(earned);
          awardGameXp(earned).catch(() => {});
          return;
        }
        setTimeout(() => { cooldownRef.current = false; setCanThrow(true); }, THROW_COOLDOWN);
      } else {
        const dx = bp.x - ox;
        const dy = ny - OPP_CENTER_Y;
        const hitRadius = BALL_R + HEAD_R + 6;
        if (dx * dx + dy * dy < hitRadius * hitRadius) {
          ballFlyingRef.current = false;
          ballPosRef.current = null;
          setBallPos(null);
          const ns = scoreRef.current + 1;
          scoreRef.current = ns;
          setScore(ns);
          const dir = oppVelRef.current < 0 ? -1 : 1;
          oppVelRef.current = (OPP_BASE_SPEED + ns * OPP_ACCEL) * dir;
          setOppHit(true);
          if (hitFlashRef.current) clearTimeout(hitFlashRef.current);
          hitFlashRef.current = setTimeout(() => setOppHit(false), 300);
          setTimeout(() => { cooldownRef.current = false; setCanThrow(true); }, THROW_COOLDOWN);
        } else {
          ballPosRef.current = { x: bp.x, y: ny };
          setBallPos({ x: bp.x, y: ny });
        }
      }
    }

    rafRef.current = requestAnimationFrame(tick);
  }, [OPP_CENTER_Y]);

  const startGame = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    ballFlyingRef.current = false;
    ballPosRef.current = null;
    cooldownRef.current = false;
    playerXRef.current = SCREEN_W / 2;
    oppXRef.current = SCREEN_W / 2;
    oppVelRef.current = OPP_BASE_SPEED;
    scoreRef.current = 0;
    livesRef.current = LIVES_MAX;
    setBallPos(null);
    setCanThrow(true);
    setPlayerX(SCREEN_W / 2);
    setOppX(SCREEN_W / 2);
    setScore(0);
    setLives(LIVES_MAX);
    setAwardedXp(0);
    setOppHit(false);
    phaseRef.current = "playing";
    setPhase("playing");
    const now = performance.now();
    lastFrameRef.current = now;
    rafRef.current = requestAnimationFrame(tick);
  }, [tick]);

  useEffect(() => () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (hitFlashRef.current) clearTimeout(hitFlashRef.current);
  }, []);

  const playerLeft = playerX - (CHAR_VISUAL_W + 20) / 2;
  const oppLeft = oppX - (CHAR_VISUAL_W + 20) / 2;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={18} color="#fff" />
        </Pressable>
        <Text style={styles.title}>DODGEBALL</Text>
        <View style={{ width: 36 }} />
      </View>

      <View style={styles.arena} {...panResponder.panHandlers}>
        {/* Opponent character */}
        {phase === "playing" && (
          <View style={{
            position: "absolute",
            left: oppLeft,
            top: 40,
            opacity: oppHit ? 0.4 : 1,
          }}>
            <StickFigure color="#cc2222" headColor="#f87171" flip />
          </View>
        )}

        {/* Flying ball */}
        {ballPos && (
          <View style={[styles.ball, { left: ballPos.x - BALL_R, top: ballPos.y - BALL_R }]} />
        )}

        {/* Player character */}
        {phase === "playing" && (
          <View style={{ position: "absolute", left: playerLeft, top: PLAYER_BOTTOM_Y }}>
            <StickFigure
              color="#0B5E2F"
              headColor="#4ade80"
              hasBall={!ballFlyingRef.current && canThrow}
              ballColor="#FFD700"
            />
          </View>
        )}

        {/* HUD */}
        <View style={styles.hud}>
          <Text style={styles.hudText}>Score: {score}</Text>
          <View style={styles.livesRow}>
            {Array.from({ length: LIVES_MAX }).map((_, i) => (
              <Text key={i} style={styles.heart}>{i < lives ? "❤️" : "🖤"}</Text>
            ))}
          </View>
        </View>

        {/* Throw button */}
        {phase === "playing" && (
          <Pressable
            style={[styles.throwBtn, canThrow ? styles.throwBtnReady : styles.throwBtnCooldown]}
            onPress={throwBall}
          >
            {canThrow ? (
              <Text style={styles.throwBtnText}>THROW!</Text>
            ) : (
              <Text style={styles.cooldownText}>loading...</Text>
            )}
          </Pressable>
        )}

        {/* Overlay */}
        {phase !== "playing" && (
          <View style={styles.overlay}>
            {phase === "idle" && (
              <>
                <Text style={styles.overlayTitle}>DODGEBALL</Text>
                <Text style={styles.overlaySub}>
                  Slide left & right to aim.{"\n"}
                  Tap THROW! to launch the ball at the opponent.{"\n"}
                  Miss 3 times and you're out!
                </Text>
                <Text style={styles.overlaySub}>Earn up to +50 XP</Text>
              </>
            )}
            {phase === "dead" && (
              <>
                <Text style={styles.overlayTitle}>GAME OVER</Text>
                <Text style={styles.overlaySub}>You hit the target {score} time{score !== 1 ? "s" : ""}</Text>
                {awardedXp > 0 ? (
                  <Text style={styles.xpLabel}>+{awardedXp} XP earned!</Text>
                ) : (
                  <Text style={styles.overlaySub}>Land a hit to earn XP next time</Text>
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
