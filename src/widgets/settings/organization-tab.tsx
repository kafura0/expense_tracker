'use client'

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  getOrgSettings,
  updateOrgDefaults,
  updateOrgProfile,
} from '@/features/settings/actions'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/ui/card'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Skeleton } from '@/shared/ui/skeleton'
import { useToast } from '@/shared/ui/toast'
import { ErrorState } from '@/shared/ui/error-state'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select'
import { Building2, Save, Globe, Percent, Lock } from 'lucide-react'

const CURRENCIES = [
  { code: 'KES', flag: '\u{1F1F0}\u{1F1EA}', name: 'Kenyan Shilling' },
  { code: 'USD', flag: '\u{1F1FA}\u{1F1F8}', name: 'US Dollar' },
  { code: 'EUR', flag: '\u{1F1EA}\u{1F1FA}', name: 'Euro' },
  { code: 'GBP', flag: '\u{1F1EC}\u{1F1E7}', name: 'British Pound' },
  { code: 'CAD', flag: '\u{1F1E8}\u{1F1E6}', name: 'Canadian Dollar' },
  { code: 'AUD', flag: '\u{1F1E6}\u{1F1FA}', name: 'Australian Dollar' },
  { code: 'JPY', flag: '\u{1F1EF}\u{1F1F5}', name: 'Japanese Yen' },
]

const INHERIT_CURRENCY_VALUE = '__inherit__'

function ReadOnlyHint({ text }: { text: string }) {
  return (
    <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <Lock className="h-3 w-3" />
      {text}
    </p>
  )
}

interface OrgSettingsData {
  name: string
  slug: string
  default_currency: string | null
  default_vat_rate: number | null
}

export function OrganizationTab({ isOrgAdmin }: { isOrgAdmin: boolean }) {
  const queryClient = useQueryClient()
  const { data, isLoading, isError } = useQuery({
    queryKey: ['org-settings'],
    queryFn: getOrgSettings,
  })

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="p-6 space-y-4">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-4 w-32" />
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

  if (isError || data?.error || !data?.data) {
    return (
      <ErrorState
        title="Could not load organization settings"
        description={data?.error ?? 'Something went wrong'}
        onRetry={() => queryClient.invalidateQueries({ queryKey: ['org-settings'] })}
      />
    )
  }

  // Remount the form when server values change so local state is re-seeded
  // from the latest data (no setState-in-effect needed).
  return (
    <OrgSettingsForm
      key={JSON.stringify(data.data)}
      isOrgAdmin={isOrgAdmin}
      initial={data.data}
    />
  )
}

function OrgSettingsForm({
  isOrgAdmin,
  initial,
}: {
  isOrgAdmin: boolean
  initial: OrgSettingsData
}) {
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const [name, setName] = useState(() => initial.name)
  const [slug, setSlug] = useState(() => initial.slug)
  const [defaultCurrency, setDefaultCurrency] = useState(() => initial.default_currency ?? 'USD')
  const [defaultVatRate, setDefaultVatRate] = useState(() =>
    initial.default_vat_rate != null ? String(initial.default_vat_rate) : ''
  )

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['org-settings'] })

  const profileMutation = useMutation({
    mutationFn: () => updateOrgProfile({ name, slug }),
    onSuccess: (res) => {
      if (res?.error) {
        toast(res.error, 'error')
      } else {
        toast('Organization updated', 'success')
        refresh()
      }
    },
    onError: (err: Error) => toast(err.message, 'error'),
  })

  const defaultsMutation = useMutation({
    mutationFn: () =>
      updateOrgDefaults({
        default_currency: defaultCurrency || null,
        default_vat_rate: defaultVatRate === '' ? null : Number(defaultVatRate),
      }),
    onSuccess: (res) => {
      if (res?.error) {
        toast(res.error, 'error')
      } else {
        toast('Organization defaults updated', 'success')
        refresh()
      }
    },
    onError: (err: Error) => toast(err.message, 'error'),
  })

  const vatError =
    defaultVatRate !== '' &&
    (Number.isNaN(Number(defaultVatRate)) || Number(defaultVatRate) < 0 || Number(defaultVatRate) > 100)
      ? 'VAT rate must be between 0 and 100'
      : ''

  return (
    <div className="space-y-6">
      <Card className="glass-card border-border">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-foreground font-headline">Organization Profile</CardTitle>
              <CardDescription>
                {isOrgAdmin
                  ? 'Update your organization name and slug'
                  : 'Your organization identity'}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Organization Name</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={!isOrgAdmin}
              placeholder="Acme Corp"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Slug</label>
            <Input
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              disabled={!isOrgAdmin}
              placeholder="acme-corp"
            />
            <p className="text-xs text-muted-foreground">
              Used in links — lowercase letters, numbers, and hyphens
            </p>
          </div>
          {isOrgAdmin ? (
            <div className="flex justify-end pt-2 border-t border-border/20">
              <Button
                onClick={() => profileMutation.mutate()}
                disabled={profileMutation.isPending}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                <Save className="h-4 w-4 mr-2" />
                {profileMutation.isPending ? 'Saving...' : 'Save Profile'}
              </Button>
            </div>
          ) : (
            <ReadOnlyHint text="Only Org Admins can edit this" />
          )}
        </CardContent>
      </Card>

      <Card className="glass-card border-border">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <Globe className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-foreground font-headline">Team Defaults</CardTitle>
              <CardDescription>
                Members inherit these unless they set a personal override
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Default Currency</label>
            <Select
              value={defaultCurrency === '' ? INHERIT_CURRENCY_VALUE : defaultCurrency}
              onValueChange={(value) =>
                setDefaultCurrency(value === INHERIT_CURRENCY_VALUE ? '' : value)
              }
              disabled={!isOrgAdmin}
            >
              <SelectTrigger className="w-full bg-muted/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={INHERIT_CURRENCY_VALUE}>Inherit from account</SelectItem>
                {CURRENCIES.map((currency) => (
                  <SelectItem key={currency.code} value={currency.code}>
                    {currency.flag}  {currency.code} - {currency.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Default VAT Rate</label>
            <div className="relative">
              <Input
                type="number"
                value={defaultVatRate}
                onChange={(e) => setDefaultVatRate(e.target.value)}
                disabled={!isOrgAdmin}
                placeholder="e.g. 16"
                min={0}
                max={100}
                step={0.5}
                error={!!vatError}
                className="pr-10"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-medium text-muted-foreground">
                %
              </div>
            </div>
            {vatError && <p className="text-xs text-red-400">{vatError}</p>}
            <p className="text-xs text-muted-foreground">
              Applies to new expenses only — existing entries are never rewritten
            </p>
          </div>
          {isOrgAdmin ? (
            <div className="flex justify-end pt-2 border-t border-border/20">
              <Button
                onClick={() => defaultsMutation.mutate()}
                disabled={defaultsMutation.isPending || !!vatError}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                <Percent className="h-4 w-4 mr-2" />
                {defaultsMutation.isPending ? 'Saving...' : 'Save Defaults'}
              </Button>
            </div>
          ) : (
            <ReadOnlyHint text="Only Org Admins can edit these" />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
