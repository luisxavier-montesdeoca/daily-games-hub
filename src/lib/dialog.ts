import { useRef } from 'react';

/**
 * Closing a <dialog>: call `close()` from buttons, and pass `finish` as the dialog's onClose
 * (for Escape). The parent's onClose runs exactly once, right away. We don't wait for the
 * dialog's "close" event: it can arrive late (e.g. in a background tab), after the parent
 * has already opened the next dialog, which it would then close by mistake.
 */
export function useDialogClose(ref: React.RefObject<HTMLDialogElement | null>, onClose: () => void) {
  const done = useRef(false);
  const finish = () => {
    if (done.current) return;
    done.current = true;
    onClose();
  };
  const close = () => {
    if (ref.current?.open) ref.current.close();
    finish();
  };
  return { finish, close };
}
