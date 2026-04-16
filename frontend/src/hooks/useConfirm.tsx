import { useState, useCallback } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Button } from '@mui/material';

interface ConfirmOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmColor?: 'primary' | 'error' | 'warning' | 'success';
}

interface ConfirmState extends ConfirmOptions {
  open: boolean;
  resolve?: (value: boolean) => void;
}

export function useConfirm() {
  const [state, setState] = useState<ConfirmState>({ open: false, message: '' });

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setState({ open: true, ...options, resolve });
    });
  }, []);

  const handleClose = (value: boolean) => {
    state.resolve?.(value);
    setState((s) => ({ ...s, open: false }));
  };

  const ConfirmDialog = (
    <Dialog open={state.open} onClose={() => handleClose(false)} maxWidth="xs" fullWidth>
      <DialogTitle>{state.title ?? 'Confirmar'}</DialogTitle>
      <DialogContent>
        <DialogContentText>{state.message}</DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => handleClose(false)}>{state.cancelText ?? 'Cancelar'}</Button>
        <Button
          onClick={() => handleClose(true)}
          color={state.confirmColor ?? 'primary'}
          variant="contained"
          autoFocus
        >
          {state.confirmText ?? 'Confirmar'}
        </Button>
      </DialogActions>
    </Dialog>
  );

  return { confirm, ConfirmDialog };
}
