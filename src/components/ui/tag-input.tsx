'use client';

import { useState, useRef, KeyboardEvent } from 'react';
import { X, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface TagInputProps {
  tags: string[];
  onTagsChange: (tags: string[]) => void;
  suggestions?: string[];
  placeholder?: string;
  className?: string;
  maxTags?: number;
}

export function TagInput({
  tags,
  onTagsChange,
  suggestions = [],
  placeholder = 'Add tag...',
  className,
  maxTags = 20,
}: TagInputProps) {
  const [inputValue, setInputValue] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const addTag = (tag: string) => {
    const trimmedTag = tag.trim().toLowerCase();
    if (trimmedTag && !tags.includes(trimmedTag) && tags.length < maxTags) {
      onTagsChange([...tags, trimmedTag]);
      setInputValue('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    onTagsChange(tags.filter(tag => tag !== tagToRemove));
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(inputValue);
    } else if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
      removeTag(tags[tags.length - 1]);
    }
  };

  const filteredSuggestions = suggestions.filter(
    s => s.toLowerCase().includes(inputValue.toLowerCase()) && !tags.includes(s.toLowerCase())
  ).slice(0, 5);

  return (
    <div className={cn('space-y-2', className)}>
      {/* Existing tags */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {tags.map(tag => (
            <Badge
              key={tag}
              variant="secondary"
              className="pl-2 pr-1 py-0.5 text-xs gap-1"
            >
              {tag}
              <button
                onClick={() => removeTag(tag)}
                className="hover:bg-muted-foreground/20 rounded-full p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="relative">
        <div className="flex gap-2">
          <Input
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            placeholder={tags.length >= maxTags ? 'Max tags reached' : placeholder}
            disabled={tags.length >= maxTags}
            className="flex-1 h-8 text-sm"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => addTag(inputValue)}
            disabled={!inputValue.trim() || tags.length >= maxTags}
            className="h-8"
          >
            <Plus className="h-3 w-3" />
          </Button>
        </div>

        {/* Suggestions dropdown */}
        {showSuggestions && filteredSuggestions.length > 0 && (
          <div className="absolute z-10 w-full mt-1 bg-popover border rounded-md shadow-md">
            {filteredSuggestions.map(suggestion => (
              <button
                key={suggestion}
                onClick={() => addTag(suggestion)}
                className="w-full px-3 py-1.5 text-sm text-left hover:bg-muted transition-colors"
              >
                {suggestion}
              </button>
            ))}
          </div>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        Press Enter or comma to add • {tags.length}/{maxTags} tags
      </p>
    </div>
  );
}
