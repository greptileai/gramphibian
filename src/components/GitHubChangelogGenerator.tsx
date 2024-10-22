"use client";

import React, { useState } from 'react';
import { 
  AlertCircle, 
  GitBranch, 
  Calendar, 
  History, 
  Loader2, 
  Copy, 
  Check,
  Moon,
  Sun
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from "@/components/ui/button";
import { useTheme } from "next-themes";
import ReactMarkdown from 'react-markdown';

const GramphibianLogo = () => (
  <svg width="40" height="40" viewBox="0 0 120 120" className="inline-block">
    <circle cx="60" cy="60" r="50" className="fill-primary" />
    <circle cx="40" cy="45" r="15" fill="white" />
    <circle cx="80" cy="45" r="15" fill="white" />
    <circle cx="40" cy="45" r="8" className="fill-background" />
    <circle cx="80" cy="45" r="8" className="fill-background" />
    <path d="M40 70 Q60 85 80 70" stroke="white" strokeWidth="4" fill="none" />
    <circle cx="30" cy="80" r="4" className="fill-primary-foreground" />
    <circle cx="90" cy="80" r="4" className="fill-primary-foreground" />
    <circle cx="60" cy="85" r="4" className="fill-primary-foreground" />
  </svg>
);

const ChangelogGenerator = () => {
  const { theme, setTheme } = useTheme();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [changelog, setChangelog] = useState('');
  const [recentRepos, setRecentRepos] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);
  const [formData, setFormData] = useState({
    repoUrl: '',
    startDate: '',
    endDate: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/generate-changelog', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          repoUrl: formData.repoUrl,
          startDate: new Date(formData.startDate).toISOString(),
          endDate: new Date(formData.endDate).toISOString(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to generate changelog');
      }

      const data = await response.json();
      setChangelog(data.changelog);
      
      if (!recentRepos.includes(formData.repoUrl)) {
        setRecentRepos(prev => [formData.repoUrl, ...prev].slice(0, 5));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(changelog);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-4 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <GramphibianLogo />
              <h1 className="text-2xl font-bold">Gramphibian</h1>
            </div>
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              >
                {theme === 'dark' ? (
                  <Sun className="h-5 w-5" />
                ) : (
                  <Moon className="h-5 w-5" />
                )}
              </Button>
              <a
                href="https://github.com/AbhinavHampiholi/gramphibian"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground"
              >
                <GitBranch className="h-6 w-6" />
              </a>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Input Section */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle>Generate Changelog</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Repository Input */}
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      GitHub Repository URL
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        name="repoUrl"
                        className="w-full p-2 border rounded-md pl-8 bg-background"
                        placeholder="https://github.com/owner/repo"
                        value={formData.repoUrl}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          repoUrl: e.target.value
                        }))}
                        required
                      />
                      <GitBranch className="h-4 w-4 absolute left-2 top-3 text-muted-foreground" />
                    </div>
                    
                    {/* Recent Repos */}
                    {recentRepos.length > 0 && (
                      <div className="mt-2">
                        <label className="block text-sm text-muted-foreground mb-1">Recent:</label>
                        <div className="flex flex-wrap gap-2">
                          {recentRepos.map(repo => (
                            <button
                              key={repo}
                              type="button"
                              className="text-xs bg-muted hover:bg-muted/80 rounded px-2 py-1"
                              onClick={() => setFormData(prev => ({ ...prev, repoUrl: repo }))}
                            >
                              {repo.split('/').slice(-2).join('/')}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Date Range */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Start Date
                      </label>
                      <div className="relative">
                        <input
                          type="date"
                          name="startDate"
                          className="w-full p-2 border rounded-md pl-8 bg-background"
                          value={formData.startDate}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            startDate: e.target.value
                          }))}
                          required
                        />
                        <Calendar className="h-4 w-4 absolute left-2 top-3 text-muted-foreground" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        End Date
                      </label>
                      <div className="relative">
                        <input
                          type="date"
                          name="endDate"
                          className="w-full p-2 border rounded-md pl-8 bg-background"
                          value={formData.endDate}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            endDate: e.target.value
                          }))}
                          required
                        />
                        <Calendar className="h-4 w-4 absolute left-2 top-3 text-muted-foreground" />
                      </div>
                    </div>
                  </div>

                  {/* Quick Date Ranges */}
                  <div className="flex flex-wrap gap-2">
                    {['Last 7 days', 'Last 14 days', 'Last 30 days'].map(range => (
                      <button
                        key={range}
                        type="button"
                        className="text-xs bg-muted hover:bg-muted/80 rounded px-2 py-1"
                        onClick={() => {
                          const end = new Date();
                          const start = new Date();
                          start.setDate(end.getDate() - parseInt(range.split(' ')[1]));
                          setFormData(prev => ({
                            ...prev,
                            startDate: start.toISOString().split('T')[0],
                            endDate: end.toISOString().split('T')[0]
                          }));
                        }}
                      >
                        {range}
                      </button>
                    ))}
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      'Generate Changelog'
                    )}
                  </Button>
                </form>

                {error && (
                  <Alert variant="destructive" className="mt-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Output Section */}
          <div>
            <Card className="h-full">
              <CardHeader>
                <CardTitle className="flex justify-between items-center">
                  Generated Changelog
                  {changelog && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleCopy}
                      className="space-x-2"
                    >
                      {copied ? (
                        <>
                          <Check className="h-4 w-4" />
                          <span>Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-4 w-4" />
                          <span>Copy Markdown</span>
                        </>
                      )}
                    </Button>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {changelog ? (
                  <div className="space-y-4">
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      <ReactMarkdown>{changelog}</ReactMarkdown>
                    </div>
                    <div className="border-t pt-4">
                      <details>
                        <summary className="text-sm text-muted-foreground cursor-pointer">
                          View Raw Markdown
                        </summary>
                        <pre className="mt-2 whitespace-pre-wrap text-sm bg-muted p-4 rounded-lg overflow-auto max-h-[200px]">
                          {changelog}
                        </pre>
                      </details>
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground py-12">
                    <History className="h-12 w-12 mx-auto mb-4" />
                    <p>Your generated changelog will appear here</p>
                    <p className="text-sm mt-2">Generated in Markdown format</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ChangelogGenerator;