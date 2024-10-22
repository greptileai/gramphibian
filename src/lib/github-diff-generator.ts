import axios from 'axios';
import { format } from 'date-fns';
import winston from 'winston';
import path from 'path';
import OpenAI from 'openai';

// Configure logger
const logger = winston.createLogger({
  level: 'debug',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ 
      filename: path.join(process.cwd(), 'logs', 'changelog-debug.log')
    }),
    new winston.transports.File({ 
      filename: path.join(process.cwd(), 'logs', 'changelog-error.log'), 
      level: 'error' 
    })
  ]
});

// Also log to console in development
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}

// Constants for GitHub API limits
const MAX_PER_PAGE = 100;
const MAX_TOTAL_COMMITS = 3000;

// LLM Constants
const MAX_TOKENS = 6000;
const CHARS_PER_TOKEN = 4;
const MAX_DIFF_LENGTH = MAX_TOKENS * CHARS_PER_TOKEN;

interface CommitFile {
  filename: string;
  patch?: string;
}

interface CommitData {
  stats: {
    additions: number;
    deletions: number;
    total: number;
  };
  files: CommitFile[];
  commit: {
    message: string;
    author: {
      date: string;
    };
  };
  sha: string;
}

interface DiffSummary {
  additions: number;
  deletions: number;
  netDiff: number;
  diffs: string[];
  totalCommits: number;
  hasMore: boolean;
  period: {
    start: Date;
    end: Date;
  };
}

type LLMProvider = 'none' | 'greptile' | 'openai';

export class GitHubDiffGenerator {
  private githubToken: string;
  private apiBaseUrl = 'https://api.github.com';
  private llmProvider: LLMProvider;
  private openai: OpenAI | null = null;

  constructor(githubToken: string) {
    this.githubToken = githubToken;
    
    if (process.env.ENABLE_OPENAI === 'true') {
      this.llmProvider = 'openai';
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
      });
    } else if (process.env.ENABLE_GREPTILE === 'true') {
      this.llmProvider = 'greptile';
    } else {
      this.llmProvider = 'none';
    }

    logger.info('GitHubDiffGenerator initialized', { 
      tokenLength: githubToken.length,
      llmProvider: this.llmProvider
    });
  }

  private getAxiosConfig() {
    return {
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'Authorization': `token ${this.githubToken}`,
      },
    };
  }

  private parseGitHubUrl(repoUrl: string): { owner: string; repo: string } {
    logger.debug('Parsing GitHub URL', { repoUrl });
    const parts = repoUrl.replace('https://github.com/', '').split('/');
    const result = {
      owner: parts[parts.length - 2],
      repo: parts[parts.length - 1].replace('.git', ''),
    };
    logger.debug('Parsed GitHub URL', result);
    return result;
  }

  private async getAllCommits(owner: string, repo: string, startDate: Date, endDate: Date): Promise<CommitData[]> {
    let page = 1;
    let allCommits: CommitData[] = [];
    let hasMore = true;

    while (hasMore && allCommits.length < MAX_TOTAL_COMMITS) {
      const response = await axios.get(`${this.apiBaseUrl}/repos/${owner}/${repo}/commits`, {
        ...this.getAxiosConfig(),
        params: {
          since: format(startDate, "yyyy-MM-dd'T'HH:mm:ss'Z'"),
          until: format(endDate, "yyyy-MM-dd'T'HH:mm:ss'Z'"),
          per_page: MAX_PER_PAGE,
          page: page
        },
      });

      // Get detailed commit data for each commit
      const commitDetails = await Promise.all(
        response.data.map((commit: any) => 
          axios.get(commit.url, this.getAxiosConfig())
            .then(res => res.data)
        )
      );

      allCommits = [...allCommits, ...commitDetails];

      // Check if there are more pages
      const linkHeader = response.headers.link;
      hasMore = linkHeader?.includes('rel="next"') ?? false;
      page++;

      // Add a small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));

      logger.info(`Fetched page ${page-1}, total commits: ${allCommits.length}`);
    }

    return allCommits;
  }

  private truncateDiffs(diffs: string[]): string {
    const fullText = diffs.join('\n\n');
    
    if (fullText.length <= MAX_DIFF_LENGTH) {
      return fullText;
    }

    logger.info('Truncating diff text', {
      originalLength: fullText.length,
      maxLength: MAX_DIFF_LENGTH,
      diffCount: diffs.length
    });

    // Strategy: Keep the first part of each commit's diff to preserve context
    const truncatedDiffs = diffs.map(diff => {
      const sections = diff.split('\n');
      const commitInfo = sections.slice(0, 3).join('\n'); // Keep commit SHA, date, and message
      const content = sections.slice(3).join('\n');
      
      // Take first 200 chars of each diff content
      const truncatedContent = content.substring(0, 200);
      return `${commitInfo}\n${truncatedContent}${content.length > 200 ? '\n... (truncated)' : ''}`;
    });

    let result = truncatedDiffs.join('\n\n');
    
    if (result.length > MAX_DIFF_LENGTH) {
      const maxDiffs = Math.floor(MAX_DIFF_LENGTH / 400); // Adjusted for commit info
      result = truncatedDiffs.slice(0, maxDiffs).join('\n\n');
      result += `\n\n... (${diffs.length - maxDiffs} more changes)`;
    }

    return result;
  }

  private async generateWithOpenAI(diffText: string): Promise<string> {
    if (!this.openai) {
      throw new Error('OpenAI client not initialized');
    }

    logger.info('Generating changelog with OpenAI');
    const completion = await this.openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "You are a skilled developer writing clear and concise changelogs. Focus on user-facing changes and organize them into Features, Improvements, and Bug Fixes categories."
        },
        {
          role: "user",
          content: `Generate a clear and concise changelog from these git diffs. Focus on the impact and meaning of changes, not the technical details. Also include links to the relavent github pull requests wherever possible:\n\n${diffText}`
        }
      ],
      temperature: 0.7,
    });

    return completion.choices[0].message.content || 'No changelog generated';
  }

  private async generateWithGreptile(diffText: string, repoUrl: string): Promise<string> {
    logger.info('Calling Greptile API');
    const greptileResponse = await fetch("https://api.greptile.com/v2/query", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.GREPTILE_API_KEY}`,
        "X-Github-Token": this.githubToken,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages: [{
          content: `Generate a concise and human-readable changelog using the following diffs: ${diffText}`,
          role: "user"
        }],
        repositories: [{
          remote: "github",
          repository: repoUrl,
          branch: "main"
        }],
        genius: true
      })
    });

    if (!greptileResponse.ok) {
      throw new Error(`Failed to generate changelog: ${greptileResponse.statusText}`);
    }

    const changelogData = await greptileResponse.json();
    return changelogData.message;
  }

  async getRepoDiff(repoUrl: string, startDate: Date, endDate: Date): Promise<DiffSummary> {
    logger.info('Getting repo diff', { 
      repoUrl, 
      startDate: startDate.toISOString(), 
      endDate: endDate.toISOString() 
    });

    const { owner, repo } = this.parseGitHubUrl(repoUrl);

    try {
      const commits = await this.getAllCommits(owner, repo, startDate, endDate);
      
      const summary: DiffSummary = {
        additions: 0,
        deletions: 0,
        netDiff: 0,
        diffs: [],
        totalCommits: commits.length,
        hasMore: commits.length >= MAX_TOTAL_COMMITS,
        period: {
          start: startDate,
          end: endDate
        }
      };

      commits.forEach(commit => {
        summary.additions += commit.stats.additions;
        summary.deletions += commit.stats.deletions;

        commit.files.forEach(file => {
          if (file.patch) {
            const commitDate = new Date(commit.commit.author.date);
            summary.diffs.push(
              `Commit: ${commit.sha.substring(0, 7)} - ${format(commitDate, 'yyyy-MM-dd HH:mm:ss')}\n` +
              `Message: ${commit.commit.message}\n` +
              `File: ${file.filename}\n${file.patch}`
            );
          }
        });
      });

      summary.netDiff = summary.additions - summary.deletions;

      logger.info('Diff summary', {
        totalCommits: summary.totalCommits,
        totalAdditions: summary.additions,
        totalDeletions: summary.deletions,
        netDiff: summary.netDiff,
        hasMore: summary.hasMore
      });

      return summary;

    } catch (error) {
      logger.error('Error in getRepoDiff', {
        error: error instanceof Error ? error.message : 'Unknown error',
        response: axios.isAxiosError(error) ? {
          status: error.response?.status,
          data: error.response?.data
        } : undefined
      });

      if (axios.isAxiosError(error)) {
        if (error.response?.status === 403) {
          throw new Error('GitHub API rate limit exceeded or authentication failed');
        }
        if (error.response?.status === 404) {
          throw new Error('Repository not found or private repository access denied');
        }
      }
      throw error;
    }
  }

  async generateChangelog(repoUrl: string, startDate: Date, endDate: Date): Promise<string> {
    logger.info('Starting changelog generation', {
      repoUrl,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      llmProvider: this.llmProvider
    });

    try {
      const diff = await this.getRepoDiff(repoUrl, startDate, endDate);
      const truncatedDiffText = this.truncateDiffs(diff.diffs);
      
      logger.debug('Processed diff text', {
        originalLength: diff.diffs.join('\n\n').length,
        truncatedLength: truncatedDiffText.length
      });

      // Add warning if there are more commits
      let warningMessage = '';
      if (diff.hasMore) {
        warningMessage = `
⚠️ Note: This changelog only includes the first ${MAX_TOTAL_COMMITS} commits due to GitHub API limitations. 
The actual number of changes during this period may be larger.

`;
      }

      let changelogContent: string;
      switch (this.llmProvider) {
        case 'openai':
          changelogContent = await this.generateWithOpenAI(truncatedDiffText);
          break;

        case 'greptile':
          changelogContent = await this.generateWithGreptile(truncatedDiffText, repoUrl);
          break;

        case 'none':
          changelogContent = `LLM DISABLED - Sample Changelog
          
Changes between ${format(startDate, 'yyyy-MM-dd')} and ${format(endDate, 'yyyy-MM-dd')}:

Total Changes:
- ${diff.additions} additions
- ${diff.deletions} deletions
- Net change: ${diff.netDiff} lines
- Total commits analyzed: ${diff.totalCommits}

Sample of changes:
${truncatedDiffText.substring(0, 1000)}...

Note: This is a preview. Enable an LLM by setting either ENABLE_GREPTILE=true or ENABLE_OPENAI=true in your environment.`;
          break;

        default:
          throw new Error('Invalid LLM provider configuration');
      }

      return warningMessage + changelogContent;

    } catch (error) {
      logger.error('Error in generateChangelog', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      throw error;
    }
  }
}