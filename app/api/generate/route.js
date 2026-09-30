import { generateReport } from '../../../lib/generate-report.mjs';

export async function POST(request) {
  return generateReport(request);
}
