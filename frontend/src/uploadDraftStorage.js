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

export function uploadDraftDatasetId(draft) {
  const info = draft?.uploadInfo || draft || {}
  return String(
    info?.dataset_id ||
    info?.saved_dataset?.id ||
    info?.saved_dataset?.dataset_id ||
    info?.current_dataset?.id ||
    info?.current_dataset?.dataset_id ||
    '',
  )
}

export function uploadDraftColumnSignature(draft) {
  const info = draft?.uploadInfo || draft || {}
  const columns = Array.isArray(info?.columns) ? info.columns : []
  return columns.map(String).join('\u001f')
}

export function uploadDraftMatchesState(draft, state) {
  if (!draft) return false
  if (!state?.has_data) return false

  const draftDatasetId = uploadDraftDatasetId(draft)
  const stateDatasetId = String(
    state?.current_dataset?.id ||
    state?.current_dataset?.dataset_id ||
    state?.dataset_id ||
    '',
  )
  if (draftDatasetId && stateDatasetId && draftDatasetId !== stateDatasetId) return false

  const draftColumns = uploadDraftColumnSignature(draft)
  const stateColumns = Array.isArray(state?.columns) ? state.columns.map(String).join('\u001f') : ''
  if (draftColumns && stateColumns && draftColumns !== stateColumns) return false

  return true
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
