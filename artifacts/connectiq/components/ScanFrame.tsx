import React, { useEffect } from "react";
import { Dimensions, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

const { width } = Dimensions.get("window");
const FRAME_W = width * 0.82;
const FRAME_H = FRAME_W * 0.6;
const CORNER = 24;
const BORDER_W = 3;

function Corner({
  position,
}: {
  position: "topLeft" | "topRight" | "bottomLeft" | "bottomRight";
}) {
  const isTop = position.startsWith("top");
  const isLeft = position.endsWith("Left");

  return (
    <View
      style={{
        position: "absolute",
        width: CORNER,
        height: CORNER,
        top: isTop ? 0 : undefined,
        bottom: !isTop ? 0 : undefined,
        left: isLeft ? 0 : undefined,
        right: !isLeft ? 0 : undefined,
        borderTopWidth: isTop ? BORDER_W : 0,
        borderBottomWidth: !isTop ? BORDER_W : 0,
        borderLeftWidth: isLeft ? BORDER_W : 0,
        borderRightWidth: !isLeft ? BORDER_W : 0,
        borderColor: "#4F8EFF",
        borderTopLeftRadius: isTop && isLeft ? 8 : 0,
        borderTopRightRadius: isTop && !isLeft ? 8 : 0,
        borderBottomLeftRadius: !isTop && isLeft ? 8 : 0,
        borderBottomRightRadius: !isTop && !isLeft ? 8 : 0,
      }}
    />
  );
}

export function ScanFrame({ active = true }: { active?: boolean }) {
  const scanY = useSharedValue(0);
  const pulseOpacity = useSharedValue(0.6);

  useEffect(() => {
    if (active) {
      scanY.value = withRepeat(
        withSequence(
          withTiming(FRAME_H - 4, { duration: 1800 }),
          withTiming(0, { duration: 1800 })
        ),
        -1,
        false
      );
      pulseOpacity.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 900 }),
          withTiming(0.4, { duration: 900 })
        ),
        -1,
        false
      );
    }
  }, [active, scanY, pulseOpacity]);

  const scanStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: scanY.value }],
    opacity: pulseOpacity.value,
  }));

  const cornerStyle = useAnimatedStyle(() => ({
    opacity: pulseOpacity.value,
  }));

  return (
    <View
      style={{
        width: FRAME_W,
        height: FRAME_H,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* Dark overlay area is outside — frame is just corners */}
      <View
        style={{
          position: "absolute",
          width: FRAME_W,
          height: FRAME_H,
          borderRadius: 12,
          overflow: "hidden",
        }}
      >
        {/* Scan line */}
        <Animated.View style={[scanStyle, { position: "absolute", width: "100%", left: 0, top: 0 }]}>
          <View
            style={{
              height: 2,
              backgroundColor: "#4F8EFF",
              shadowColor: "#4F8EFF",
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.8,
              shadowRadius: 4,
            }}
          />
          {/* Glow below line */}
          <View
            style={{
              height: 20,
              backgroundColor: "rgba(79,142,255,0.1)",
            }}
          />
        </Animated.View>
      </View>

      {/* Corner brackets */}
      <Animated.View
        style={[
          cornerStyle,
          { position: "absolute", width: FRAME_W, height: FRAME_H },
        ]}
      >
        <Corner position="topLeft" />
        <Corner position="topRight" />
        <Corner position="bottomLeft" />
        <Corner position="bottomRight" />
      </Animated.View>
    </View>
  );
}
