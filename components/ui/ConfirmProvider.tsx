'use client'
import React, { createContext, useCallback, useContext, useRef, useState } from 'react'
import ConfirmDialog from './ConfirmDialog'
import { useLang } from '@/lib/language-context'

type ConfirmOptions = {
  title: string
  message?: string
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
}

type AlertOptions = {
  title: string
  message?: string
  okLabel?: string
}

type ConfirmContextValue = {
  /** Styled replacement for window.confirm — resolves true when confirmed. */
  confirm: (opts: ConfirmOptions) => Promise<boolean>
  /** Styled replacement for window.alert — resolves when dismissed. */
  alertDialog: (opts: AlertOptions) => Promise<void>
}

const ConfirmContext = createContext<ConfirmContextValue | null>(null)

export function useConfirm(): ConfirmContextValue {
  const ctx = useContext(ConfirmContext)
  if (!ctx) throw new Error('useConfirm must be used inside <ConfirmProvider>')
  return ctx
}

type DialogState =
  | { kind: 'confirm'; opts: ConfirmOptions }
  | { kind: 'alert'; opts: AlertOptions }
  | null

export default function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const { lang } = useLang()
  const isHe = lang === 'he'
  const [dialog, setDialog] = useState<DialogState>(null)
  const resolverRef = useRef<((value: boolean) => void) | null>(null)

  const confirm = useCallback((opts: ConfirmOptions) => {
    return new Promise<boolean>(resolve => {
      resolverRef.current = resolve
      setDialog({ kind: 'confirm', opts })
    })
  }, [])

  const alertDialog = useCallback((opts: AlertOptions) => {
    return new Promise<void>(resolve => {
      resolverRef.current = () => resolve()
      setDialog({ kind: 'alert', opts })
    })
  }, [])

  function settle(value: boolean) {
    resolverRef.current?.(value)
    resolverRef.current = null
    setDialog(null)
  }

  return (
    <ConfirmContext.Provider value={{ confirm, alertDialog }}>
      {children}
      {dialog?.kind === 'confirm' && (
        <ConfirmDialog
          open
          title={dialog.opts.title}
          message={dialog.opts.message}
          confirmLabel={dialog.opts.confirmLabel ?? (isHe ? 'אישור' : 'Confirm')}
          cancelLabel={dialog.opts.cancelLabel ?? (isHe ? 'ביטול' : 'Cancel')}
          danger={dialog.opts.danger}
          onConfirm={() => settle(true)}
          onCancel={() => settle(false)}
        />
      )}
      {dialog?.kind === 'alert' && (
        <ConfirmDialog
          open
          title={dialog.opts.title}
          message={dialog.opts.message}
          confirmLabel={dialog.opts.okLabel ?? (isHe ? 'הבנתי' : 'OK')}
          cancelLabel=""
          onConfirm={() => settle(true)}
          onCancel={() => settle(true)}
        />
      )}
    </ConfirmContext.Provider>
  )
}
