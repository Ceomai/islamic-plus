import { useCallback, useMemo, type RefObject } from 'react';
import { useRefState } from '../../hooks/useRefState';
import { fireAndForget } from '../../services/fireAndForget';
import { setJson, storageKeys } from '../../services/storage';
import { recordDeletion } from '../../services/tombstones';
import { notifyAppDataChanged } from '../../services/userDataCloud';
import type { FamilyMember, UserSettings } from '../../types';
import { animateNextLayout } from '../../ui/motion';
import type { FamilySlice } from './slices';

/** Family members on this device and which one is active. */
export function useFamilyState(
  settingsRef: RefObject<UserSettings>,
  updateSettings: (patch: Partial<UserSettings>) => Promise<void>
) {
  const [family, setFamily, familyRef] = useRefState<FamilyMember[]>([]);

  const saveFamily = useCallback(
    (next: FamilyMember[]) => {
      setFamily(next);
      fireAndForget(setJson(storageKeys.family, next), 'family.save');
      notifyAppDataChanged();
    },
    [setFamily]
  );

  const addFamilyMember = useCallback(
    async (member: Omit<FamilyMember, 'id' | 'habitIds'>) => {
      saveFamily([...familyRef.current, { ...member, id: Date.now().toString(), habitIds: [] }]);
    },
    [familyRef, saveFamily]
  );

  const setActiveFamilyMember = useCallback(
    (id: string | null) => updateSettings({ activeFamilyMemberId: id }),
    [updateSettings]
  );

  const removeFamilyMember = useCallback(
    async (id: string) => {
      await recordDeletion('family', id);
      animateNextLayout();
      saveFamily(familyRef.current.filter((m) => m.id !== id));
      if (settingsRef.current.activeFamilyMemberId === id) await setActiveFamilyMember(null);
    },
    [familyRef, saveFamily, settingsRef, setActiveFamilyMember]
  );

  const familyValue = useMemo<FamilySlice>(
    () => ({ family, addFamilyMember, removeFamilyMember, setActiveFamilyMember }),
    [family, addFamilyMember, removeFamilyMember, setActiveFamilyMember]
  );

  return { family, setFamily, familyRef, familyValue };
}
