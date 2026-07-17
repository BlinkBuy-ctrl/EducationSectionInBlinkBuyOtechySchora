import { bookshopSupabase as db } from '@/lib/bookshopSupabase'

export interface Bookshop {
  id: string
  owner_user_id: string | null
  name: string
  logo_url: string | null
  about: string | null
  location: string | null
  lat: number | null
  lng: number | null
  contact: string | null
  gallery: string[]
  social_links: Record<string, string>
  cert_url: string
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
}

export interface Book {
  id: string
  bookshop_id: string
  title: string
  author: string | null
  price: number
  cover_url: string | null
  stock: number
}

export interface Testimonial {
  id: string
  bookshop_id: string
  author_name: string
  message: string
  rating: number | null
  created_at: string
}

// ── Owner auth (Phase 2 — real Supabase Auth, handles email verification) ──
export async function signUpOwner(email: string, password: string) {
  const { data, error } = await db.auth.signUp({ email, password })
  if (error) throw error
  return data // confirmation email sent automatically by Supabase
}

export async function signInOwner(email: string, password: string) {
  const { data, error } = await db.auth.signInWithPassword({ email, password })
  if (error) throw error
  return data
}

export async function signOutOwner() {
  await db.auth.signOut()
}

export async function getOwnerSession() {
  const { data } = await db.auth.getSession()
  return data.session
}

export async function getMyBookshop(userId: string): Promise<Bookshop | null> {
  const { data, error } = await db.from('bookshops').select('*').eq('owner_user_id', userId).maybeSingle()
  if (error) throw error
  return data
}

// ── Public catalog ──
export async function getApprovedBookshops(): Promise<Bookshop[]> {
  const { data, error } = await db.from('bookshops').select('*').eq('status', 'approved').order('name')
  if (error) throw error
  return data ?? []
}

export async function getBooks(bookshopId: string): Promise<Book[]> {
  const { data, error } = await db.from('bookshop_books').select('*').eq('bookshop_id', bookshopId).order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function getTestimonials(bookshopId: string): Promise<Testimonial[]> {
  const { data, error } = await db.from('bookshop_testimonials').select('*').eq('bookshop_id', bookshopId).order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function addTestimonial(t: { bookshop_id: string; author_name: string; message: string; rating: number }) {
  const { error } = await db.from('bookshop_testimonials').insert(t)
  if (error) throw error
}

// ── Application (Phase 1 — anon apply; owner_user_id gets linked once they sign up in Phase 2) ──
export async function applyAsBookshop(input: {
  name: string; about: string; location: string; contact: string
  logoFile: File | null; certFile: File; ownerUserId?: string
}): Promise<Bookshop> {
  const stamp = Date.now()
  const certPath = `certs/${stamp}-${input.certFile.name}`
  const { error: certErr } = await db.storage.from('bookshop-assets').upload(certPath, input.certFile)
  if (certErr) throw certErr
  const cert_url = db.storage.from('bookshop-assets').getPublicUrl(certPath).data.publicUrl

  let logo_url: string | null = null
  if (input.logoFile) {
    const logoPath = `logos/${stamp}-${input.logoFile.name}`
    const { error: logoErr } = await db.storage.from('bookshop-assets').upload(logoPath, input.logoFile)
    if (logoErr) throw logoErr
    logo_url = db.storage.from('bookshop-assets').getPublicUrl(logoPath).data.publicUrl
  }

  const { data, error } = await db.from('bookshops').insert({
    name: input.name,
    about: input.about,
    location: input.location,
    contact: input.contact,
    logo_url,
    cert_url,
    owner_user_id: input.ownerUserId ?? null,
    status: 'pending',
  }).select().single()
  if (error) throw error
  return data
}

// ── Owner-managed shop details (Phase 2) ──
export async function updateMyBookshop(id: string, patch: Partial<Pick<Bookshop, 'about' | 'location' | 'contact' | 'gallery' | 'social_links'>>) {
  const { error } = await db.from('bookshops').update(patch).eq('id', id)
  if (error) throw error
}

// ── Admin ──
export async function getApplications(status: 'pending' | 'approved' | 'rejected' = 'pending'): Promise<Bookshop[]> {
  const { data, error } = await db.from('bookshops').select('*').eq('status', status).order('created_at')
  if (error) throw error
  return data ?? []
}

export async function reviewApplication(id: string, status: 'approved' | 'rejected') {
  const { error } = await db.from('bookshops').update({ status, reviewed_at: new Date().toISOString() }).eq('id', id)
  if (error) throw error
  if (status === 'approved') {
    fetch('/api/send-notification', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Shop approved! 🎉', body: 'Your bookshop is now live on SchoraHub.' }),
    }).catch(() => {})
  }
}

// ── Push ──
export async function subscribeToPush(anonId: string) {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return
  const reg = await navigator.serviceWorker.ready
  let sub = await reg.pushManager.getSubscription()
  if (!sub) {
    // TODO: replace with your generated VAPID public key
    const VAPID_PUBLIC_KEY = 'BGIoLhtHS59h97l8zrnMNnVKRM6gGcArrow9INvV8QGRz8Un7VJxUdOBo3bBkowsfmj86Lh4w2LK_xEzb2-xvOc'
    sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) })
  }
  const json = sub.toJSON()
  await db.from('bookshop_push_subscriptions').upsert(
    { anon_id: anonId, endpoint: json.endpoint!, p256dh: json.keys!.p256dh, auth: json.keys!.auth },
    { onConflict: 'endpoint' }
  )
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)))
}
