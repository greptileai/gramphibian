"use client";

import React, { useState, useEffect } from 'react';
import { 
  AlertCircle, 
  GitBranch,
  Calendar, 
  Loader2, 
  Moon,
  Sun
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from "@/components/ui/button";
import { useTheme } from "next-themes";
import EditableChangelog from '@/components/EditableChangelog';
import RepoSuggestions from './RepoSuggestions';

// Client-side only theme toggle
const ThemeToggle = () => {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // When mounted on client, now we can show the UI
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return <Button variant="ghost" size="icon" disabled><div className="h-5 w-5" /></Button>;
  }

  return (
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
  );
};


// Type for the form data
interface FormData {
  repoUrl: string;
  startDate: string;
  endDate: string;
}

const ChangelogGenerator = () => {
  // Theme is handled by ThemeToggle component
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [changelog, setChangelog] = useState('');
  const [recentRepos, setRecentRepos] = useState<string[]>([]);
  const [formData, setFormData] = useState<FormData>({
    repoUrl: '',
    startDate: '',
    endDate: ''
  });

  // Load saved data on component mount
  useEffect(() => {
    // Only run on client-side
    if (typeof window !== 'undefined') {
      const savedFormData = localStorage.getItem('changelog-form-data');
      const savedRecentRepos = localStorage.getItem('changelog-recent-repos');
      
      if (savedFormData) {
        setFormData(JSON.parse(savedFormData));
      }
      
      if (savedRecentRepos) {
        setRecentRepos(JSON.parse(savedRecentRepos));
      }
    }
  }, []);

  // Save form data and recent repos when they change
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('changelog-form-data', JSON.stringify(formData));
    }
  }, [formData]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('changelog-recent-repos', JSON.stringify(recentRepos));
    }
  }, [recentRepos]);

  // Generate a unique key for caching based on form data
  const getCacheKey = (data: FormData) => {
    return `changelog-${data.repoUrl}-${data.startDate}-${data.endDate}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    // Clear previous changelog when starting new request
    setChangelog('');

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
      
      // Cache the result
      if (typeof window !== 'undefined') {
        const cacheKey = getCacheKey(formData);
        localStorage.setItem(cacheKey, data.changelog);
      }
      
      setChangelog(data.changelog);
      
      if (!recentRepos.includes(formData.repoUrl)) {
        const updatedRepos = [formData.repoUrl, ...recentRepos].slice(0, 5);
        setRecentRepos(updatedRepos);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Clear all saved data
  const handleClearData = () => {
    setFormData({
      repoUrl: '',
      startDate: '',
      endDate: ''
    });
    setChangelog('');
    setRecentRepos([]);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('changelog-form-data');
      localStorage.removeItem('changelog-recent-repos');
      // Clear all changelog caches
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('changelog-')) {
          localStorage.removeItem(key);
        }
      }
    }
  };

//   const handleCopy = async () => {
//     await navigator.clipboard.writeText(changelog);
//     setCopied(true);
//     setTimeout(() => setCopied(false), 2000);
//   };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-4 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-bold">What did you get done this week?</h1>
            </div>
            <div className="flex items-center space-x-4">
              <ThemeToggle />
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
                    
                    {/* Repository Suggestions */}
                    <RepoSuggestions
                      recentRepos={recentRepos}
                      onSelect={(repo) => setFormData(prev => ({ ...prev, repoUrl: repo }))}
                    />
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
            <EditableChangelog 
                initialContent={changelog}
                onSave={(newContent) => setChangelog(newContent)}
                metadata={{
                repo: formData.repoUrl,
                period: {
                    start: formData.startDate,
                    end: formData.endDate
                }
                }}
            />
            </div>
        </div>
      </main>
    </div>
  );
};

export default ChangelogGenerator;