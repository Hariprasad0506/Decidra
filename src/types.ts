// A single product idea in the backlog.
// RICE scores are added in a later phase, so Phase 1 only stores descriptive details.
export interface Feature {
  id: string
  name: string
  description: string
  status: 'Idea' | 'Planned' | 'In progress'
}
