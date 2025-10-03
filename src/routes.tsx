import { createBrowserRouter, Navigate } from 'react-router-dom'
import { RootLayout } from '@/ui/RootLayout'
import { IntervieweePage } from '@/ui/pages/IntervieweePage'
import { InterviewerPage } from '@/ui/pages/InterviewerPage'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: [
      { index: true, element: <Navigate to="/interviewee" replace /> },
      { path: '/interviewee', element: <IntervieweePage /> },
      { path: '/interviewer', element: <InterviewerPage /> },
      { path: '/interviewer/:candidateId', element: <InterviewerPage /> },
    ],
  },
])
