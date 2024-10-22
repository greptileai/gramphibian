// src/app/api/generate-changelog/route.ts

import { NextResponse } from 'next/server';
import { GitHubDiffGenerator } from '@/lib/github-diff-generator';
function formatToMarkdown(content: string): string {
    let markdown = '';
    
    // Define section icons
    const sectionIcons: Record<string, string> = {
      'Breaking Changes': '⚠️',
      'Features': '✨',
      'Improvements': '🚀',
      'Bug Fixes': '🐛',
      'Security': '🔒',
      'Performance': '⚡',
      'Documentation': '📚',
      'Dependencies': '📦',
      'Refactor': '♻️',
      'Tests': '🧪',
      'Other': '📋'
    };
  
    // Define subsection icons for items starting with #
    const subsectionIcons: Record<string, string> = {
      'breaking': '⚠️',
      'feature': '✨',
      'feat': '✨',
      'improve': '🚀',
      'enhancement': '🚀',
      'fix': '🐛',
      'bug': '🐛',
      'security': '🔒',
      'perf': '⚡',
      'performance': '⚡',
      'doc': '📚',
      'docs': '📚',
      'dep': '📦',
      'deps': '📦',
      'dependencies': '📦',
      'refactor': '♻️',
      'test': '🧪',
      'tests': '🧪',
      'ci': '🔄',
      'build': '🛠️',
      'chore': '🧹',
      'style': '💅',
      'i18n': '🌐',
      'a11y': '♿',
      'accessibility': '♿',
      'ui': '🎨',
      'ux': '🎯'
    };
    
    // Split content into sections
    const sections = content.split(/\n(?=Features:|Improvements:|Bug Fixes:|Breaking Changes:|Security:|Performance:|Documentation:|Dependencies:|Refactor:|Tests:|Other:)/g);
    
    sections.forEach(section => {
      if (section.trim()) {
        // Extract section title and items
        const [title, ...items] = section.split('\n');
        const cleanTitle = title.trim();
        
        // Find matching icon for section
        let icon = '📋'; // Default icon
        for (const [keyTitle, keyIcon] of Object.entries(sectionIcons)) {
          if (cleanTitle.includes(keyTitle)) {
            icon = keyIcon;
            break;
          }
        }
        
        // Add section header with icon
        markdown += `## ${icon} ${cleanTitle}\n`;
        
        // Add items with proper Markdown list formatting
        items.forEach(item => {
          if (item.trim()) {
            const trimmedItem = item.trim();
            
            // Check if item starts with #
            if (trimmedItem.startsWith('#')) {
              // Remove all leading # characters and trim
              const cleanItem = trimmedItem.replace(/^#+\s*/, '');
              
              // Find matching icon for subsection
              let subsectionIcon = '📋'; // Default icon
              for (const [key, keyIcon] of Object.entries(subsectionIcons)) {
                if (cleanItem.toLowerCase().includes(key)) {
                  subsectionIcon = keyIcon;
                  break;
                }
              }
              
              // Add as a subsection with icon
              markdown += `### ${subsectionIcon} ${cleanItem}\n`;
            } else {
              // Handle normal list item
              const cleanItem = trimmedItem.replace(/^[•\-\*]\s*/, '');
              markdown += `- ${cleanItem}\n`;
            }
          }
        });
        
        markdown += '\n';
      }
    });
    
    return markdown.trim();
  }

export async function POST(request: Request) {
  try {
    const { repoUrl, startDate, endDate } = await request.json();

    // Validate inputs
    if (!repoUrl || !startDate || !endDate) {
      return NextResponse.json(
        { message: 'Missing required fields: repoUrl, startDate, and endDate are required' },
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

    // Generate the raw changelog
    const rawChangelog = await diffGenerator.generateChangelog(
      repoUrl,
      new Date(startDate),
      new Date(endDate)
    );

    // Format to markdown
    const markdownChangelog = formatToMarkdown(rawChangelog);

    // Log for debugging
    console.log('Generated changelog:', {
      repoUrl,
      startDate,
      endDate,
      length: markdownChangelog.length
    });

    return NextResponse.json({ 
      changelog: markdownChangelog,
      metadata: {
        generatedAt: new Date().toISOString(),
        repo: repoUrl,
        period: {
          start: startDate,
          end: endDate
        }
      }
    });

  } catch (error) {
    console.error('Error generating changelog:', error);

    // Determine if it's a GitHub API error
    if (error instanceof Error && error.message.includes('GitHub API')) {
      return NextResponse.json(
        { 
          message: error.message,
          type: 'github_api_error'
        },
        { status: 400 }
      );
    }

    // General error handling
    return NextResponse.json(
      { 
        message: error instanceof Error ? error.message : 'Failed to generate changelog',
        details: error instanceof Error ? error.stack : undefined,
        type: 'general_error'
      },
      { status: 500 }
    );
  }
}

// Helper function to validate GitHub URL
function isValidGitHubUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.hostname === 'github.com' && parsed.pathname.split('/').length >= 3;
  } catch {
    return false;
  }
}

// Helper function to validate date range
function isValidDateRange(startDate: string, endDate: string): boolean {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const now = new Date();

  return (
    start instanceof Date && !isNaN(start.getTime()) &&
    end instanceof Date && !isNaN(end.getTime()) &&
    start <= end &&
    end <= now
  );
}