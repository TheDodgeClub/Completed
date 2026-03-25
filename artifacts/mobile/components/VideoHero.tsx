import React, { useRef, useState } from "react";
import { View, Pressable, StyleSheet, Text } from "react-native";
import { VideoView, useVideoPlayer } from "expo-video";
import { Feather } from "@expo/vector-icons";

type Props = {
  uri: string;
};

export function VideoHero({ uri }: Props) {
  const [muted, setMuted] = useState(true);

  const player = useVideoPlayer(uri, (p) => {
    p.loop = true;
    p.muted = true;
    p.play();
  });

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
        allowsFullscreen={false}
        allowsPictureInPicture={false}
      />

      {/* Gradient overlay at bottom */}
      <View style={styles.overlay} pointerEvents="none" />

      {/* Mute / unmute button */}
      <Pressable
        style={({ pressed }) => [styles.muteBtn, { opacity: pressed ? 0.7 : 1 }]}
        onPress={toggleMute}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Feather
          name={muted ? "volume-x" : "volume-2"}
          size={16}
          color="#fff"
        />
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
    // soft fade at bottom so the mute button is always readable
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
