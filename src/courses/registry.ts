import { COMPOSITE_TEMPLATES } from './composite'
import type { Template } from './templates'
import { TEMPLATES as BASE } from './templates'

/** Every hole type: the 13 hand-authored families plus 200 composites. */
export const TEMPLATES: Record<string, Template> = { ...BASE }
for (const t of COMPOSITE_TEMPLATES) TEMPLATES[t.id] = t
