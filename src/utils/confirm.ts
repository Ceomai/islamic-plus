import { Alert, Platform } from 'react-native';

/**
 * Asks before an action that cannot be undone. On the phone this is the system dialog; Alert.alert
 * does nothing on web, where it left deletes either unguarded or not working at all.
 */
export function confirmDestructive(opts: { title: string; message: string; confirm: string; cancel: string }): Promise<boolean> {
  if (Platform.OS === 'web') {
    return Promise.resolve(typeof window !== 'undefined' && window.confirm(`${opts.title}\n\n${opts.message}`));
  }
  return new Promise((resolve) => {
    Alert.alert(
      opts.title,
      opts.message,
      [
        { text: opts.cancel, style: 'cancel', onPress: () => resolve(false) },
        { text: opts.confirm, style: 'destructive', onPress: () => resolve(true) },
      ],
      { cancelable: true, onDismiss: () => resolve(false) }
    );
  });
}
