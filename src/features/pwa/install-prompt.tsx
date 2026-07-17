'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/shared/ui/button'
import { X, Download } from 'lucide-react'

export function InstallPrompt() {
  const [showPrompt, setShowPrompt] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e)

      // Check session count
      const sessionCount = parseInt(localStorage.getItem('ledgerly-sessions') || '0', 10)
      localStorage.setItem('ledgerly-sessions', String(sessionCount + 1))

      // Show prompt after 3 sessions
      if (sessionCount >= 2) {
        const dismissed = localStorage.getItem('ledgerly-install-dismissed')
        if (!dismissed) {
          setShowPrompt(true)
        }
      }
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    }
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) return

    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice

    if (outcome === 'accepted') {
      setShowPrompt(false)
      localStorage.setItem('ledgerly-install-dismissed', 'true')
    }

    setDeferredPrompt(null)
  }

  const handleDismiss = () => {
    setShowPrompt(false)
    localStorage.setItem('ledgerly-install-dismissed', 'true')
  }

  if (!showPrompt) return null

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50">
      <div className="bg-surface-container border border-outline-variant rounded-xl p-4 shadow-xl">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Download className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-medium text-on-surface">Install Ledgerly</h3>
              <p className="text-sm text-on-surface-variant">Track expenses offline</p>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="text-on-surface-variant hover:text-on-surface"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={handleInstall}
            className="flex-1 bg-primary text-on-primary hover:bg-primary/90"
          >
            Install
          </Button>
          <Button
            onClick={handleDismiss}
            variant="outline"
            className="border-outline-variant text-on-surface-variant"
          >
            Not now
          </Button>
        </div>
      </div>
    </div>
  )
}