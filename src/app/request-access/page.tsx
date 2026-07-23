import { RequestAccessForm } from '@/features/auth/request-access-form'

export default function RequestAccessPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Request Access to Ledgerly
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Professional expense management for your business
          </p>
          <p className="mt-1 text-center text-xs text-gray-500">
            Submit your request and our team will review it within 24 hours.
          </p>
        </div>

        <RequestAccessForm />
      </div>
    </div>
  )
}
