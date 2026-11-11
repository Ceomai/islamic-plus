import { Alert, Platform } from 'react-native';

export interface ConfirmOptions {
  title: string;
  message: string;
  /** Label of the button that resolves true */
  confirm: string;
  cancel: string;
  /** Red confirm button (system destructive style) */
  destructive?: boolean;
}

/**
 * Asks a yes/no question and resolves true when the user confirms. On the phone this is the system
 * dialog; Alert.alert does nothing on web, so there the browser's confirm() is used instead.
 */
export function confirm(opts: ConfirmOptions): Promise<boolean> {
  if (Platform.OS === 'web') {
    return Promise.resolve(typeof window !== 'undefined' && window.confirm(`${opts.title}\n\n${opts.message}`));
  }
  return new Promise((resolve) => {
    Alert.alert(
      opts.title,
      opts.message,
      [
        { text: opts.cancel, style: 'cancel', onPress: () => resolve(false) },
        { text: opts.confirm, style: opts.destructive ? 'destructive' : 'default', onPress: () => resolve(true) },
      ],
      { cancelable: true, onDismiss: () => resolve(false) }
    );
  });
}

/** Asks before an action that cannot be undone (destructive style unless `destructive: false`). */
export function confirmDestructive(opts: ConfirmOptions): Promise<boolean> {
  return confirm({ ...opts, destructive: opts.destructive ?? true });
}
