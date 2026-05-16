/**
 * AppTextInput — Paper TextInput wrapper with dark-theme defaults.
 * All logic props (onChangeText, value, etc.) are forwarded directly.
 */
import React from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import { TextInput, TextInputProps } from 'react-native-paper';
import { dark } from '../theme/colors';

interface AppTextInputProps extends Omit<TextInputProps, 'theme'> {
  containerStyle?: StyleProp<ViewStyle>;
}

const AppTextInputComponent = ({ containerStyle, style, ...props }: AppTextInputProps) => {
  return (
    <TextInput
      mode="outlined"
      outlineColor={dark.border}
      activeOutlineColor={dark.primary}
      textColor={dark.textPrimary}
      placeholderTextColor={dark.textMuted}
      style={[
        {
          backgroundColor: dark.surfaceVariant,
          fontSize: 16,
        },
        style,
      ]}
      outlineStyle={{ borderRadius: 10 }}
      {...props}
    />
  );
};

// Attach the Icon sub-component from Paper
const AppTextInput = Object.assign(AppTextInputComponent, {
  Icon: TextInput.Icon,
  Affix: TextInput.Affix,
});

export default AppTextInput;
