const required = ['name', 'role', 'experience', 'goal', 'strengths', 'challenge'];

export async function generateReport(request) {
  try {
    let body;
    try {
      body = await request.json();
    } catch {
      return Response.json({ error: 'Please submit valid JSON.' }, { status: 400 });
    }

    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return Response.json({ error: 'Please submit a valid profile.' }, { status: 400 });
    }

    for (const field of required) {
      const validType = field === 'experience'
        ? typeof body[field] === 'string' || typeof body[field] === 'number'
        : typeof body[field] === 'string';
      if (!validType) {
        return Response.json({ error: `Invalid ${field}.` }, { status: 400 });
      }
      const value = String(body[field]).trim();
      const tooShort = field === 'experience' ? value.length < 1 : value.length < 2;
      if (tooShort) {
        return Response.json({ error: `Please provide ${field}.` }, { status: 400 });
      }
    }

    const input = Object.fromEntries(
      required.map((key) => [key, String(body[key]).trim().slice(0, 700)])
    );

    const experience = Number(input.experience);
    if (!Number.isFinite(experience) || experience < 0 || experience > 70) {
      return Response.json({ error: 'Years of experience must be a number between 0 and 70.' }, { status: 400 });
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return Response.json({
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
      }),
      signal: AbortSignal.timeout(25000)
    });

    if (!response.ok) {
      return Response.json({ error: 'AI provider request failed.' }, { status: 502 });
    }

    let data;
    try {
      data = await response.json();
    } catch {
      return Response.json({ error: 'AI provider returned invalid data.' }, { status: 502 });
    }
    if (!Array.isArray(data?.content)) {
      return Response.json({ error: 'AI provider returned invalid data.' }, { status: 502 });
    }
    const text = data.content
      .filter((block) => block?.type === 'text' && typeof block.text === 'string')
      .map((block) => block.text)
      .join('\n')
      .trim();

    if (!text) return Response.json({ error: 'AI returned an empty response.' }, { status: 502 });

    return Response.json({
      title: `${input.name}'s Career Growth Plan`,
      provider: 'Claude',
      report: text
    });
  } catch (error) {
    if (error?.name === 'TimeoutError' || error?.name === 'AbortError') {
      return Response.json({ error: 'AI provider request timed out.' }, { status: 504 });
    }
    if (error instanceof TypeError) {
      return Response.json({ error: 'AI provider request failed.' }, { status: 502 });
    }
    console.error('Report generation failed:', error?.name || 'Error');
    return Response.json({ error: 'Unexpected server error.' }, { status: 500 });
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

