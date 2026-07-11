'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { FormInput, FormSelect, FormCheckbox, FormDatePicker } from './form-inputs'
import { ChevronLeft, ChevronRight, CheckCircle2 } from 'lucide-react'

interface Step {
  id: string
  title: string
  description: string
}

interface ApplicationWizardProps {
  type: 'birth' | 'marriage'
  subtype: 'new' | 'copy'
}

// Mirrors ALLOWED_CONTENT_TYPES / MAX_DOCUMENT_BYTES in lambda/document_service.py.
// The presigned POST policy enforces both server-side; these only spare the
// citizen a round trip and a cryptic S3 error.
const ALLOWED_DOCUMENT_TYPES = ['application/pdf', 'image/jpeg', 'image/png']
const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024

/**
 * Upload a supporting document straight to S3 and return its object key.
 *
 * The file never passes through API Gateway (which caps payloads at 10MB) — the
 * API only hands back a short-lived presigned POST policy. The server chooses
 * the key, so the citizen can't write outside their own namespace.
 */
async function uploadDocument(file: File, sessionToken: string, apiUrl: string): Promise<string> {
  const res = await fetch(`${apiUrl}/documents`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Session-Token': sessionToken,
    },
    body: JSON.stringify({ contentType: file.type }),
  })

  if (res.status === 401 || res.status === 403) {
    const err = new Error('SESSION_EXPIRED')
    err.name = 'SessionExpired'
    throw err
  }
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.message || 'Could not prepare the document upload.')
  }

  const { uploadUrl, fields, documentKey } = await res.json()

  const form = new FormData()
  Object.entries(fields as Record<string, string>).forEach(([k, v]) => form.append(k, v))
  form.append('file', file) // must be appended last; S3 ignores anything after it

  const upload = await fetch(uploadUrl, { method: 'POST', body: form })
  if (!upload.ok) {
    throw new Error('The document upload was rejected. Please try a different file.')
  }

  return documentKey
}

export function ApplicationWizard({ type, subtype }: ApplicationWizardProps) {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(0)
  const [applicationData, setapplicationData] = useState<Record<string, any>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [applicationId, setApplicationId] = useState('')
  const [documentFile, setDocumentFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  // Load form data from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(`ccr_form_${type}_${subtype}`)
    if (saved) {
      setapplicationData(JSON.parse(saved))
    }
  }, [type, subtype])

  // Save form data to localStorage whenever it changes. Skipped once submitted,
  // otherwise this would immediately rewrite the draft we clear on success.
  useEffect(() => {
    if (submitted) return
    localStorage.setItem(`ccr_form_${type}_${subtype}`, JSON.stringify(applicationData))
  }, [applicationData, type, subtype, submitted])

  const steps: Step[] =
    type === 'birth'
      ? subtype === 'new'
        ? [
            {
              id: 'child',
              title: 'Child Information',
              description: 'Enter the newborn child details',
            },
            {
              id: 'father',
              title: 'Father Information',
              description: 'Enter the father\'s details',
            },
            {
              id: 'mother',
              title: 'Mother Information',
              description: 'Enter the mother\'s details',
            },
            {
              id: 'documents',
              title: 'Documents',
              description: 'Upload required documentation',
            },
            {
              id: 'review',
              title: 'Review & Confirm',
              description: 'Review and submit your application',
            },
          ]
        : [
            {
              id: 'personal',
              title: 'Your Information',
              description: 'Enter your details',
            },
            {
              id: 'childInfo',
              title: 'Birth Information',
              description: 'Provide the birth certificate details',
            },
            {
              id: 'delivery',
              title: 'Delivery Method',
              description: 'Choose how you want to receive the certificate',
            },
            {
              id: 'review',
              title: 'Review & Confirm',
              description: 'Review and submit your order',
            },
          ]
      : subtype === 'new'
      ? [
          {
            id: 'personal1',
            title: 'First Party Information',
            description: 'Enter details of the first spouse',
          },
          {
            id: 'personal2',
            title: 'Second Party Information',
            description: 'Enter details of the second spouse',
          },
          {
            id: 'marriage',
            title: 'Marriage Details',
            description: 'Provide information about the marriage',
          },
          {
            id: 'review',
            title: 'Review & Confirm',
            description: 'Review and submit your application',
          },
        ]
      : [
          {
            id: 'personal',
            title: 'Your Information',
            description: 'Enter your details',
          },
          {
            id: 'marriageInfo',
            title: 'Marriage Information',
            description: 'Provide the marriage certificate details',
          },
          {
            id: 'delivery',
            title: 'Delivery Method',
            description: 'Choose how you want to receive the certificate',
          },
          {
            id: 'review',
            title: 'Review & Confirm',
            description: 'Review and submit your order',
          },
        ]

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {}
    const currentStepId = steps[step].id

    // Validation logic
    if (currentStepId === 'child' && type === 'birth' && subtype === 'new') {
      if (!applicationData.childFirstName) newErrors.childFirstName = 'Child first name is required'
      if (!applicationData.childDateOfBirth)
        newErrors.childDateOfBirth = 'Date of birth is required'
      if (!applicationData.placeOfBirth) newErrors.placeOfBirth = 'Place of birth is required'
    } else if (currentStepId === 'father' && type === 'birth' && subtype === 'new') {
      if (!applicationData.fatherFirstName) newErrors.fatherFirstName = 'Father first name is required'
      if (!applicationData.fatherLastName) newErrors.fatherLastName = 'Father last name is required'
      if (!applicationData.fatherDateOfBirth)
        newErrors.fatherDateOfBirth = 'Father date of birth is required'
      if (!applicationData.fatherPlaceOfBirth)
        newErrors.fatherPlaceOfBirth = 'Father place of birth is required'
      if (!applicationData.fatherResidence) newErrors.fatherResidence = 'Father residence is required'
      if (!applicationData.fatherOccupation) newErrors.fatherOccupation = 'Father occupation is required'
      if (!applicationData.fatherNationality) newErrors.fatherNationality = 'Father nationality is required'
    } else if (currentStepId === 'mother' && type === 'birth' && subtype === 'new') {
      if (!applicationData.motherFirstName) newErrors.motherFirstName = 'Mother first name is required'
      if (!applicationData.motherLastName) newErrors.motherLastName = 'Mother last name is required'
      if (!applicationData.motherDateOfBirth)
        newErrors.motherDateOfBirth = 'Mother date of birth is required'
      if (!applicationData.motherPlaceOfBirth)
        newErrors.motherPlaceOfBirth = 'Mother place of birth is required'
      if (!applicationData.motherResidence) newErrors.motherResidence = 'Mother residence is required'
      if (!applicationData.motherOccupation) newErrors.motherOccupation = 'Mother occupation is required'
      if (!applicationData.motherNationality) newErrors.motherNationality = 'Mother nationality is required'
    } else if (currentStepId === 'documents' && type === 'birth' && subtype === 'new') {
      if (!documentFile) newErrors.document = 'Please upload the required document'
    } else if (
      (currentStepId === 'personal' && type === 'birth' && subtype === 'copy') ||
      (currentStepId === 'personal' && type === 'marriage' && subtype === 'copy')
    ) {
      if (!applicationData.firstName) newErrors.firstName = 'First name is required'
      if (!applicationData.lastName) newErrors.lastName = 'Last name is required'
      if (!applicationData.email) newErrors.email = 'Email is required'
    } else if (currentStepId === 'personal1' && type === 'marriage' && subtype === 'new') {
      if (!applicationData.spouse1FirstName) newErrors.spouse1FirstName = 'First name is required'
      if (!applicationData.spouse1LastName) newErrors.spouse1LastName = 'Last name is required'
    } else if (currentStepId === 'personal2' && type === 'marriage' && subtype === 'new') {
      if (!applicationData.spouse2FirstName) newErrors.spouse2FirstName = 'First name is required'
      if (!applicationData.spouse2LastName) newErrors.spouse2LastName = 'Last name is required'
    } else if (currentStepId === 'marriage' && type === 'marriage' && subtype === 'new') {
      if (!applicationData.marriageDate) newErrors.marriageDate = 'Marriage date is required'
      if (!applicationData.marriagePlace) newErrors.marriagePlace = 'Place of marriage is required'
    } else if (currentStepId === 'review') {
      if (!termsAccepted) newErrors.terms = 'You must accept the terms and conditions'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleNext = () => {
    if (validateStep(currentStep)) {
      if (currentStep < steps.length - 1) {
        setCurrentStep(currentStep + 1)
      }
    }
  }

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleSubmit = async () => {
    if (!validateStep(currentStep)) return

    // Ordering a copy of an existing certificate has no endpoint yet; the
    // submit Lambdas only understand a first-time application.
    if (subtype === 'copy') {
      setSubmitError('Ordering a certificate copy is not available yet. Please check back soon.')
      return
    }

    const sessionToken = localStorage.getItem('session_token')
    if (!sessionToken) {
      router.push('/verify')
      return
    }

    setSubmitting(true)
    setSubmitError('')

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || ''

      // A birth application must carry its supporting document. Upload it first:
      // if S3 rejects it, nothing has been submitted yet.
      let documentKey: string | undefined
      if (type === 'birth') {
        if (!documentFile) {
          throw new Error('Please upload the required document before submitting.')
        }
        setUploading(true)
        try {
          documentKey = await uploadDocument(documentFile, sessionToken, API_URL)
        } finally {
          setUploading(false)
        }
      }

      const res = await fetch(`${API_URL}/${type}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Session-Token': sessionToken,
        },
        body: JSON.stringify({ type, subtype, applicationData, documentKey }),
      })

      // The session token is opaque, so an expired session can only surface
      // here — AuthGuard can see that a token exists, not that it's still valid.
      // API Gateway answers 401 when the header is absent, 403 when it denies.
      if (res.status === 401 || res.status === 403) {
        localStorage.removeItem('session_token')
        router.push('/verify')
        return
      }

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.message || `Submission failed (${res.status})`)
      }

      const data = await res.json()
      setApplicationId(data.applicationId)
      setSubmitted(true)
      localStorage.removeItem(`ccr_form_${type}_${subtype}`)
    } catch (err: any) {
      // The document endpoint sits behind the same session authorizer, so it can
      // reject an expired session before we ever reach the submit call.
      if (err?.name === 'SessionExpired') {
        localStorage.removeItem('session_token')
        router.push('/verify')
        return
      }
      setSubmitError(err?.message || 'Could not reach the registry service. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleInputChange = (field: string, value: any) => {
    setapplicationData((prev) => ({
      ...prev,
      [field]: value,
    }))
    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors((prev) => {
        const { [field]: removed, ...rest } = prev
        return rest
      })
    }
  }

  const handleDocumentChange = (file: File | null) => {
    if (file) {
      // Same rules the presigned POST policy enforces; catching them here avoids
      // a round trip and an opaque S3 error.
      if (!ALLOWED_DOCUMENT_TYPES.includes(file.type)) {
        setDocumentFile(null)
        setErrors((prev) => ({ ...prev, document: 'Please upload a PDF, JPEG, or PNG file.' }))
        return
      }
      if (file.size > MAX_DOCUMENT_BYTES) {
        setDocumentFile(null)
        setErrors((prev) => ({
          ...prev,
          document: `That file is ${(file.size / 1024 / 1024).toFixed(1)}MB. The limit is ${MAX_DOCUMENT_BYTES / 1024 / 1024}MB.`,
        }))
        return
      }
    }

    setDocumentFile(file)
    if (errors.document) {
      setErrors((prev) => {
        const { document, ...rest } = prev
        return rest
      })
    }
  }

  if (submitted) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-12 text-center">
        <div className="mb-6 flex justify-center">
          <div className="rounded-full bg-primary/10 p-6">
            <CheckCircle2 className="h-16 w-16 text-primary" />
          </div>
        </div>
        <h2 className="font-heading text-3xl font-bold text-foreground mb-2">
          Application Submitted Successfully!
        </h2>
        <p className="text-muted-foreground mb-6">
          Your {type === 'birth' ? 'birth' : 'marriage'} certificate application has been received.
          We&apos;ll send you updates to {applicationData.email || applicationData.parentEmail} as we process your
          request.
        </p>
        <div className="space-y-2 bg-secondary rounded-lg p-6 mb-8">
          <p className="text-sm text-muted-foreground">
            <strong>Application Reference Number:</strong>
          </p>
          <p className="font-mono text-lg text-primary">
            {applicationId}
          </p>
        </div>
        <button
          onClick={() => window.location.href = '/'}
          className="inline-block rounded-lg bg-primary px-8 py-3 font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          Return to Home
        </button>
      </div>
    )
  }

  const step = steps[currentStep]

  return (
    <div className="mx-auto max-w-2xl px-6 py-8">
      {/* Progress Indicator */}
      <div className="mb-12">
        <div className="mb-4 flex items-center justify-between">
          {steps.map((s, idx) => (
            <div key={s.id} className="flex flex-col items-center flex-1">
              <div
                className={`mb-2 flex h-10 w-10 items-center justify-center rounded-full border-2 transition-colors ${
                  idx < currentStep
                    ? 'border-primary bg-primary text-primary-foreground'
                    : idx === currentStep
                    ? 'border-primary bg-background text-primary'
                    : 'border-border bg-background text-muted-foreground'
                }`}
              >
                {idx < currentStep ? <CheckCircle2 className="h-5 w-5" /> : idx + 1}
              </div>
              <span className="text-center text-xs font-medium text-foreground hidden sm:block">
                {s.title}
              </span>
            </div>
          ))}
        </div>
        <div className="h-1 bg-border rounded-full overflow-hidden">
          <div
            className="h-full bg-primary transition-all"
            style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Step Content */}
      <div className="mb-12">
        <h2 className="font-heading text-2xl font-bold text-foreground mb-2">{step.title}</h2>
        <p className="text-muted-foreground mb-8">{step.description}</p>

        <div className="space-y-6">
          {/* Birth - New Registration */}
          {step.id === 'child' && type === 'birth' && subtype === 'new' && (
            <>
              <FormInput
                label="Child First Name"
                id="childFirstName"
                value={applicationData.childFirstName || ''}
                onChange={(val) => handleInputChange('childFirstName', val)}
                required
                error={errors.childFirstName}
              />
              <FormDatePicker
                label="Date of Birth"
                id="childDateOfBirth"
                value={applicationData.childDateOfBirth || ''}
                onChange={(val) => handleInputChange('childDateOfBirth', val)}
                required
                maxDate={new Date().toISOString().split('T')[0]}
                error={errors.childDateOfBirth}
              />
              <FormInput
                label="Place of Birth (City, State)"
                id="placeOfBirth"
                value={applicationData.placeOfBirth || ''}
                onChange={(val) => handleInputChange('placeOfBirth', val)}
                required
                error={errors.placeOfBirth}
              />
              <FormSelect
                label="Gender"
                id="childGender"
                options={[
                  { value: 'male', label: 'Male' },
                  { value: 'female', label: 'Female' },
                  { value: 'other', label: 'Other' },
                ]}
                value={applicationData.childGender || ''}
                onChange={(val) => handleInputChange('childGender', val)}
              />
            </>
          )}

          {step.id === 'father' && type === 'birth' && subtype === 'new' && (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <FormInput
                  label="Father First Name"
                  id="fatherFirstName"
                  value={applicationData.fatherFirstName || ''}
                  onChange={(val) => handleInputChange('fatherFirstName', val)}
                  required
                  error={errors.fatherFirstName}
                />
                <FormInput
                  label="Father Last Name"
                  id="fatherLastName"
                  value={applicationData.fatherLastName || ''}
                  onChange={(val) => handleInputChange('fatherLastName', val)}
                  required
                  error={errors.fatherLastName}
                />
              </div>
              <FormDatePicker
                label="Date of Birth"
                id="fatherDateOfBirth"
                value={applicationData.fatherDateOfBirth || ''}
                onChange={(val) => handleInputChange('fatherDateOfBirth', val)}
                required
                maxDate={new Date().toISOString().split('T')[0]}
                error={errors.fatherDateOfBirth}
              />
              <FormInput
                label="Email Address"
                id="fatherEmail"
                type="email"
                value={applicationData.fatherEmail || ''}
                onChange={(val) => handleInputChange('fatherEmail', val)}
              />
              <FormInput
                label="Phone Number"
                id="fatherPhone"
                type="tel"
                value={applicationData.fatherPhone || ''}
                onChange={(val) => handleInputChange('fatherPhone', val)}
              />
              <FormInput
                label="Place of Birth (City, State)"
                id="fatherPlaceOfBirth"
                value={applicationData.fatherPlaceOfBirth || ''}
                onChange={(val) => handleInputChange('fatherPlaceOfBirth', val)}
                required
                error={errors.fatherPlaceOfBirth}
              />
              <FormInput
                label="Residence"
                id="fatherResidence"
                value={applicationData.fatherResidence || ''}
                onChange={(val) => handleInputChange('fatherResidence', val)}
                required
                error={errors.fatherResidence}
              />
              <FormInput
                label="Occupation"
                id="fatherOccupation"
                value={applicationData.fatherOccupation || ''}
                onChange={(val) => handleInputChange('fatherOccupation', val)}
                required
                error={errors.fatherOccupation}
              />
              <FormInput
                label="Nationality"
                id="fatherNationality"
                value={applicationData.fatherNationality || ''}
                onChange={(val) => handleInputChange('fatherNationality', val)}
                required
                error={errors.fatherNationality}
              />
            </>
          )}

          {step.id === 'mother' && type === 'birth' && subtype === 'new' && (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <FormInput
                  label="Mother First Name"
                  id="motherFirstName"
                  value={applicationData.motherFirstName || ''}
                  onChange={(val) => handleInputChange('motherFirstName', val)}
                  required
                  error={errors.motherFirstName}
                />
                <FormInput
                  label="Mother Last Name"
                  id="motherLastName"
                  value={applicationData.motherLastName || ''}
                  onChange={(val) => handleInputChange('motherLastName', val)}
                  required
                  error={errors.motherLastName}
                />
              </div>
              <FormDatePicker
                label="Date of Birth"
                id="motherDateOfBirth"
                value={applicationData.motherDateOfBirth || ''}
                onChange={(val) => handleInputChange('motherDateOfBirth', val)}
                required
                maxDate={new Date().toISOString().split('T')[0]}
                error={errors.motherDateOfBirth}
              />
              <FormInput
                label="Email Address"
                id="motherEmail"
                type="email"
                value={applicationData.motherEmail || ''}
                onChange={(val) => handleInputChange('motherEmail', val)}
              />
              <FormInput
                label="Phone Number"
                id="motherPhone"
                type="tel"
                value={applicationData.motherPhone || ''}
                onChange={(val) => handleInputChange('motherPhone', val)}
              />
              <FormInput
                label="Place of Birth (City, State)"
                id="motherPlaceOfBirth"
                value={applicationData.motherPlaceOfBirth || ''}
                onChange={(val) => handleInputChange('motherPlaceOfBirth', val)}
                required
                error={errors.motherPlaceOfBirth}
              />
              <FormInput
                label="Residence"
                id="motherResidence"
                value={applicationData.motherResidence || ''}
                onChange={(val) => handleInputChange('motherResidence', val)}
                required
                error={errors.motherResidence}
              />
              <FormInput
                label="Occupation"
                id="motherOccupation"
                value={applicationData.motherOccupation || ''}
                onChange={(val) => handleInputChange('motherOccupation', val)}
                required
                error={errors.motherOccupation}
              />
              <FormInput
                label="Nationality"
                id="motherNationality"
                value={applicationData.motherNationality || ''}
                onChange={(val) => handleInputChange('motherNationality', val)}
                required
                error={errors.motherNationality}
              />
            </>
          )}

          {step.id === 'documents' && type === 'birth' && subtype === 'new' && (
            <>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-foreground">
                    Birth Attestation or Supporting Document
                  </label>
                  <span className="text-xs text-muted-foreground">PDF, JPG, JPEG, PNG</span>
                </div>
                <div
                  className={`rounded-lg border border-dashed px-4 py-10 text-center transition-colors ${
                    errors.document
                      ? 'border-destructive bg-destructive/10'
                      : 'border-border bg-input'
                  }`}
                >
                  <div className="flex flex-col items-center justify-center gap-2">
                    {documentFile ? (
                      <>
                        <p className="text-sm font-semibold text-foreground">
                          {documentFile.name}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Use the button below to replace the selected file
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="text-sm font-semibold text-foreground">
                          Upload the required document
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Select a file using the button below
                        </p>
                      </>
                    )}
                  </div>
                  <div className="mt-6">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="rounded-lg bg-primary px-5 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
                    >
                      {documentFile ? 'Replace file' : 'Choose file'}
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      className="hidden"
                      onChange={(e) => handleDocumentChange(e.target.files?.[0] ?? null)}
                    />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {documentFile ? documentFile.name : 'No file selected yet.'}
                  </p>
                </div>
                {errors.document && (
                  <p className="text-xs text-destructive">{errors.document}</p>
                )}
              </div>
            </>
          )}

          {step.id === 'personal' && type === 'birth' && subtype === 'copy' && (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <FormInput
                  label="First Name"
                  id="firstName"
                  value={applicationData.firstName || ''}
                  onChange={(val) => handleInputChange('firstName', val)}
                  required
                  error={errors.firstName}
                />
                <FormInput
                  label="Last Name"
                  id="lastName"
                  value={applicationData.lastName || ''}
                  onChange={(val) => handleInputChange('lastName', val)}
                  required
                  error={errors.lastName}
                />
              </div>
              <FormInput
                label="Email Address"
                id="email"
                type="email"
                value={applicationData.email || ''}
                onChange={(val) => handleInputChange('email', val)}
                required
                error={errors.email}
              />
              <FormInput
                label="Phone Number"
                id="phone"
                type="tel"
                value={applicationData.phone || ''}
                onChange={(val) => handleInputChange('phone', val)}
              />
            </>
          )}

          {step.id === 'childInfo' && type === 'birth' && subtype === 'copy' && (
            <>
              <FormInput
                label="Child First Name"
                id="childName"
                value={applicationData.childName || ''}
                onChange={(val) => handleInputChange('childName', val)}
                required
              />
              <FormDatePicker
                label="Date of Birth"
                id="childBirthDate"
                value={applicationData.childBirthDate || ''}
                onChange={(val) => handleInputChange('childBirthDate', val)}
                required
                maxDate={new Date().toISOString().split('T')[0]}
              />
              <FormSelect
                label="Number of Copies"
                id="numCopies"
                options={[
                  { value: '1', label: '1 Copy - $25' },
                  { value: '2', label: '2 Copies - $30' },
                  { value: '5', label: '5 Copies - $50' },
                  { value: '10', label: '10 Copies - $85' },
                ]}
                value={applicationData.numCopies || '1'}
                onChange={(val) => handleInputChange('numCopies', val)}
                required
              />
            </>
          )}

          {step.id === 'personal1' && type === 'marriage' && subtype === 'new' && (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <FormInput
                  label="First Name"
                  id="spouse1FirstName"
                  value={applicationData.spouse1FirstName || ''}
                  onChange={(val) => handleInputChange('spouse1FirstName', val)}
                  required
                  error={errors.spouse1FirstName}
                />
                <FormInput
                  label="Last Name"
                  id="spouse1LastName"
                  value={applicationData.spouse1LastName || ''}
                  onChange={(val) => handleInputChange('spouse1LastName', val)}
                  required
                  error={errors.spouse1LastName}
                />
              </div>
              <FormDatePicker
                label="Date of Birth"
                id="spouse1DOB"
                value={applicationData.spouse1DOB || ''}
                onChange={(val) => handleInputChange('spouse1DOB', val)}
              />
              <FormInput
                label="Email Address"
                id="spouse1Email"
                type="email"
                value={applicationData.spouse1Email || ''}
                onChange={(val) => handleInputChange('spouse1Email', val)}
              />
            </>
          )}

          {step.id === 'personal2' && type === 'marriage' && subtype === 'new' && (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <FormInput
                  label="First Name"
                  id="spouse2FirstName"
                  value={applicationData.spouse2FirstName || ''}
                  onChange={(val) => handleInputChange('spouse2FirstName', val)}
                  required
                  error={errors.spouse2FirstName}
                />
                <FormInput
                  label="Last Name"
                  id="spouse2LastName"
                  value={applicationData.spouse2LastName || ''}
                  onChange={(val) => handleInputChange('spouse2LastName', val)}
                  required
                  error={errors.spouse2LastName}
                />
              </div>
              <FormDatePicker
                label="Date of Birth"
                id="spouse2DOB"
                value={applicationData.spouse2DOB || ''}
                onChange={(val) => handleInputChange('spouse2DOB', val)}
              />
              <FormInput
                label="Email Address"
                id="spouse2Email"
                type="email"
                value={applicationData.spouse2Email || ''}
                onChange={(val) => handleInputChange('spouse2Email', val)}
              />
            </>
          )}

          {step.id === 'marriage' && type === 'marriage' && subtype === 'new' && (
            <>
              <FormDatePicker
                label="Date of Marriage"
                id="marriageDate"
                value={applicationData.marriageDate || ''}
                onChange={(val) => handleInputChange('marriageDate', val)}
                required
                maxDate={new Date().toISOString().split('T')[0]}
                error={errors.marriageDate}
              />
              <FormInput
                label="Place of Marriage (City, State)"
                id="marriagePlace"
                value={applicationData.marriagePlace || ''}
                onChange={(val) => handleInputChange('marriagePlace', val)}
                required
                error={errors.marriagePlace}
              />
              <FormSelect
                label="Officiant Type"
                id="officiantType"
                options={[
                  { value: 'clergy', label: 'Clergy' },
                  { value: 'judge', label: 'Judge' },
                  { value: 'notary', label: 'Notary Public' },
                  { value: 'other', label: 'Other' },
                ]}
                value={applicationData.officiantType || ''}
                onChange={(val) => handleInputChange('officiantType', val)}
              />
            </>
          )}

          {step.id === 'personal' && type === 'marriage' && subtype === 'copy' && (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <FormInput
                  label="First Name"
                  id="firstName"
                  value={applicationData.firstName || ''}
                  onChange={(val) => handleInputChange('firstName', val)}
                  required
                  error={errors.firstName}
                />
                <FormInput
                  label="Last Name"
                  id="lastName"
                  value={applicationData.lastName || ''}
                  onChange={(val) => handleInputChange('lastName', val)}
                  required
                  error={errors.lastName}
                />
              </div>
              <FormInput
                label="Email Address"
                id="email"
                type="email"
                value={applicationData.email || ''}
                onChange={(val) => handleInputChange('email', val)}
                required
                error={errors.email}
              />
            </>
          )}

          {step.id === 'marriageInfo' && type === 'marriage' && subtype === 'copy' && (
            <>
              <FormInput
                label="Spouse Name (if applicable)"
                id="spouseName"
                value={applicationData.spouseName || ''}
                onChange={(val) => handleInputChange('spouseName', val)}
              />
              <FormDatePicker
                label="Date of Marriage"
                id="marriageDate"
                value={applicationData.marriageDate || ''}
                onChange={(val) => handleInputChange('marriageDate', val)}
              />
              <FormSelect
                label="Number of Copies"
                id="numCopies"
                options={[
                  { value: '1', label: '1 Copy - $30' },
                  { value: '2', label: '2 Copies - $38' },
                  { value: '5', label: '5 Copies - $65' },
                  { value: '10', label: '10 Copies - $110' },
                ]}
                value={applicationData.numCopies || '1'}
                onChange={(val) => handleInputChange('numCopies', val)}
                required
              />
            </>
          )}

          {step.id === 'delivery' && (
            <FormSelect
              label="Delivery Method"
              id="deliveryMethod"
              options={[
                { value: 'email', label: 'Email (Digital Copy) - Free' },
                { value: 'standard', label: 'Standard Mail - $5' },
                { value: 'express', label: 'Express Mail - $15' },
              ]}
              value={applicationData.deliveryMethod || 'email'}
              onChange={(val) => handleInputChange('deliveryMethod', val)}
              required
            />
          )}

          {step.id === 'review' && (
            <>
              <div className="space-y-4 rounded-lg border border-border bg-card p-6">
                <h3 className="font-semibold text-foreground">Application Review</h3>
                <div className="space-y-4 text-sm">
                  <div className="rounded-lg bg-secondary/50 p-4">
                    <p className="text-muted-foreground text-xs uppercase tracking-[0.15em]">Application</p>
                    <p className="mt-2 text-foreground"><strong>Type:</strong> {type} - {subtype}</p>
                    <p className="text-foreground"><strong>Delivery Method:</strong> {applicationData.deliveryMethod || 'N/A'}</p>
                    <p className="text-foreground"><strong>Document:</strong> {documentFile ? documentFile.name : 'No file selected'}</p>
                  </div>

                  {type === 'birth' && subtype === 'new' ? (
                    <>
                      <div className="rounded-lg bg-secondary/50 p-4">
                        <p className="text-muted-foreground text-xs uppercase tracking-[0.15em]">Child Information</p>
                        <p className="mt-2 text-foreground"><strong>First Name:</strong> {applicationData.childFirstName || '—'}</p>
                        <p className="text-foreground"><strong>Date of Birth:</strong> {applicationData.childDateOfBirth || '—'}</p>
                        <p className="text-foreground"><strong>Place of Birth:</strong> {applicationData.placeOfBirth || '—'}</p>
                        <p className="text-foreground"><strong>Gender:</strong> {applicationData.childGender || '—'}</p>
                      </div>
                      <div className="rounded-lg bg-secondary/50 p-4">
                        <p className="text-muted-foreground text-xs uppercase tracking-[0.15em]">Father Information</p>
                        <p className="mt-2 text-foreground"><strong>First Name:</strong> {applicationData.fatherFirstName || '—'}</p>
                        <p className="text-foreground"><strong>Last Name:</strong> {applicationData.fatherLastName || '—'}</p>
                        <p className="text-foreground"><strong>Date of Birth:</strong> {applicationData.fatherDateOfBirth || '—'}</p>
                        <p className="text-foreground"><strong>Place of Birth:</strong> {applicationData.fatherPlaceOfBirth || '—'}</p>
                        <p className="text-foreground"><strong>Residence:</strong> {applicationData.fatherResidence || '—'}</p>
                        <p className="text-foreground"><strong>Occupation:</strong> {applicationData.fatherOccupation || '—'}</p>
                        <p className="text-foreground"><strong>Nationality:</strong> {applicationData.fatherNationality || '—'}</p>
                      </div>
                      <div className="rounded-lg bg-secondary/50 p-4">
                        <p className="text-muted-foreground text-xs uppercase tracking-[0.15em]">Mother Information</p>
                        <p className="mt-2 text-foreground"><strong>First Name:</strong> {applicationData.motherFirstName || '—'}</p>
                        <p className="text-foreground"><strong>Last Name:</strong> {applicationData.motherLastName || '—'}</p>
                        <p className="text-foreground"><strong>Date of Birth:</strong> {applicationData.motherDateOfBirth || '—'}</p>
                        <p className="text-foreground"><strong>Place of Birth:</strong> {applicationData.motherPlaceOfBirth || '—'}</p>
                        <p className="text-foreground"><strong>Residence:</strong> {applicationData.motherResidence || '—'}</p>
                        <p className="text-foreground"><strong>Occupation:</strong> {applicationData.motherOccupation || '—'}</p>
                        <p className="text-foreground"><strong>Nationality:</strong> {applicationData.motherNationality || '—'}</p>
                      </div>
                    </>
                  ) : type === 'birth' && subtype === 'copy' ? (
                    <>
                      <div className="rounded-lg bg-secondary/50 p-4">
                        <p className="text-muted-foreground text-xs uppercase tracking-[0.15em]">Applicant Information</p>
                        <p className="mt-2 text-foreground"><strong>Name:</strong> {applicationData.firstName || '—'} {applicationData.lastName || ''}</p>
                        <p className="text-foreground"><strong>Email:</strong> {applicationData.email || '—'}</p>
                      </div>
                      <div className="rounded-lg bg-secondary/50 p-4">
                        <p className="text-muted-foreground text-xs uppercase tracking-[0.15em]">Birth Information</p>
                        <p className="mt-2 text-foreground"><strong>Child Name:</strong> {applicationData.childName || '—'}</p>
                        <p className="text-foreground"><strong>Date of Birth:</strong> {applicationData.childBirthDate || '—'}</p>
                        <p className="text-foreground"><strong>Copies:</strong> {applicationData.numCopies || '1'}</p>
                      </div>
                    </>
                  ) : type === 'marriage' && subtype === 'new' ? (
                    <>
                      <div className="rounded-lg bg-secondary/50 p-4">
                        <p className="text-muted-foreground text-xs uppercase tracking-[0.15em]">First Party</p>
                        <p className="mt-2 text-foreground"><strong>Name:</strong> {applicationData.spouse1FirstName || '—'} {applicationData.spouse1LastName || ''}</p>
                        <p className="text-foreground"><strong>Date of Birth:</strong> {applicationData.spouse1DOB || '—'}</p>
                        <p className="text-foreground"><strong>Email:</strong> {applicationData.spouse1Email || '—'}</p>
                      </div>
                      <div className="rounded-lg bg-secondary/50 p-4">
                        <p className="text-muted-foreground text-xs uppercase tracking-[0.15em]">Second Party</p>
                        <p className="mt-2 text-foreground"><strong>Name:</strong> {applicationData.spouse2FirstName || '—'} {applicationData.spouse2LastName || ''}</p>
                        <p className="text-foreground"><strong>Date of Birth:</strong> {applicationData.spouse2DOB || '—'}</p>
                        <p className="text-foreground"><strong>Email:</strong> {applicationData.spouse2Email || '—'}</p>
                      </div>
                      <div className="rounded-lg bg-secondary/50 p-4">
                        <p className="text-muted-foreground text-xs uppercase tracking-[0.15em]">Marriage Details</p>
                        <p className="mt-2 text-foreground"><strong>Date of Marriage:</strong> {applicationData.marriageDate || '—'}</p>
                        <p className="text-foreground"><strong>Place of Marriage:</strong> {applicationData.marriagePlace || '—'}</p>
                        <p className="text-foreground"><strong>Officiant Type:</strong> {applicationData.officiantType || '—'}</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="rounded-lg bg-secondary/50 p-4">
                        <p className="text-muted-foreground text-xs uppercase tracking-[0.15em]">Applicant Information</p>
                        <p className="mt-2 text-foreground"><strong>Name:</strong> {applicationData.firstName || '—'} {applicationData.lastName || ''}</p>
                        <p className="text-foreground"><strong>Email:</strong> {applicationData.email || '—'}</p>
                      </div>
                      <div className="rounded-lg bg-secondary/50 p-4">
                        <p className="text-muted-foreground text-xs uppercase tracking-[0.15em]">Marriage Information</p>
                        <p className="mt-2 text-foreground"><strong>Spouse Name:</strong> {applicationData.spouseName || '—'}</p>
                        <p className="text-foreground"><strong>Date of Marriage:</strong> {applicationData.marriageDate || '—'}</p>
                        <p className="text-foreground"><strong>Copies:</strong> {applicationData.numCopies || '1'}</p>
                      </div>
                    </>
                  )}
                </div>
              </div>

              <FormCheckbox
                id="terms"
                label={
                  <>
                    I agree to the{' '}
                    <button className="text-primary hover:underline">Terms & Conditions</button> and{' '}
                    <button className="text-primary hover:underline">Privacy Policy</button>
                  </>
                }
                checked={termsAccepted}
                onChange={setTermsAccepted}
                error={errors.terms}
              />
            </>
          )}
        </div>
      </div>

      {submitError && (
        <p role="alert" className="mb-4 rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {submitError}
        </p>
      )}

      {/* Navigation Buttons */}
      <div className="flex gap-4">
        <button
          onClick={handlePrevious}
          disabled={currentStep === 0 || submitting}
          className="flex items-center gap-2 rounded-lg border border-border px-6 py-3 font-medium text-foreground hover:bg-secondary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ChevronLeft className="h-4 w-4" />
          Previous
        </button>

        <div className="flex-1" />

        {currentStep === steps.length - 1 ? (
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="flex items-center gap-2 rounded-lg bg-primary px-6 py-3 font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploading ? 'Uploading document...' : submitting ? 'Submitting...' : 'Submit Application'}
            <CheckCircle2 className="h-4 w-4" />
          </button>
        ) : (
          <button
            onClick={handleNext}
            className="flex items-center gap-2 rounded-lg bg-primary px-6 py-3 font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  )
}
