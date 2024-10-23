import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Check, Copy, Edit2, Eye, History } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import PublishButton from './PublishButton';

interface EditableChangelogProps {
  initialContent?: string;
  onSave?: (content: string) => void;
  metadata?: {
    repo: string;
    period: {
      start: string;
      end: string;
    }
  };
}

const EditableChangelog = ({ initialContent = '', onSave, metadata }: EditableChangelogProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [content, setContent] = useState(initialContent);
  const [copied, setCopied] = useState(false);

  // Add effect to update content when initialContent changes
  useEffect(() => {
    setContent(initialContent);
  }, [initialContent]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = () => {
    onSave?.(content);
    setIsEditing(false);
  };

  // Add local storage to persist edits
  useEffect(() => {
    const savedContent = localStorage.getItem('changelog-content');
    if (savedContent && !initialContent) {
      setContent(savedContent);
    }
  }, []);

  useEffect(() => {
    if (content) {
      localStorage.setItem('changelog-content', content);
    }
  }, [content]);

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          Generated Changelog
          <div className="flex gap-2">
            {content && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsEditing(!isEditing)}
                >
                  {isEditing ? (
                    <>
                      <Eye className="h-4 w-4 mr-2" />
                      Preview
                    </>
                  ) : (
                    <>
                      <Edit2 className="h-4 w-4 mr-2" />
                      Edit
                    </>
                  )}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCopy}
                >
                  {copied ? (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4 mr-2" />
                      Copy
                    </>
                  )}
                </Button>
              </>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {content ? (
          <div className="space-y-4">
            {isEditing ? (
              <div className="space-y-4">
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full h-[400px] p-4 font-mono text-sm bg-background border rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <div className="flex justify-end gap-2">
                  <Button 
                    variant="outline" 
                    onClick={() => setIsEditing(false)}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleSave}>Save Changes</Button>
                </div>
              </div>
            ) : (
              <>
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <ReactMarkdown>{content}</ReactMarkdown>
                </div>
                {metadata && (
                  <PublishButton 
                    changelog={content} 
                    metadata={metadata}
                  />
                )}
              </>
            )}
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
  );
};

export default EditableChangelog;