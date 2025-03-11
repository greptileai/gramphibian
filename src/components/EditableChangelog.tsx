import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Check, Copy, Edit2, Eye, History } from 'lucide-react';
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
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSave = () => {
    onSave?.(content);
    setIsEditing(false);
  };

  // Add local storage to persist edits
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedContent = localStorage.getItem('changelog-content');
      if (savedContent && !initialContent) {
        setContent(savedContent);
      }
    }
  }, [initialContent]);

  useEffect(() => {
    if (typeof window !== 'undefined' && content) {
      localStorage.setItem('changelog-content', content);
    }
  }, [content]);

  // Simplify the email formatting function
  const formatEmailContent = (text: string) => {
    return {
      subject: "Re: What did you get done this week?",
      body: text.trim() // Just trim the text, don't modify it further
    };
  };

  return (
    <Card className="h-full bg-background">
      <CardHeader className="border-b">
        <CardTitle className="flex justify-between items-center text-base font-medium">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
          </div>
          <div className="flex gap-2">
            {content && (
              <>
                <Button
                  size="sm"
                  variant="ghost"
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
                  variant="ghost"
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
      <CardContent className="p-0">
        {content ? (
          <div>
            {isEditing ? (
              <div className="space-y-4 p-4">
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full h-[400px] p-4 font-mono text-sm bg-background border-0 rounded-none resize-none focus:outline-none focus:ring-0"
                  placeholder="Subject: Weekly Development Changes Update

Dear Team,

I hope this email finds you well. Here is a brief summary of our key accomplishments this week:

We implemented a new login feature to enhance user authentication. The payment system received important bug fixes to improve reliability. Our website performance was optimized, resulting in faster loading speeds.

We also upgraded our database security measures and revamped the user interface for better usability. The mobile app responsiveness has been enhanced to provide a smoother experience across devices.

Additional improvements include updates to our privacy policy, new product category implementations, and streamlined customer support processes. We've also integrated an AI chatbot to assist users more effectively.

Keep up the good work!

Best Regards,
[Your Name]"
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
                <div className="prose prose-sm dark:prose-invert max-w-none p-6 email-content bg-background">
                  {/* Email header section */}
                  <div className="border-b mb-4 pb-4">
                    <div className="mb-2">
                      <span className="text-muted-foreground">To: </span>
                      <span>elon@doge.gov</span>
                    </div>
                    {formatEmailContent(content).subject && (
                      <div>
                        <span className="text-muted-foreground">Subject: </span>
                        <span className="font-medium">{formatEmailContent(content).subject}</span>
                      </div>
                    )}
                  </div>
                  {/* Email body */}
                  <div className="whitespace-pre-wrap">
                    {/* <ReactMarkdown components={{
                      p: ({ children }) => <p className="mb-4">{children}</p>,
                      h1: ({ children }) => <h1 className="text-xl font-bold mb-4">{children}</h1>,
                      h2: ({ children }) => <h2 className="text-lg font-semibold mb-3">{children}</h2>,
                      ul: ({ children }) => <ul className="list-disc pl-4 mb-4">{children}</ul>,
                      li: ({ children }) => <li className="mb-2">{children}</li>
                    }}> */}
                    {content}
                    {/* </ReactMarkdown> */}
                  </div>
                </div>
                {metadata && process.env.NEXT_PUBLIC_SHOULD_PUBLISH === 'true' && (
                  <div className="border-t p-4">
                    <PublishButton 
                      changelog={content} 
                      metadata={metadata}
                    />
                  </div>
                )}
              </>
            )}
          </div>
        ) : (
          <div className="text-center text-muted-foreground py-12 bg-background">
            <History className="h-12 w-12 mx-auto mb-4" />
            <p>What did you get done this week?</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default EditableChangelog;