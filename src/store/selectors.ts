import { createSelector } from '@reduxjs/toolkit'
import type { RootState } from '@/store'

export const selectCandidates = (s: RootState) => s.candidates
export const selectInterviews = (s: RootState) => s.interviews
export const selectDashboard = (s: RootState) => s.dashboard

export const orderedCandidatesByScoreThenDate = createSelector(
  [selectCandidates, selectInterviews, selectDashboard],
  (candidates, interviews, dashboard) => {
    const entries = candidates.order.map(id => {
      const profile = candidates.byId[id]
      const interview = interviews[id]
      const score = interview?.summary?.score ?? -1
      const date = interview?.answers[0]?.submittedAt || interview?.answers[0]?.startedAt || ''
      return { id, profile, score, date }
    })
    const filtered = entries.filter(e =>
      dashboard.search
        ? e.profile.name.toLowerCase().includes(dashboard.search.toLowerCase())
        : true
    )
    const dir = dashboard.sortDir === 'asc' ? 1 : -1
    const sorted = filtered.sort((a, b) => {
      if (dashboard.sortBy === 'score') return (a.score - b.score) * dir
      if (dashboard.sortBy === 'name') return a.profile.name.localeCompare(b.profile.name) * dir
      return (a.date < b.date ? -1 : a.date > b.date ? 1 : 0) * dir
    })
    return sorted.map(s => s.id)
  }
)

export const candidateInterviewView = (candidateId: string) =>
  createSelector([selectCandidates, selectInterviews], (candidates, interviews) => ({
    profile: candidates.byId[candidateId],
    interview: interviews[candidateId],
  }))

export const activeInterviewTimer = (candidateId: string) =>
  createSelector([selectInterviews], interviews => interviews[candidateId]?.timer)
