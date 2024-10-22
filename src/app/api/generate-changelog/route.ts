import { NextResponse } from 'next/server';
import { GitHubDiffGenerator } from '@/lib/github-diff-generator';

export async function POST(request: Request) {
  try {
    const { repoUrl, startDate, endDate } = await request.json();

    // Validate inputs
    if (!repoUrl || !startDate || !endDate) {
      return NextResponse.json(
        { message: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Initialize the GitHub diff generator
    const githubToken = process.env.GITHUB_PAT;
    if (!githubToken) {
      return NextResponse.json(
        { message: 'GitHub token not configured' },
        { status: 500 }
      );
    }

    const diffGenerator = new GitHubDiffGenerator(githubToken);

    // Generate the changelog
    const changelog = await diffGenerator.generateChangelog(
      repoUrl,
      new Date(startDate),
      new Date(endDate)
    );

    return NextResponse.json({ changelog });
  } catch (error) {
    console.error('Error generating changelog:', error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Failed to generate changelog' },
      { status: 500 }
    );
  }
}