/**
 * Fuzzy search utilities for better search experience
 * Includes Levenshtein distance and fuzzy matching algorithms
 */

// Calculate Levenshtein distance between two strings
export function levenshteinDistance(str1: string, str2: string): number {
  const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));

  for (let i = 0; i <= str1.length; i++) {
    matrix[0][i] = i;
  }

  for (let j = 0; j <= str2.length; j++) {
    matrix[j][0] = j;
  }

  for (let j = 1; j <= str2.length; j++) {
    for (let i = 1; i <= str1.length; i++) {
      const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1, // deletion
        matrix[j - 1][i] + 1, // insertion
        matrix[j - 1][i - 1] + indicator // substitution
      );
    }
  }

  return matrix[str2.length][str1.length];
}

// Calculate similarity score between two strings (0 to 1)
export function similarity(str1: string, str2: string): number {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;
  
  if (longer.length === 0) {
    return 1.0;
  }
  
  const distance = levenshteinDistance(longer, shorter);
  return (longer.length - distance) / longer.length;
}

// Check if query matches text with fuzzy logic
export function fuzzyMatch(query: string, text: string, threshold = 0.6): boolean {
  if (!query || !text) return false;
  
  const queryLower = query.toLowerCase();
  const textLower = text.toLowerCase();
  
  // Exact match
  if (textLower.includes(queryLower)) {
    return true;
  }
  
  // Check similarity
  return similarity(queryLower, textLower) >= threshold;
}

// Advanced fuzzy search with multiple match strategies
export function fuzzySearch(
  query: string, 
  text: string, 
  options: {
    threshold?: number;
    caseSensitive?: boolean;
    includePartialMatches?: boolean;
  } = {}
): { matches: boolean; score: number; matchType: string } {
  const {
    threshold = 0.6,
    caseSensitive = false,
    includePartialMatches = true
  } = options;

  if (!query || !text) {
    return { matches: false, score: 0, matchType: 'none' };
  }

  const queryProcessed = caseSensitive ? query : query.toLowerCase();
  const textProcessed = caseSensitive ? text : text.toLowerCase();

  // 1. Exact match (highest score)
  if (textProcessed === queryProcessed) {
    return { matches: true, score: 1, matchType: 'exact' };
  }

  // 2. Contains match
  if (textProcessed.includes(queryProcessed)) {
    const score = queryProcessed.length / textProcessed.length;
    return { matches: true, score: Math.min(score + 0.2, 1), matchType: 'contains' };
  }

  // 3. Starts with match
  if (textProcessed.startsWith(queryProcessed)) {
    const score = queryProcessed.length / textProcessed.length;
    return { matches: true, score: Math.min(score + 0.1, 1), matchType: 'startsWith' };
  }

  // 4. Word boundary match
  const words = textProcessed.split(/\s+/);
  for (const word of words) {
    if (word.startsWith(queryProcessed)) {
      return { matches: true, score: 0.8, matchType: 'wordStart' };
    }
  }

  // 5. Partial matches (if enabled)
  if (includePartialMatches) {
    const tokens = queryProcessed.split(/\s+/).filter(token => token.length > 1);
    let matchingTokens = 0;
    
    for (const token of tokens) {
      if (textProcessed.includes(token)) {
        matchingTokens++;
      }
    }
    
    if (matchingTokens > 0) {
      const partialScore = matchingTokens / tokens.length;
      if (partialScore >= 0.5) {
        return { matches: true, score: partialScore * 0.7, matchType: 'partial' };
      }
    }
  }

  // 6. Fuzzy similarity match
  const similarityScore = similarity(queryProcessed, textProcessed);
  if (similarityScore >= threshold) {
    return { matches: true, score: similarityScore * 0.6, matchType: 'fuzzy' };
  }

  return { matches: false, score: similarityScore, matchType: 'none' };
}

// Search through a list of items with fuzzy matching
export function searchItems<T>(
  query: string,
  items: T[],
  searchFields: (keyof T)[] | ((item: T) => string[]),
  options: {
    threshold?: number;
    maxResults?: number;
    sortByRelevance?: boolean;
  } = {}
): Array<T & { _searchScore: number; _matchType: string }> {
  const { threshold = 0.3, maxResults, sortByRelevance = true } = options;

  if (!query.trim()) {
    return items.map(item => ({ ...item, _searchScore: 0, _matchType: 'none' }));
  }

  const results = items
    .map(item => {
      let bestScore = 0;
      let bestMatchType = 'none';

      const searchTexts = typeof searchFields === 'function' 
        ? searchFields(item)
        : searchFields.map(field => String(item[field] || ''));

      for (const text of searchTexts) {
        const result = fuzzySearch(query, text, { threshold });
        if (result.matches && result.score > bestScore) {
          bestScore = result.score;
          bestMatchType = result.matchType;
        }
      }

      return {
        ...item,
        _searchScore: bestScore,
        _matchType: bestMatchType
      };
    })
    .filter(item => item._searchScore > 0);

  // Sort by relevance if requested
  if (sortByRelevance) {
    results.sort((a, b) => {
      // First sort by match type priority
      const matchTypePriority = {
        exact: 6,
        contains: 5,
        startsWith: 4,
        wordStart: 3,
        partial: 2,
        fuzzy: 1,
        none: 0
      };

      const aPriority = matchTypePriority[a._matchType as keyof typeof matchTypePriority] || 0;
      const bPriority = matchTypePriority[b._matchType as keyof typeof matchTypePriority] || 0;

      if (aPriority !== bPriority) {
        return bPriority - aPriority;
      }

      // Then sort by score
      return b._searchScore - a._searchScore;
    });
  }

  // Limit results if maxResults is specified
  return maxResults ? results.slice(0, maxResults) : results;
}

// Highlight matching parts of text
export function highlightMatch(text: string, query: string, className = 'bg-yellow-200 dark:bg-yellow-800'): string {
  if (!query || !text) return text;

  const queryLower = query.toLowerCase();
  const textLower = text.toLowerCase();

  let highlightedText = text;
  let offset = 0;

  // Find all occurrences
  let index = textLower.indexOf(queryLower);
  while (index !== -1) {
    const actualIndex = index + offset;
    const before = highlightedText.slice(0, actualIndex);
    const match = highlightedText.slice(actualIndex, actualIndex + query.length);
    const after = highlightedText.slice(actualIndex + query.length);

    highlightedText = `${before}<span class="${className}">${match}</span>${after}`;
    offset += `<span class="${className}"></span>`.length;

    // Find next occurrence
    index = textLower.indexOf(queryLower, index + 1);
  }

  return highlightedText;
}