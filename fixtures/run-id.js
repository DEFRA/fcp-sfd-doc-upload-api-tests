import { randomUUID } from 'node:crypto'

// Distinguishes this run's test data from earlier runs on the shared test SBI.
export const RUN_ID = randomUUID().slice(0, 8)
