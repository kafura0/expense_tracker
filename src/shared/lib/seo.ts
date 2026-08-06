/**
 * Canonical site constants for SEO metadata.
 *
 * `SITE_URL` is the origin used for `metadataBase`, canonical URLs, Open Graph
 * assets, JSON-LD, robots.txt and sitemap.xml. It prefers the deployed
 * `NEXT_PUBLIC_SITE_URL` and only falls back to the production alias so SEO
 * metadata never resolves to localhost when the var is missing at build time.
 */
const resolvedSiteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ||
  'https://expense-tracker-ruddy-five-r8k6s4r6zg.vercel.app'

export const SITE_URL = resolvedSiteUrl.replace(/\/+$/, '')

export const SITE_NAME = 'Ledgerly'

export const SITE_TITLE = 'Ledgerly — Master Your Financial Future'

export const SITE_DESCRIPTION =
  'Ledgerly is an expense and income tracker with multi-currency support, automatic VAT, team workspaces, and exportable reports for individuals and small teams.'

export const ORG_NAME = 'Ledgerly Inc.'
