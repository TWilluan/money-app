import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Pressable,
  Platform,
} from 'react-native';
import { colors } from './theme';

export interface AlertButton {
  text: string;
  style?: 'default' | 'cancel' | 'destructive';
  onPress?: () => void;
}

interface AlertModalProps {
  visible: boolean;
  title: string;
  message?: string;
  buttons?: AlertButton[];
  onDismiss?: () => void;
}

export function AlertModal({
  visible,
  title,
  message,
  buttons = [{ text: 'OK', style: 'default' }],
  onDismiss,
}: AlertModalProps) {
  const handleButtonPress = (button: AlertButton) => {
    button.onPress?.();
    onDismiss?.();
  };

  const getButtonStyle = (style?: AlertButton['style']) => {
    switch (style) {
      case 'destructive':
        return styles.destructiveButton;
      case 'cancel':
        return styles.cancelButton;
      default:
        return styles.defaultButton;
    }
  };

  const getButtonTextStyle = (style?: AlertButton['style']) => {
    switch (style) {
      case 'destructive':
        return styles.destructiveButtonText;
      case 'cancel':
        return styles.cancelButtonText;
      default:
        return styles.defaultButtonText;
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
    >
      <Pressable style={styles.overlay} onPress={onDismiss}>
        <Pressable style={styles.container} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.title}>{title}</Text>
          {message && <Text style={styles.message}>{message}</Text>}

          <View style={[
            styles.buttonContainer,
            buttons.length > 2 && styles.buttonContainerVertical,
          ]}>
            {buttons.map((button, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.button,
                  getButtonStyle(button.style),
                  buttons.length <= 2 && styles.buttonHorizontal,
                  index > 0 && buttons.length <= 2 && styles.buttonMarginLeft,
                  index > 0 && buttons.length > 2 && styles.buttonMarginTop,
                ]}
                onPress={() => handleButtonPress(button)}
              >
                <Text style={[styles.buttonText, getButtonTextStyle(button.style)]}>
                  {button.text}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// Global alert state management
type AlertConfig = {
  title: string;
  message?: string;
  buttons?: AlertButton[];
};

let showAlertFn: ((config: AlertConfig) => void) | null = null;
let hideAlertFn: (() => void) | null = null;

export function registerAlertHandler(
  show: (config: AlertConfig) => void,
  hide: () => void
) {
  showAlertFn = show;
  hideAlertFn = hide;
}

export function unregisterAlertHandler() {
  showAlertFn = null;
  hideAlertFn = null;
}

/**
 * Cross-platform alert function
 * Usage: showAlert('Title', 'Message', [{ text: 'OK' }])
 */
export function showAlert(
  title: string,
  message?: string,
  buttons?: AlertButton[]
) {
  if (showAlertFn) {
    showAlertFn({ title, message, buttons });
  } else {
    // Fallback for web or when AlertProvider not mounted
    if (Platform.OS === 'web') {
      const result = buttons?.find(b => b.style === 'destructive' || b.style === 'default');
      if (window.confirm(`${title}\n\n${message || ''}`)) {
        result?.onPress?.();
      } else {
        buttons?.find(b => b.style === 'cancel')?.onPress?.();
      }
    } else {
      // On native without provider, this shouldn't happen
      console.warn('AlertModal: AlertProvider not mounted');
    }
  }
}

export function hideAlert() {
  hideAlertFn?.();
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 340,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
      web: {
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
      },
    }),
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    color: colors.sub,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  buttonContainerVertical: {
    flexDirection: 'column',
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    minWidth: 80,
    alignItems: 'center',
  },
  buttonHorizontal: {
    flex: 1,
  },
  buttonMarginLeft: {
    marginLeft: 12,
  },
  buttonMarginTop: {
    marginTop: 8,
  },
  defaultButton: {
    backgroundColor: colors.green,
  },
  cancelButton: {
    backgroundColor: colors.card2,
    borderWidth: 1,
    borderColor: colors.border,
  },
  destructiveButton: {
    backgroundColor: colors.red,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  defaultButtonText: {
    color: '#FFFFFF',
  },
  cancelButtonText: {
    color: colors.text,
  },
  destructiveButtonText: {
    color: '#FFFFFF',
  },
});
