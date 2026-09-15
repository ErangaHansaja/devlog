import React, { useRef, useState } from 'react';
import {
  Animated,
  PanResponder,
  Pressable,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface SwipeableRowProps {
  children: React.ReactNode;
  onDelete: () => void;
  actionWidth?: number;
  containerStyle?: StyleProp<ViewStyle>;
}

export function SwipeableRow({
  children,
  onDelete,
  actionWidth = 76,
  containerStyle,
}: SwipeableRowProps) {
  const translateX = useRef(new Animated.Value(0)).current;
  const [isOpen, setIsOpen] = useState(false);
  const isOpenRef = useRef(false);

  const snapOpen = () => {
    Animated.spring(translateX, {
      toValue: -actionWidth,
      useNativeDriver: true,
      bounciness: 4,
    }).start(() => {
      setIsOpen(true);
      isOpenRef.current = true;
    });
  };

  const snapClose = () => {
    Animated.spring(translateX, {
      toValue: 0,
      useNativeDriver: true,
      bounciness: 4,
    }).start(() => {
      setIsOpen(false);
      isOpenRef.current = false;
    });
  };

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Only capture horizontal leftward drags or when closing from open
        const isHorizontal =
          Math.abs(gestureState.dx) > Math.abs(gestureState.dy) * 1.5;
        const isSignificant = Math.abs(gestureState.dx) > 8;
        return isHorizontal && isSignificant;
      },
      onPanResponderMove: (_, gestureState) => {
        const currentBase = isOpenRef.current ? -actionWidth : 0;
        const newX = currentBase + gestureState.dx;
        // Limit dragging: cannot drag right beyond 0, limit left pull with resistance
        if (newX > 0) {
          translateX.setValue(0);
        } else if (newX < -actionWidth * 1.4) {
          translateX.setValue(-actionWidth * 1.4);
        } else {
          translateX.setValue(newX);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        const threshold = -actionWidth / 2;
        const isFastSwipe = gestureState.vx < -0.5;

        if (isOpenRef.current) {
          // If currently open and dragged right
          if (gestureState.dx > actionWidth / 3 || gestureState.vx > 0.4) {
            snapClose();
          } else {
            snapOpen();
          }
        } else {
          // If currently closed and dragged left
          if (gestureState.dx < threshold || isFastSwipe) {
            snapOpen();
          } else {
            snapClose();
          }
        }
      },
      onPanResponderTerminate: () => {
        if (isOpenRef.current) {
          snapOpen();
        } else {
          snapClose();
        }
      },
    })
  ).current;

  const handleDeletePress = () => {
    snapClose();
    onDelete();
  };

  return (
    <View style={[styles.container, containerStyle]}>
      {/* Hidden Action Behind */}
      <View style={[styles.actionContainer, { width: actionWidth }]}>
        <Pressable
          style={styles.deleteButton}
          onPress={handleDeletePress}
          hitSlop={4}
        >
          <Ionicons name="trash-outline" size={20} color="#ffffff" />
        </Pressable>
      </View>

      {/* Swipeable Content */}
      <Animated.View
        style={[
          styles.contentWrapper,
          { transform: [{ translateX }] },
        ]}
        {...panResponder.panHandlers}
      >
        {children}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 14,
  },
  actionContainer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
    paddingRight: 4,
  },
  deleteButton: {
    backgroundColor: '#e11d48',
    width: 54,
    height: '84%',
    maxHeight: 120,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentWrapper: {
    zIndex: 2,
    backgroundColor: '#09090b',
  },
});
