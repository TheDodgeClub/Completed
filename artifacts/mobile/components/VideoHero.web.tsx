import React, { useRef, useState } from "react";
import { View, Pressable, StyleSheet, Text } from "react-native";
import { Feather } from "@expo/vector-icons";

type Props = {
  uri: string;
};

export function VideoHero({ uri }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(true);

  function toggleMute() {
    if (videoRef.current) {
      videoRef.current.muted = !muted;
    }
    setMuted((m) => !m);
  }

  return (
    <View style={styles.container}>
      {/* @ts-ignore — web-only element */}
      <video
        ref={videoRef}
        src={uri}
        autoPlay
        muted
        loop
        playsInline
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          display: "block",
        }}
      />

      <Pressable
        style={({ pressed }) => [styles.muteBtn, { opacity: pressed ? 0.7 : 1 }]}
        onPress={toggleMute}
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
    position: "relative",
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
