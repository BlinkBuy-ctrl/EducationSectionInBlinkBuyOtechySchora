import type { SupabaseClient } from '@supabase/supabase-js'
import { msceResourcesSupabase } from '@/lib/msceResourcesSupabase'
import { jceResourcesSupabase } from '@/lib/jceResourcesSupabase'
import { primaryResourcesSupabase } from '@/lib/primaryResourcesSupabase'

export const EDUCATION_LEVELS = ['MSCE', 'JCE', 'Primary'] as const
export type EducationLevel = typeof EDUCATION_LEVELS[number]

// Subject lists per level. "Other" is always included so an uploader whose
// subject isn't listed still has somewhere to tag it.
export const SUBJECTS_BY_LEVEL: Record<EducationLevel, string[]> = {
  MSCE: [
    'English', 'Chichewa', 'Mathematics', 'Additional Mathematics', 'Biology',
    'Physical Science', 'Geography', 'History', 'Agriculture',
    'Bible Knowledge', 'Social Studies', 'Life Skills', 'Other',
  ],
  JCE: [
    'English', 'Chichewa', 'Mathematics', 'Biology', 'Physical Science',
    'Geography', 'History', 'Agriculture', 'Bible Knowledge', 'Life Skills', 'Other',
  ],
  Primary: [
    'English', 'Chichewa', 'Mathematics', 'Science & Technology',
    'Social Studies', 'Life Skills', 'Bible Knowledge', 'Agriculture',
    'Expressive Arts', 'Other',
  ],
}

// Each level is its own separate Supabase project — this is the single
// place that maps a level to its client, so every component that needs to
// read/write resources for a given level goes through here instead of
// hardcoding which client to use.
export function resourcesClientForLevel(level: EducationLevel): SupabaseClient {
  if (level === 'MSCE') return msceResourcesSupabase
  if (level === 'JCE') return jceResourcesSupabase
  return primaryResourcesSupabase
}
