import React from 'react';
import { Pressable, StyleSheet, ViewStyle } from 'react-native';
import type { SlotValue } from '../../game/types';
import { colors } from '../theme';
import { Piece } from './Piece';

type Props = Readonly<{
  value: SlotValue;
  isSelected: boolean;
  isValidDestination: boolean;
  onPress: () => void;
  accessibilityLabel: string;
  containerStyle?: ViewStyle;
}>;

export const Slot = ({
  value,
  isSelected,
  isValidDestination,
  onPress,
  accessibilityLabel,
  containerStyle,
}: Props) => {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => {
        const style: ViewStyle[] = [styles.slot];
        if (containerStyle) style.push(containerStyle);
        if (isSelected) style.push(styles.selected);
        if (isValidDestination) style.push(styles.validDestination);
        if (pressed) style.push(styles.pressed);
        return style;
      }}>
      {value ? <Piece player={value} /> : null}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  slot: {
    width: '48%',
    aspectRatio: 1,
    borderRadius: 8,
    backgroundColor: colors.slotBg,
    borderWidth: 1,
    borderColor: colors.tileGridLine,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.85 },
  selected: {
    borderColor: 'rgba(255,255,255,0.65)',
    borderWidth: 2,
  },
  validDestination: {
    borderColor: colors.validBorder,
    borderWidth: 2,
    backgroundColor: 'rgba(16,185,129,0.14)',
  },
});

