// components/RepoSuggestions.tsx
import React from 'react';

const DEFAULT_REPOS = [
  'https://github.com/marimo-team/marimo',
  'https://github.com/microsoft/vscode',
  'https://github.com/facebook/react'
];

interface RepoSuggestionsProps {
  recentRepos: string[];
  onSelect: (repo: string) => void;
}

const RepoSuggestions = ({ recentRepos, onSelect }: RepoSuggestionsProps) => {  
  return (
    <div className="mt-2 space-y-2">
      {recentRepos.length > 0 && (
        <div>
          <label className="block text-sm text-muted-foreground mb-1">Recent:</label>
          <div className="flex flex-wrap gap-2">
            {recentRepos.map(repo => (
              <button
                key={repo}
                type="button"
                className="text-xs bg-muted hover:bg-muted/80 rounded px-2 py-1"
                onClick={() => onSelect(repo)}
              >
                {repo.split('/').slice(-2).join('/')}
              </button>
            ))}
          </div>
        </div>
      )}
      
      <div>
        <label className="block text-sm text-muted-foreground mb-1">Popular repositories:</label>
        <div className="flex flex-wrap gap-2">
          {DEFAULT_REPOS.map(repo => (
            <button
              key={repo}
              type="button"
              className="text-xs bg-muted hover:bg-muted/80 rounded px-2 py-1"
              onClick={() => onSelect(repo)}
            >
              {repo.split('/').slice(-2).join('/')}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default RepoSuggestions;