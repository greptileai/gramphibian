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
}

interface DiffSummary {
  additions: number;
  deletions: number;
  netDiff: number;
  diffs: string[];
}

type LLMProvider = 'none' | 'greptile' | 'openai';

// Assuming average of 4 characters per token for GPT-4
const MAX_TOKENS = 8000; // Leave room for response and system message
const CHARS_PER_TOKEN = 4;
const MAX_DIFF_LENGTH = MAX_TOKENS * CHARS_PER_TOKEN;

export class GitHubDiffGenerator {
  private githubToken: string;
  private apiBaseUrl = 'https://api.github.com';
  private llmProvider: LLMProvider;
  private openai: OpenAI | null = null;

  constructor(githubToken: string) {
    this.githubToken = githubToken;
    // Determine which LLM provider to use
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

  // New method to truncate diffs while preserving meaning
  private truncateDiffs(diffs: string[]): string {
    // Join all diffs with separators
    const fullText = diffs.join('\n\n');
    
    if (fullText.length <= MAX_DIFF_LENGTH) {
      return fullText;
    }

    logger.info('Truncating diff text', {
      originalLength: fullText.length,
      maxLength: MAX_DIFF_LENGTH,
      diffCount: diffs.length
    });

    // Strategy: Keep the first part of each file's diff to preserve context
    const truncatedDiffs = diffs.map(diff => {
        const lines = diff.split('\n');
        const header = lines[0]; // Keep the "File: filename" line
        const content = lines.slice(1).join('\n');
        
        // Take first 200 chars of each diff content
        const truncatedContent = content.substring(0, 200);
        return `${header}\n${truncatedContent}${content.length > 200 ? '\n... (truncated)' : ''}`;
    });

    // Join and check length again
    let result = truncatedDiffs.join('\n\n');
    
    // If still too long, take a subset of the diffs
    if (result.length > MAX_DIFF_LENGTH) {
        const maxDiffs = Math.floor(MAX_DIFF_LENGTH / 300); // Rough estimate of chars per diff
        result = truncatedDiffs.slice(0, maxDiffs).join('\n\n');
        result += `\n\n... (${diffs.length - maxDiffs} more files changed)`;
    }

    logger.info('Truncated diff text', {
        finalLength: result.length,
        includedDiffs: result.split('File:').length - 1
    });

    return result;
  }

  async getRepoDiff(repoUrl: string, startDate: Date, endDate: Date): Promise<DiffSummary> {
    logger.info('Getting repo diff', { 
      repoUrl, 
      startDate: startDate.toISOString(), 
      endDate: endDate.toISOString() 
    });

    const { owner, repo } = this.parseGitHubUrl(repoUrl);
    const commitsUrl = `${this.apiBaseUrl}/repos/${owner}/${repo}/commits`;

    try {
      const response = await axios.get(commitsUrl, {
        ...this.getAxiosConfig(),
        params: {
          since: format(startDate, "yyyy-MM-dd'T'HH:mm:ss'Z'"),
          until: format(endDate, "yyyy-MM-dd'T'HH:mm:ss'Z'"),
        },
      });

      logger.info(`Found ${response.data.length} commits`);

      const commits: CommitData[] = await Promise.all(
        response.data.map((commit: any) => 
          axios.get(commit.url, this.getAxiosConfig())
            .then(res => res.data)
        )
      );

      const summary: DiffSummary = {
        additions: 0,
        deletions: 0,
        netDiff: 0,
        diffs: [],
      };

      commits.forEach(commit => {
        summary.additions += commit.stats.additions;
        summary.deletions += commit.stats.deletions;

        commit.files.forEach(file => {
          if (file.patch) {
            summary.diffs.push(`File: ${file.filename}\n${file.patch}`);
          }
        });
      });

      summary.netDiff = summary.additions - summary.deletions;

      logger.info('Diff summary', {
        totalDiffs: summary.diffs.length,
        totalAdditions: summary.additions,
        totalDeletions: summary.deletions,
        netDiff: summary.netDiff
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
          content: `Generate a clear and concise changelog from these git diffs. Focus on the impact and meaning of changes, not the technical details:\n\n${diffText}`
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

      switch (this.llmProvider) {
        case 'openai':
          return await this.generateWithOpenAI(truncatedDiffText);

        case 'greptile':
          return await this.generateWithGreptile(truncatedDiffText, repoUrl);

        case 'none':
          logger.info('Returning mock changelog (LLM disabled)');
          return `LLM DISABLED - Sample Changelog
          
Changes between ${format(startDate, 'yyyy-MM-dd')} and ${format(endDate, 'yyyy-MM-dd')}:

Total Changes:
- ${diff.additions} additions
- ${diff.deletions} deletions
- Net change: ${diff.netDiff} lines

Sample of changes:
${truncatedDiffText.substring(0, 1000)}...

Note: This is a preview. Enable an LLM by setting either ENABLE_GREPTILE=true or ENABLE_OPENAI=true in your environment.`;

        default:
          throw new Error('Invalid LLM provider configuration');
      }
    } catch (error) {
      logger.error('Error in generateChangelog', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      throw error;
    }
  }
}