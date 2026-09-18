import { NextResponse } from 'next/server';

const required = ['name', 'role', 'experience', 'goal', 'strengths', 'challenge'];

export async function POST(request) {
  try {
    const body = await request.json();

    for (const field of required) {
      if (!body[field] || String(body[field]).trim().length < 2) {
        return NextResponse.json({ error: `Please provide ${field}.` }, { status: 400 });
      }
    }

    const input = Object.fromEntries(
      required.map((key) => [key, String(body[key]).trim().slice(0, 700)])
    );

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({
        title: `${input.name}'s Career Growth Plan`,
        provider: 'Local demo fallback',
        report: fallbackReport(input)
      });
    }

    const prompt = `You are a pragmatic engineering career coach. Create a concise, useful report based only on the supplied profile.

<profile>
Name: ${input.name}
Current role: ${input.role}
Experience: ${input.experience} years
Goal: ${input.goal}
Strengths: ${input.strengths}
Biggest challenge: ${input.challenge}
</profile>

Return plain text using exactly these sections:
## Snapshot
2-3 sentences.
## Strongest Advantages
3 bullet points.
## Gaps To Close
3 bullet points.
## 30-Day Plan
4 bullet points with concrete actions.
## Next Move
2 sentences.

Be specific, practical, and avoid generic motivational language.`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: process.env.CLAUDE_MODEL || 'claude-sonnet-4-6',
        max_tokens: 900,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    const data = await response.json();
    if (!response.ok) {
      console.error('Anthropic API error:', data);
      return NextResponse.json({ error: 'AI provider request failed.' }, { status: 502 });
    }

    const text = (data.content || [])
      .filter((block) => block.type === 'text')
      .map((block) => block.text)
      .join('\n')
      .trim();

    if (!text) return NextResponse.json({ error: 'AI returned an empty response.' }, { status: 502 });

    return NextResponse.json({
      title: `${input.name}'s Career Growth Plan`,
      provider: 'Claude',
      report: text
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Unexpected server error.' }, { status: 500 });
  }
}

function fallbackReport(input) {
  return `## Snapshot
${input.name} is currently working as ${input.role} with ${input.experience} years of experience. The immediate goal is ${input.goal}

## Strongest Advantages
- Existing strengths in ${input.strengths}
- Practical experience that can be turned into demonstrable portfolio evidence
- A clear target, which makes it easier to prioritize learning instead of studying everything

## Gaps To Close
- Build stronger proof around: ${input.challenge}
- Convert existing experience into one well-documented end-to-end project
- Practice explaining architecture decisions, failures, and trade-offs clearly

## 30-Day Plan
- Week 1: define one focused project and write the architecture before coding
- Week 2: build the core backend/API flow and add input validation and error handling
- Week 3: finish the UI, deployment, logs, and production edge cases
- Week 4: write the README, architecture notes, and prepare a 3-minute walkthrough

## Next Move
Use one deployed project as proof of both engineering depth and ownership. Make the repository easy to inspect and be ready to explain one design decision you would change.`;
}
