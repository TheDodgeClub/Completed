import React, { useState, useEffect } from "react";
import { View, Pressable, StyleSheet, Text } from "react-native";
import { VideoView, useVideoPlayer } from "expo-video";
import { Feather } from "@expo/vector-icons";
import { resolveImageUrl } from "@/constants/api";

type Props = {
  uri: string;
};

export function VideoHero({ uri }: Props) {
  const resolvedUri = resolveImageUrl(uri) ?? uri;
  const [muted, setMuted] = useState(true);

  const player = useVideoPlayer(resolvedUri, (p) => {
    p.loop = true;
    p.muted = true;
    p.play();
  });

  // Expo-video v3: use addListener on the SharedObject player to detect when
  // the video is ready, then ensure playback is running. This handles iOS
  // simulator timing issues where the initial p.play() fires before buffering.
  useEffect(() => {
    const subscription = player.addListener("statusChange", ({ status }) => {
      if (status === "readyToPlay") {
        try {
          player.play();
        } catch {}
      }
    });
    return () => subscription.remove();
  }, [player]);

  function toggleMute() {
    const next = !muted;
    player.muted = next;
    setMuted(next);
  }

  return (
    <View style={styles.container}>
      <VideoView
        player={player}
        style={styles.video}
        contentFit="cover"
        nativeControls={false}
        fullscreenOptions={{ isFullscreenButtonHidden: true }}
        allowsPictureInPicture={false}
      />

      <View style={styles.overlay} pointerEvents="none" />

      <Pressable
        style={({ pressed }) => [styles.muteBtn, { opacity: pressed ? 0.7 : 1 }]}
        onPress={toggleMute}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Feather name={muted ? "volume-x" : "volume-2"} size={16} color="#fff" />
        <Text style={styles.muteBtnLabel}>{muted ? "Unmute" : "Mute"}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    height: 220,
    backgroundColor: "#000",
    overflow: "hidden",
  },
  video: {
    width: "100%",
    height: "100%",
  },
  overlay: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 60,
    backgroundColor: "transparent",
  },
  muteBtn: {
    position: "absolute",
    bottom: 12,
    right: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(0,0,0,0.55)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  muteBtnLabel: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
});
