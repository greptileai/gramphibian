import axios from 'axios';
import { format } from 'date-fns';
import OpenAI from 'openai';

type LogMetadata = {
  [key: string]: string | number | boolean | null | undefined | Date | LogMetadata;
};

const logger = {
  info: (message: string, meta?: LogMetadata) => {
    console.log(`[INFO] ${message}`, meta || '');
  },
  error: (message: string, meta?: LogMetadata) => {
    console.error(`[ERROR] ${message}`, meta || '');
  },
  debug: (message: string, meta?: LogMetadata) => {
    console.debug(`[DEBUG] ${message}`, meta || '');
  },
  warn: (message: string, meta?: LogMetadata) => {
    console.warn(`[WARN] ${message}`, meta || '');
  }
};

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

interface SubmitMetadata {
  repo: string;
  period: {
    start: string;
    end: string;
  };
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

// type LLMProvider = 'none' | 'greptile' | 'openai';

export class GitHubDiffGenerator {
  private githubToken: string;
  private apiBaseUrl = 'https://api.github.com';
  private openai: OpenAI | null = null;
  private gramaphoneUrl: string;
  private indexedRepos = [
    'facebook/react',
    'microsoft/vscode',
    'rstudio/marimo'
  ];

  constructor(githubToken: string) {
    this.githubToken = githubToken;
    this.gramaphoneUrl = process.env.GRAMAPHONE_URL || 'http://localhost:3000';

    if (process.env.ENABLE_OPENAI === 'true') {
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
      });
    }

    logger.info('GitHubDiffGenerator initialized', { 
      tokenLength: githubToken.length
    });
  }

  private async selectLLMProvider(repoUrl: string): Promise<'openai' | 'greptile'> {
    const { owner, repo } = this.parseGitHubUrl(repoUrl);
    const fullRepoName = `${owner}/${repo}`;
    
    if (this.indexedRepos.includes(fullRepoName) && process.env.ENABLE_GREPTILE === 'true') {
      logger.info('Using Greptile for indexed repository', { repo: fullRepoName });
      return 'greptile';
    }
    
    if (process.env.ENABLE_OPENAI === 'true') {
      logger.info('Using OpenAI for unindexed repository', { repo: fullRepoName });
      return 'openai';
    }

    throw new Error('No LLM provider enabled. Set either ENABLE_GREPTILE=true or ENABLE_OPENAI=true');
  }

  private async submitToGramaphone(changelog: string, metadata: SubmitMetadata): Promise<{ id: string }> {
    const url = `${this.gramaphoneUrl}/api/changelogs`;
    logger.info('Submitting to Gramaphone', {
      url,
      metadataPreview: {
        repo: metadata.repo,
        periodStart: metadata.period.start,
        periodEnd: metadata.period.end
      }
    });
  
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          repoUrl: metadata.repo,
          content: changelog,
          metadata: {
            generatedAt: new Date().toISOString(),
            period: metadata.period
          }
        })
      });
  
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to submit to Gramaphone: ${response.status} ${errorText}`);
      }
  
      return await response.json() as { id: string };
    } catch (error) {
      logger.error('Gramaphone submit error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        url
      });
      throw error;
    }
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
    const parts = repoUrl.replace('https://github.com/', '').split('/');
    return {
      owner: parts[parts.length - 2],
      repo: parts[parts.length - 1].replace('.git', ''),
    };
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
  
      const commitDetails = await Promise.all(
        response.data.map((commit: { url: string }) => 
          axios.get(commit.url, this.getAxiosConfig())
            .then(res => res.data as CommitData)
        )
      );
  
      allCommits = [...allCommits, ...commitDetails];
      const linkHeader = response.headers.link;
      hasMore = linkHeader?.includes('rel="next"') ?? false;
      page++;
  
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

    const truncatedDiffs = diffs.map(diff => {
      const sections = diff.split('\n');
      const commitInfo = sections.slice(0, 3).join('\n');
      const content = sections.slice(3).join('\n');
      const truncatedContent = content.substring(0, 200);
      return `${commitInfo}\n${truncatedContent}${content.length > 200 ? '\n... (truncated)' : ''}`;
    });

    let result = truncatedDiffs.join('\n\n');
    
    if (result.length > MAX_DIFF_LENGTH) {
      const maxDiffs = Math.floor(MAX_DIFF_LENGTH / 400);
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
          content: `Generate a clear and concise changelog from these git diffs. Include links to PRs and contributers where you can. Focus on the impact and meaning of changes, not the technical details:\n\n${diffText}`
        }
      ],
      temperature: 0.7,
    });

    const changelog = completion.choices[0].message.content || 'No changelog generated';
    return `${changelog}\n\n_Generated with: OpenAI GPT-4_`;
  }

  private async generateWithGreptile(diffText: string, repoUrl: string): Promise<string> {
    const { owner, repo } = this.parseGitHubUrl(repoUrl);
  
    logger.info('Calling Greptile API', {
      repo: `${owner}/${repo}`,
      diffLength: diffText.length
    });

    try {
      const greptileResponse = await fetch("https://api.greptile.com/v2/query", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.GREPTILE_API_KEY}`,
          "X-Github-Token": this.githubToken,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: [{
            content: `Generate a clear and concise changelog from these git diffs. Include links to PRs and contributers where you can. Focus on user-facing changes and organize them into Features, Improvements, and Bug Fixes categories. Do not output a numbered list. Bullet points are preferred. Here are the diffs:${diffText}`,
            role: "user"
          }],
          repositories: [{
            remote: "github",
            repository: `${owner}/${repo}`,
            branch: "main"
          }]
        })
      });

      if (!greptileResponse.ok) {
        const errorText = await greptileResponse.text();
        throw new Error(`Greptile API request failed: ${greptileResponse.status} ${errorText}`);
      }

      const data = await greptileResponse.json();
      
      if (!data.message) {
        throw new Error('No changelog content received from Greptile');
      }

      logger.info('Greptile response received', {
        responseLength: data.message.length,
        sourcesCount: data.sources?.length || 0
      });

      return `${data.message}\n\n_Generated with: Greptile_`;

    } catch (error) {
      logger.error('Greptile API error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      throw error;
    }
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
        stack: error instanceof Error ? error.stack : undefined
      });
      throw error;
    }
  }

  async generateChangelog(repoUrl: string, startDate: Date, endDate: Date, shouldPublish: boolean = false): Promise<string> {
    logger.info('Starting changelog generation', {
      repoUrl,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString()
    });

    try {
      const diff = await this.getRepoDiff(repoUrl, startDate, endDate);
      const truncatedDiffText = this.truncateDiffs(diff.diffs);
      
      logger.debug('Processed diff text', {
        originalLength: diff.diffs.join('\n\n').length,
        truncatedLength: truncatedDiffText.length
      });

      let warningMessage = '';
      if (diff.hasMore) {
        warningMessage = `
⚠️ Note: This changelog only includes the first ${MAX_TOTAL_COMMITS} commits due to GitHub API limitations. 
The actual number of changes during this period may be larger.

`;
      }

      // Determine which LLM to use and generate changelog
      const selectedProvider = await this.selectLLMProvider(repoUrl);
      let changelogContent: string;
      
      switch (selectedProvider) {
        case 'openai':
          changelogContent = await this.generateWithOpenAI(truncatedDiffText);
          break;

        case 'greptile':
          changelogContent = await this.generateWithGreptile(truncatedDiffText, repoUrl);
          break;

        default:
          throw new Error('No LLM provider configured');
      }

      const finalChangelog = warningMessage + changelogContent;

      // Submit to Gramaphone if requested
      if (shouldPublish) {
        try {
          await this.submitToGramaphone(finalChangelog, {
            repo: repoUrl,
            period: {
              start: startDate.toISOString(),
              end: endDate.toISOString()
            }
          });
        } catch (error) {
          logger.warn('Failed to submit to Gramaphone', {
            error: error instanceof Error ? error.message : 'Unknown error'
          });
          // Don't throw the error, just log it - we still want to return the changelog
        }
      }

      return finalChangelog;

    } catch (error) {
      logger.error('Error in generateChangelog', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      throw error;
    }
  }
}