import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Upload, Check, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface PublishButtonProps {
  changelog: string;
  metadata: {
    repo: string;
    period: {
      start: string;
      end: string;
    }
  };
}

export default function PublishButton({ changelog, metadata }: PublishButtonProps) {
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishStatus, setPublishStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const publishToGramaphone = async () => {
    setIsPublishing(true);
    setPublishStatus('idle');
    setErrorMessage('');

    try {
      console.log('Publishing to:', process.env.NEXT_PUBLIC_GRAMAPHONE_URL);
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_GRAMAPHONE_URL}/api/changelogs`, {
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
        throw new Error(`Failed to publish to Gramaphone: ${errorText}`);
      }

      setPublishStatus('success');
      setTimeout(() => setPublishStatus('idle'), 3000);
    } catch (error) {
      console.error('Publishing error:', error);
      setPublishStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'Failed to publish changelog');
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className="space-y-2">
      <Button
        onClick={publishToGramaphone}
        disabled={isPublishing || !changelog || !process.env.NEXT_PUBLIC_GRAMAPHONE_URL}
        variant={publishStatus === 'success' ? "outline" : "default"}
        className="w-full"
      >
        {isPublishing ? (
          <>
            <Upload className="mr-2 h-4 w-4 animate-spin" />
            Publishing...
          </>
        ) : publishStatus === 'success' ? (
          <>
            <Check className="mr-2 h-4 w-4" />
            Published!
          </>
        ) : (
          <>
            <Upload className="mr-2 h-4 w-4" />
            Publish to Gramaphone
          </>
        )}
      </Button>

      {publishStatus === 'error' && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}