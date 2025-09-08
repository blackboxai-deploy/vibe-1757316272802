import React, { useState, useRef, useEffect } from 'react';
import { SearchIcon } from '../../constants.tsx';
import { useDebounce } from '../../hooks/useDebounce.ts';
import Spinner from './Spinner.tsx';

interface SearchSuggestion {
  id: string;
  label: string;
  category?: string;
  metadata?: Record<string, unknown>;
}

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  onSearch?: (value: string) => void;
  placeholder?: string;
  suggestions?: SearchSuggestion[];
  onSuggestionSelect?: (suggestion: SearchSuggestion) => void;
  isLoading?: boolean;
  debounceMs?: number;
  showSuggestions?: boolean;
  maxSuggestions?: number;
  clearOnSelect?: boolean;
  className?: string;
  inputClassName?: string;
  suggestionsClassName?: string;
  disabled?: boolean;
  autoFocus?: boolean;
  icon?: React.ReactNode;
}

const SearchInput: React.FC<SearchInputProps> = ({
  value,
  onChange,
  onSearch,
  placeholder = 'Search...',
  suggestions = [],
  onSuggestionSelect,
  isLoading = false,
  debounceMs = 300,
  showSuggestions = true,
  maxSuggestions = 10,
  clearOnSelect = false,
  className = '',
  inputClassName = '',
  suggestionsClassName = '',
  disabled = false,
  autoFocus = false,
  icon
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [isFocused, setIsFocused] = useState(false);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  
  const debouncedValue = useDebounce(value, debounceMs);
  
  // Trigger search when debounced value changes
  useEffect(() => {
    if (onSearch && debouncedValue !== value) {
      onSearch(debouncedValue);
    }
  }, [debouncedValue, onSearch, value]);

  // Filter and limit suggestions
  const filteredSuggestions: SearchSuggestion[] = showSuggestions 
    ? suggestions.slice(0, maxSuggestions)
    : [];

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
    setIsOpen(true);
    setHighlightedIndex(-1);
  };

  // Handle suggestion selection
  const handleSuggestionSelect = (suggestion: SearchSuggestion) => {
    if (onSuggestionSelect) {
      onSuggestionSelect(suggestion);
    }
    
    if (clearOnSelect) {
      onChange('');
    } else {
      onChange(suggestion.label);
    }
    
    setIsOpen(false);
    setHighlightedIndex(-1);
    inputRef.current?.blur();
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || filteredSuggestions.length === 0) {
      if (e.key === 'Enter' && onSearch) {
        onSearch(value);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev < filteredSuggestions.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev > 0 ? prev - 1 : filteredSuggestions.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < filteredSuggestions.length) {
          handleSuggestionSelect(filteredSuggestions[highlightedIndex]);
        } else if (onSearch) {
          onSearch(value);
          setIsOpen(false);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setHighlightedIndex(-1);
        inputRef.current?.blur();
        break;
      case 'Tab':
        setIsOpen(false);
        break;
    }
  };

  // Handle input focus/blur
  const handleFocus = () => {
    setIsFocused(true);
    if (filteredSuggestions.length > 0) {
      setIsOpen(true);
    }
  };

  const handleBlur = () => {
    setIsFocused(false);
    // Delay closing to allow for suggestion clicks
    setTimeout(() => {
      if (!suggestionsRef.current?.contains(document.activeElement)) {
        setIsOpen(false);
        setHighlightedIndex(-1);
      }
    }, 150);
  };

  // Clear search
  const handleClear = () => {
    onChange('');
    setIsOpen(false);
    setHighlightedIndex(-1);
    inputRef.current?.focus();
  };

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        inputRef.current && 
        !inputRef.current.contains(event.target as Node) &&
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setHighlightedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const showClearButton = value.length > 0 && !disabled;
  const showSuggestionsDropdown = isOpen && filteredSuggestions.length > 0 && isFocused;

  return (
    <div className={`relative ${className}`}>
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          {isLoading ? (
            <Spinner className="h-4 w-4 text-brand-text-secondary-light dark:text-brand-text-secondary" />
          ) : (
            icon || <SearchIcon className="h-4 w-4 text-brand-text-secondary-light dark:text-brand-text-secondary" />
          )}
        </div>
        
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          disabled={disabled}
          autoFocus={autoFocus}
          className={`
            block w-full pl-10 pr-10 py-2 
            border border-neutral-300 dark:border-neutral-600 
            rounded-lg
            bg-white dark:bg-neutral-800 
            text-brand-text-light dark:text-brand-text
            placeholder-brand-text-secondary-light dark:placeholder-brand-text-secondary
            focus:ring-2 focus:ring-brand-green dark:focus:ring-brand-dark-green 
            focus:border-brand-green dark:focus:border-brand-dark-green
            disabled:opacity-50 disabled:cursor-not-allowed
            transition-colors duration-200
            ${inputClassName}
          `}
          aria-expanded={showSuggestionsDropdown}
          aria-haspopup="listbox"
          aria-autocomplete="list"
          role="combobox"
        />

        {showClearButton && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute inset-y-0 right-0 pr-3 flex items-center hover:text-brand-red dark:hover:text-red-400 transition-colors"
            aria-label="Clear search"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Suggestions Dropdown */}
      {showSuggestionsDropdown && (
        <div 
          ref={suggestionsRef}
          className={`
            absolute z-50 w-full mt-1 
            bg-white dark:bg-neutral-800 
            border border-neutral-200 dark:border-neutral-700 
            rounded-lg shadow-lg
            max-h-60 overflow-auto
            ${suggestionsClassName}
          `}
          role="listbox"
        >
          {filteredSuggestions.map((suggestion, index) => (
            <button
              key={suggestion.id}
              type="button"
              onClick={() => handleSuggestionSelect(suggestion)}
              className={`
                w-full px-4 py-3 text-left 
                hover:bg-neutral-100 dark:hover:bg-neutral-700
                focus:bg-neutral-100 dark:focus:bg-neutral-700
                focus:outline-none
                transition-colors duration-150
                ${index === highlightedIndex ? 'bg-neutral-100 dark:bg-neutral-700' : ''}
                ${index === 0 ? 'rounded-t-lg' : ''}
                ${index === filteredSuggestions.length - 1 ? 'rounded-b-lg' : ''}
              `}
              role="option"
              aria-selected={index === highlightedIndex}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="text-sm font-medium text-brand-text-light dark:text-brand-text">
                    {suggestion.label}
                  </div>
                  {suggestion.category && (
                    <div className="text-xs text-brand-text-secondary-light dark:text-brand-text-secondary mt-1">
                      {suggestion.category}
                    </div>
                  )}
                </div>
                <SearchIcon className="h-3 w-3 text-brand-text-secondary-light dark:text-brand-text-secondary ml-2" />
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default SearchInput;