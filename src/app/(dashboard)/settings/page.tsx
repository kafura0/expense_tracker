'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getSettings, updateSettings, uploadAvatar } from '@/features/settings/actions'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/ui/card'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Badge } from '@/shared/ui/badge'
import { Skeleton } from '@/shared/ui/skeleton'
import { useToast } from '@/shared/ui/toast'
import { useTheme } from '@/shared/ui/theme-provider'
import { Upload, Save, User, Globe, Percent, AlertTriangle, Trash2, Camera } from 'lucide-react'

const CURRENCIES = [
  { code: 'KES', flag: '\u{1F1F0}\u{1F1EA}', name: 'Kenyan Shilling' },
  { code: 'USD', flag: '\u{1F1FA}\u{1F1F8}', name: 'US Dollar' },
  { code: 'EUR', flag: '\u{1F1EA}\u{1F1FA}', name: 'Euro' },
  { code: 'GBP', flag: '\u{1F1EC}\u{1F1E7}', name: 'British Pound' },
  { code: 'CAD', flag: '\u{1F1E8}\u{1F1E6}', name: 'Canadian Dollar' },
  { code: 'AUD', flag: '\u{1F1E6}\u{1F1FA}', name: 'Australian Dollar' },
  { code: 'JPY', flag: '\u{1F1EF}\u{1F1F5}', name: 'Japanese Yen' },
]

interface SettingsFormState {
  displayName: string
  theme: 'light' | 'dark' | 'system'
  baseCurrency: string
  vatRate: number
}

export default function SettingsPage() {
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [nameError, setNameError] = useState('')

  const { toast } = useToast()
  const queryClient = useQueryClient()
  const { setTheme: setGlobalTheme } = useTheme()

  const { data: settings, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: getSettings,
  })

  const [formState, setFormState] = useState<SettingsFormState>({
    displayName: settings?.display_name ?? '',
    theme: (settings?.theme as 'light' | 'dark' | 'system') ?? 'dark',
    baseCurrency: settings?.base_currency ?? 'USD',
    vatRate: settings?.vat_rate ?? 16,
  })

  const updateField = <K extends keyof SettingsFormState>(
    field: K,
    value: SettingsFormState[K]
  ) => {
    setFormState((prev) => ({ ...prev, [field]: value }))
    if (field === 'displayName') setNameError('')
  }

  const updateMutation = useMutation({
    mutationFn: updateSettings,
    onSuccess: () => {
      toast('Settings updated successfully', 'success')
      queryClient.invalidateQueries({ queryKey: ['settings'] })
    },
    onError: (error: Error) => {
      toast(error.message, 'error')
    },
  })

  const avatarMutation = useMutation({
    mutationFn: uploadAvatar,
    onSuccess: () => {
      toast('Avatar updated successfully', 'success')
      queryClient.invalidateQueries({ queryKey: ['settings'] })
    },
    onError: (error: Error) => {
      toast(error.message, 'error')
    },
  })

  const handleSaveProfile = () => {
    if (!formState.displayName.trim()) {
      setNameError('Display name is required')
      return
    }
    if (formState.displayName.trim().length < 2) {
      setNameError('Display name must be at least 2 characters')
      return
    }
    updateMutation.mutate({
      display_name: formState.displayName.trim(),
    })
  }

  const handleSavePreferences = () => {
    updateMutation.mutate({
      theme: formState.theme,
      base_currency: formState.baseCurrency,
      vat_rate: formState.vatRate,
    })
    setGlobalTheme(formState.theme)
  }

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast('File size must be less than 5MB', 'error')
        return
      }
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
        toast('Only JPEG, PNG, and WebP images are allowed', 'error')
        return
      }
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

  const validateVatRate = (value: number) => {
    if (value < 0) return 'VAT rate cannot be negative'
    if (value > 100) return 'VAT rate cannot exceed 100%'
    return ''
  }

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto space-y-6 p-4 md:p-6">
        <Skeleton className="h-8 w-48" />
        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center gap-4">
              <Skeleton className="h-20 w-20 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-10 w-full" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      </div>
    )
  }

  const currentCurrency = CURRENCIES.find(c => c.code === formState.baseCurrency) || CURRENCIES[0]

  return (
    <div className="max-w-3xl mx-auto space-y-6 p-4 md:p-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-on-surface font-headline">Settings</h1>
        <p className="text-sm text-on-surface-variant">Manage your account preferences and settings</p>
      </div>

      <Card className="glass-card border-outline-variant">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-on-surface font-headline">Profile</CardTitle>
              <CardDescription>Update your personal information</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col sm:flex-row items-start gap-6">
            <div className="relative group">
              <div className="w-24 h-24 rounded-2xl bg-surface-container-high flex items-center justify-center overflow-hidden ring-2 ring-outline-variant/30">
                {avatarPreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-3xl font-bold text-on-surface-variant">
                    {formState.displayName?.charAt(0)?.toUpperCase() || '?'}
                  </span>
                )}
              </div>
              <label className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                <Camera className="h-6 w-6 text-white" />
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarChange}
                />
              </label>
              {avatarFile && (
                <div className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full bg-primary border-2 border-surface" />
              )}
            </div>
            <div className="flex-1 space-y-4 w-full">
              <div className="space-y-2">
                <label className="text-sm font-medium text-on-surface">Display Name</label>
                <Input
                  value={formState.displayName}
                  onChange={(e) => updateField('displayName', e.target.value)}
                  placeholder="Enter your display name"
                  error={!!nameError}
                />
                {nameError && (
                  <p className="text-xs text-red-400">{nameError}</p>
                )}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-on-surface">Email</label>
                <Input
                  value={settings?.display_name ? `${settings.display_name.toLowerCase().replace(/\s/g, '.')}@email.com` : 'user@email.com'}
                  readOnly
                  className="opacity-60 cursor-not-allowed"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-on-surface">Role</label>
                <div>
                  <Badge variant="secondary">Member</Badge>
                </div>
              </div>
            </div>
          </div>
          {avatarFile && (
            <div className="flex justify-end">
              <Button
                onClick={handleAvatarUpload}
                disabled={avatarMutation.isPending}
                variant="outline"
              >
                <Upload className="h-4 w-4 mr-2" />
                {avatarMutation.isPending ? 'Uploading...' : 'Upload Avatar'}
              </Button>
            </div>
          )}
          <div className="flex justify-end pt-2 border-t border-outline-variant/20">
            <Button
              onClick={handleSaveProfile}
              disabled={updateMutation.isPending}
              className="bg-primary text-on-primary hover:bg-primary/90"
            >
              <Save className="h-4 w-4 mr-2" />
              {updateMutation.isPending ? 'Saving...' : 'Save Profile'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="glass-card border-outline-variant">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <Globe className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-on-surface font-headline">Currency & Region</CardTitle>
              <CardDescription>Configure your default currency and regional preferences</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-on-surface">Theme</label>
            <select
              value={formState.theme}
              onChange={(e) => updateField('theme', e.target.value as 'light' | 'dark' | 'system')}
              className="flex h-10 w-full rounded-lg border border-input bg-muted/50 px-3 py-2 text-sm text-foreground transition-all duration-200 hover:border-muted-foreground/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:border-ring"
            >
              <option value="dark">Dark</option>
              <option value="light">Light</option>
              <option value="system">System</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-on-surface">Base Currency</label>
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-lg">
                {currentCurrency.flag}
              </div>
              <select
                value={formState.baseCurrency}
                onChange={(e) => updateField('baseCurrency', e.target.value)}
                className="flex h-10 w-full rounded-lg border border-input bg-muted/50 pl-10 pr-3 py-2 text-sm text-foreground transition-all duration-200 hover:border-muted-foreground/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:border-ring appearance-none"
              >
                {CURRENCIES.map((currency) => (
                  <option key={currency.code} value={currency.code}>
                    {currency.flag}  {currency.code} - {currency.name}
                  </option>
                ))}
              </select>
            </div>
            <p className="text-xs text-on-surface-variant">
              Dashboard totals will be converted to this currency
            </p>
          </div>
          <div className="flex justify-end pt-2 border-t border-outline-variant/20">
            <Button
              onClick={handleSavePreferences}
              disabled={updateMutation.isPending}
              className="bg-primary text-on-primary hover:bg-primary/90"
            >
              <Save className="h-4 w-4 mr-2" />
              {updateMutation.isPending ? 'Saving...' : 'Save Preferences'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="glass-card border-outline-variant">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <Percent className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-on-surface font-headline">VAT Settings</CardTitle>
              <CardDescription>Configure default tax rates for your expenses</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-on-surface">Default VAT Rate</label>
            <div className="relative">
              <Input
                type="number"
                value={formState.vatRate}
                onChange={(e) => updateField('vatRate', Number(e.target.value))}
                min={0}
                max={100}
                step={0.5}
                error={!!validateVatRate(formState.vatRate)}
                className="pr-10"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-medium text-on-surface-variant">
                %
              </div>
            </div>
            {validateVatRate(formState.vatRate) && (
              <p className="text-xs text-red-400">{validateVatRate(formState.vatRate)}</p>
            )}
            <p className="text-xs text-on-surface-variant">
              Applied to new expenses when tax is enabled
            </p>
          </div>
          <div className="flex justify-end pt-2 border-t border-outline-variant/20">
            <Button
              onClick={handleSavePreferences}
              disabled={updateMutation.isPending}
              className="bg-primary text-on-primary hover:bg-primary/90"
            >
              <Save className="h-4 w-4 mr-2" />
              {updateMutation.isPending ? 'Saving...' : 'Save VAT Settings'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="glass-card border-red-500/20">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/10">
              <AlertTriangle className="h-5 w-5 text-red-400" />
            </div>
            <div>
              <CardTitle className="text-red-400 font-headline">Danger Zone</CardTitle>
              <CardDescription>Irreversible actions that affect your account</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-xl border border-red-500/20 bg-red-500/5 gap-3">
            <div className="space-y-1">
              <p className="text-sm font-medium text-on-surface">Delete Account</p>
              <p className="text-xs text-on-surface-variant">
                Permanently delete your account and all associated data. This action cannot be undone.
              </p>
            </div>
            <Button
              variant="destructive"
              size="sm"
              className="sm:shrink-0 w-full sm:w-auto"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
