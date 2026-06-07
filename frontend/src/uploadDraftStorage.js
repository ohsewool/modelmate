const UPLOAD_DRAFT_KEY = 'mm_upload_draft'
const UPLOAD_DRAFT_TTL_MS = 2 * 60 * 60 * 1000

export function loadUploadDraft() {
  try {
    const raw = localStorage.getItem(UPLOAD_DRAFT_KEY) || sessionStorage.getItem(UPLOAD_DRAFT_KEY)
    if (!raw) return null
    const draft = JSON.parse(raw)
    if (!draft?.expiresAt || Date.now() > draft.expiresAt) {
      clearUploadDraft()
      return null
    }
    return draft
  } catch {
    clearUploadDraft()
    return null
  }
}

export function saveUploadDraft(data) {
  const draft = {
    ...data,
    savedAt: Date.now(),
    expiresAt: Date.now() + UPLOAD_DRAFT_TTL_MS,
  }
  const raw = JSON.stringify(draft)
  localStorage.setItem(UPLOAD_DRAFT_KEY, raw)
  sessionStorage.setItem(UPLOAD_DRAFT_KEY, raw)
}

export function clearUploadDraft() {
  localStorage.removeItem(UPLOAD_DRAFT_KEY)
  sessionStorage.removeItem(UPLOAD_DRAFT_KEY)
}
