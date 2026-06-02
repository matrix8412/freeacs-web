import { computed, ref } from 'vue';
import { ElMessageBox } from 'element-plus';

type CloseDone = () => void;

export function useDirtyDialog(getValue: () => unknown, close: () => void) {
  const snapshot = ref('');

  const isDirty = computed(() => snapshot.value !== JSON.stringify(getValue()));

  function captureSnapshot() {
    snapshot.value = JSON.stringify(getValue());
  }

  async function confirmDiscard() {
    if (!isDirty.value) return true;

    try {
      await ElMessageBox.confirm('Unsaved changes will be lost.', 'Discard changes?', {
        type: 'warning',
        confirmButtonText: 'Discard',
        cancelButtonText: 'Keep Editing'
      });
      return true;
    } catch {
      return false;
    }
  }

  function beforeClose(done: CloseDone) {
    void confirmDiscard().then((confirmed) => {
      if (confirmed) done();
    });
  }

  async function requestClose() {
    if (await confirmDiscard()) {
      close();
    }
  }

  return {
    beforeClose,
    captureSnapshot,
    isDirty,
    requestClose
  };
}

