// src/app/api/skills/route.ts
import { NextResponse } from 'next/server'

const mockSkills = [
  { name: 'Focus', level: 3, exp: 250 },
  { name: 'Planning', level: 2, exp: 100 },
]

export async function GET() {
  return NextResponse.json(mockSkills)
}
