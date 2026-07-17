'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getSettings, updateSettings, uploadAvatar } from '@/features/settings/actions'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Skeleton } from '@/shared/ui/skeleton'
import { useToast } from '@/shared/ui/toast'
import { useTheme } from '@/shared/lib/theme-provider'
import { Upload, Save } from 'lucide-react'

const CURRENCIES = ['KES', 'USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY']

export default function SettingsPage() {
  const [displayName, setDisplayName] = useState('')
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('dark')
  const [baseCurrency, setBaseCurrency] = useState('USD')
  const [vatRate, setVatRate] = useState(16)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)

  const { toast } = useToast()
  const queryClient = useQueryClient()
  const { setTheme: setGlobalTheme } = useTheme()

  const { data: settings, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: getSettings,
  })

  useEffect(() => {
    if (settings) {
      setDisplayName(settings.display_name)
      setTheme(settings.theme)
      setBaseCurrency(settings.base_currency)
      setVatRate(settings.vat_rate)
    }
  }, [settings])

  const updateMutation = useMutation({
    mutationFn: updateSettings,
    onSuccess: () => {
      toast('Settings updated', 'success')
      queryClient.invalidateQueries({ queryKey: ['settings'] })
    },
    onError: (error: Error) => {
      toast(error.message, 'error')
    },
  })

  const avatarMutation = useMutation({
    mutationFn: uploadAvatar,
    onSuccess: () => {
      toast('Avatar updated', 'success')
      queryClient.invalidateQueries({ queryKey: ['settings'] })
    },
    onError: (error: Error) => {
      toast(error.message, 'error')
    },
  })

  const handleSave = () => {
    updateMutation.mutate({
      display_name: displayName,
      theme,
      base_currency: baseCurrency,
      vat_rate: vatRate,
    })
    setGlobalTheme(theme)
  }

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setAvatarFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleAvatarUpload = () => {
    if (avatarFile) {
      avatarMutation.mutate(avatarFile)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48 bg-surface-container-high" />
        <Card className="glass-card border-outline-variant">
          <CardContent className="p-6 space-y-4">
            <Skeleton className="h-10 w-full bg-surface-container-high" />
            <Skeleton className="h-10 w-full bg-surface-container-high" />
            <Skeleton className="h-10 w-full bg-surface-container-high" />
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-on-surface font-headline">Settings</h1>

      {/* Profile Section */}
      <Card className="glass-card border-outline-variant">
        <CardHeader>
          <CardTitle className="text-on-surface font-headline">Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-20 h-20 rounded-full bg-surface-container-high flex items-center justify-center overflow-hidden">
                {avatarPreview ? (
                  <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-3xl text-on-surface-variant">
                    {displayName?.charAt(0)?.toUpperCase() || '?'}
                  </span>
                )}
              </div>
              <label className="absolute bottom-0 right-0 p-1 bg-primary rounded-full cursor-pointer hover:bg-primary/80">
                <Upload className="h-4 w-4 text-on-primary" />
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarChange}
                />
              </label>
            </div>
            <div className="flex-1">
              <label className="text-sm font-medium text-on-surface">Display Name</label>
              <Input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your name"
                className="mt-1"
              />
            </div>
            {avatarFile && (
              <Button onClick={handleAvatarUpload} disabled={avatarMutation.isPending}>
                Upload
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Preferences Section */}
      <Card className="glass-card border-outline-variant">
        <CardHeader>
          <CardTitle className="text-on-surface font-headline">Preferences</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-on-surface">Theme</label>
            <select
              value={theme}
              onChange={(e) => setTheme(e.target.value as 'light' | 'dark' | 'system')}
              className="flex h-10 w-full rounded-md border border-outline bg-surface px-3 py-2 text-sm text-on-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <option value="dark">Dark</option>
              <option value="light">Light</option>
              <option value="system">System</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-on-surface">Base Currency</label>
            <select
              value={baseCurrency}
              onChange={(e) => setBaseCurrency(e.target.value)}
              className="flex h-10 w-full rounded-md border border-outline bg-surface px-3 py-2 text-sm text-on-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              {CURRENCIES.map((currency) => (
                <option key={currency} value={currency}>
                  {currency}
                </option>
              ))}
            </select>
            <p className="text-xs text-on-surface-variant">
              Dashboard totals will be converted to this currency
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-on-surface">Default VAT Rate (%)</label>
            <Input
              type="number"
              value={vatRate}
              onChange={(e) => setVatRate(Number(e.target.value))}
              min={0}
              max={100}
              step={0.5}
            />
            <p className="text-xs text-on-surface-variant">
              Applied to new expenses when tax is enabled
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={updateMutation.isPending}
          className="bg-primary text-on-primary hover:bg-primary/90"
        >
          <Save className="h-4 w-4 mr-2" />
          {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </div>
  )
}